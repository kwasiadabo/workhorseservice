const { Op } = require('sequelize');
const { scheduleBookingNotifications } = require('./notifications.service');
const {
  sequelize,
  Booking,
  BookingService,
  BookingAssignment,
  Branch,
  Customer,
  Service,
  ServiceVehiclePrice,
  Employee,
  Payment,
  User,
  Tenant,
  VehicleType,
  Vehicle,
  Team,
} = require('../models');

const resolveServicePrice = (service, vehicleTypeId) => {
  if (vehicleTypeId && service.vehiclePrices?.length) {
    const vp = service.vehiclePrices.find((p) => p.vehicleTypeId === vehicleTypeId);
    if (vp !== undefined) return Number(vp.price);
  }
  return Number(service.price);
};
const ApiError = require('../utils/ApiError');
const { withTenantScope, assertTenantOwnership } = require('../utils/tenantScope');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

// Statuses that close out a booking — once reached, the booking no longer
// has an outstanding balance (see getBookingPaymentSummary on the frontend).
const TERMINAL_BOOKING_STATUSES = ['completed', 'cancelled', 'no_show'];

const DETAIL_INCLUDES = [
  {
    model: BookingService,
    as: 'bookingServices',
    include: [{ model: Service, attributes: ['id', 'name', 'durationMinutes', 'price', 'currency'] }],
  },
  {
    model: BookingAssignment,
    as: 'assignments',
    include: [{ model: Employee, attributes: ['id', 'firstName', 'lastName'] }],
  },
  { model: Payment, include: [{ model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName'] }] },
  { model: Customer, attributes: ['id', 'name', 'phone', 'email'] },
  { model: Branch, attributes: ['id', 'name', 'address', 'city', 'phone', 'email'] },
  { model: Tenant, attributes: ['id', 'name', 'email', 'phone', 'address', 'logoUrl'] },
  { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
  { model: VehicleType, attributes: ['id', 'name'] },
  { model: Vehicle, attributes: ['id', 'registration', 'make', 'model'] },
];

const verifyBranch = async (tenantId, branchId) => assertTenantOwnership(await Branch.findByPk(branchId), tenantId);
const verifyCustomer = async (tenantId, customerId) =>
  assertTenantOwnership(await Customer.findByPk(customerId), tenantId);

const generateBookingNumber = async (tenantId, transaction) => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `BK-${datePart}-`;
  const count = await Booking.count({
    where: { tenantId, bookingNumber: { [Op.like]: `${prefix}%` } },
    paranoid: false,
    transaction,
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

// Fetches a tenant-owned booking without the heavy detail includes — used
// internally before mutating the record.
const getRawById = async (tenantId, id) => assertTenantOwnership(await Booking.findByPk(id), tenantId);

// Stamps startedAt/completedAt when a booking's status moves into
// "in_progress" (work begins) or "awaiting_payment"/"completed" (work is
// done) for the first time, backfilling startedAt from scheduledAt if work
// finished without ever passing through "in_progress". durationMinutes is
// recomputed from startedAt/completedAt whenever both are known.
const computeStatusStamps = (booking, data) => {
  const stamps = {};
  const now = new Date();

  if (data.status === 'in_progress' && !booking.startedAt && !data.startedAt) {
    stamps.startedAt = now;
  }
  if (data.status === 'awaiting_payment' || data.status === 'completed') {
    if (!booking.startedAt && !data.startedAt && !stamps.startedAt) stamps.startedAt = booking.scheduledAt;
    if (!booking.completedAt && !data.completedAt) stamps.completedAt = now;
  }

  const startedAt = data.startedAt ?? stamps.startedAt ?? booking.startedAt;
  const completedAt = data.completedAt ?? stamps.completedAt ?? booking.completedAt;
  if (startedAt && completedAt) {
    stamps.durationMinutes = Math.round((new Date(completedAt) - new Date(startedAt)) / 60000);
  }

  return stamps;
};

// Advances a booking's status based on its assignments: the first assignment
// to start moves it to "in_progress"; once every assignment is settled
// (completed or cancelled, with at least one completed) it moves to
// "awaiting_payment". Never downgrades a booking that's already past
// "in_progress" — reopening is a manual fix via the status dropdown.
const syncBookingStatusFromAssignments = async (booking, transaction) => {
  const assignments = await BookingAssignment.findAll({ where: { bookingId: booking.id }, transaction });
  if (assignments.length === 0) return;

  const allSettled = assignments.every((a) => ['completed', 'cancelled'].includes(a.status));
  const anyCompleted = assignments.some((a) => a.status === 'completed');
  const anyStarted = assignments.some((a) => ['in_progress', 'completed'].includes(a.status));

  let nextStatus;
  if (allSettled && anyCompleted) nextStatus = 'awaiting_payment';
  else if (anyStarted) nextStatus = 'in_progress';

  if (!nextStatus || nextStatus === booking.status || !['confirmed', 'in_progress'].includes(booking.status)) return;

  const data = { status: nextStatus };
  Object.assign(data, computeStatusStamps(booking, data));
  await booking.update(data, { transaction });
};

// Statuses that still represent "active" work on a booking — used to find a
// candidate replacement team lead when the current lead's assignment is
// cancelled or removed.
const ACTIVE_ASSIGNMENT_STATUSES = ['waiting', 'in_progress', 'completed'];

// Demotes any current lead (if different from `assignmentId`) and promotes
// `assignmentId` to team lead. Demote-then-promote ordering matters: the
// filtered unique index on BookingAssignments allows at most one row with
// isTeamLead = 1 per booking at any time.
const promoteTeamLead = async (bookingId, assignmentId, transaction) => {
  await BookingAssignment.update(
    { isTeamLead: false },
    { where: { bookingId, isTeamLead: true, id: { [Op.ne]: assignmentId } }, transaction }
  );
  await BookingAssignment.update({ isTeamLead: true }, { where: { id: assignmentId }, transaction });
};

// If the booking currently has no team lead, promote the earliest still-active
// assignment so leadership is never left vacant while work is ongoing.
const reassignLeadIfVacant = async (bookingId, transaction) => {
  const existingLead = await BookingAssignment.findOne({ where: { bookingId, isTeamLead: true }, transaction });
  if (existingLead) return;

  const candidate = await BookingAssignment.findOne({
    where: { bookingId, status: { [Op.in]: ACTIVE_ASSIGNMENT_STATUSES } },
    order: [['assignedAt', 'ASC']],
    transaction,
  });
  if (candidate) await promoteTeamLead(bookingId, candidate.id, transaction);
};

const getById = async (tenantId, id) => {
  const booking = await Booking.findByPk(id, { include: DETAIL_INCLUDES });
  return assertTenantOwnership(booking, tenantId);
};

const findEmployeeForUser = (tenantId, userId) => Employee.findOne({ where: { tenantId, userId } });

const list = async (tenantId, user, query = {}) => {
  const { page, limit, offset, order } = parsePagination(query);
  const where = withTenantScope(tenantId, {});

  if (query.status) where.status = query.status;
  else if (query.unpaidOnly) where.status = { [Op.notIn]: TERMINAL_BOOKING_STATUSES };
  if (query.branchId) where.branchId = query.branchId;
  if (query.scheduledFrom) where.scheduledAt = { ...where.scheduledAt, [Op.gte]: query.scheduledFrom };
  if (query.scheduledTo) {
    const exclusiveEnd = new Date(query.scheduledTo);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    where.scheduledAt = { ...where.scheduledAt, [Op.lt]: exclusiveEnd };
  }
  if (query.search) {
    const like = { [Op.like]: `%${query.search}%` };
    const matchingCustomers = await Customer.findAll({
      where: withTenantScope(tenantId, { name: like }),
      attributes: ['id'],
    });
    const customerIds = matchingCustomers.map((c) => c.id);
    where[Op.or] = [
      { bookingNumber: like },
      ...(customerIds.length ? [{ customerId: { [Op.in]: customerIds } }] : []),
    ];
  }

  let include = DETAIL_INCLUDES;

  if (!user.permissions.includes('bookings.view')) {
    const employee = await findEmployeeForUser(tenantId, user.id);
    if (!employee) {
      return { items: [], meta: buildPaginationMeta({ page, limit, count: 0 }) };
    }

    include = DETAIL_INCLUDES.map((inc) =>
      inc.as === 'assignments' ? { ...inc, where: { employeeId: employee.id }, required: true } : inc
    );
  } else if (query.employeeId) {
    include = DETAIL_INCLUDES.map((inc) =>
      inc.as === 'assignments' ? { ...inc, where: { employeeId: query.employeeId }, required: true } : inc
    );
  }

  const { rows, count } = await Booking.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: order || [['scheduledAt', 'DESC']],
    distinct: true,
  });

  return { items: rows, meta: buildPaginationMeta({ page, limit, count }) };
};

const getByIdForUser = async (tenantId, user, id) => {
  const booking = await getById(tenantId, id);

  if (!user.permissions.includes('bookings.view')) {
    const employee = await findEmployeeForUser(tenantId, user.id);
    const hasAssignment = employee && booking.assignments.some((a) => a.employeeId === employee.id);
    if (!hasAssignment) {
      throw ApiError.notFound('Resource not found');
    }
  }

  return booking;
};

// Resolves the vehicle-related fields to snapshot onto the Booking. If a
// `vehicleId` is given (the staff-facing create form's flow), it takes
// precedence and its details are looked up; otherwise falls back to whatever
// raw vehicle fields were passed directly (e.g. the public booking portal,
// which only ever sends `vehicleTypeId` for pricing).
const resolveVehicleSnapshot = async (tenantId, data) => {
  if (!data.vehicleId) {
    return {
      vehicleId: null,
      vehicleTypeId: data.vehicleTypeId ?? null,
      vehicleRegistration: data.vehicleRegistration ?? null,
      vehicleMake: data.vehicleMake ?? null,
      vehicleModel: data.vehicleModel ?? null,
    };
  }

  const vehicle = assertTenantOwnership(await Vehicle.findByPk(data.vehicleId), tenantId);
  if (vehicle.customerId !== data.customerId) {
    throw ApiError.badRequest('Selected vehicle does not belong to this client');
  }

  return {
    vehicleId: vehicle.id,
    vehicleTypeId: vehicle.vehicleTypeId,
    vehicleRegistration: vehicle.registration,
    vehicleMake: vehicle.make,
    vehicleModel: vehicle.model,
  };
};

const create = async (tenantId, userId, data) => {
  await verifyBranch(tenantId, data.branchId);
  const customer = data.customerId ? await verifyCustomer(tenantId, data.customerId) : null;
  const vehicleSnapshot = await resolveVehicleSnapshot(tenantId, data);

  const serviceIds = data.services.map((item) => item.serviceId);
  const services = await Service.findAll({
    where: withTenantScope(tenantId, { id: serviceIds }),
    include: [{ model: ServiceVehiclePrice, as: 'vehiclePrices' }],
  });
  if (services.length !== new Set(serviceIds).size) {
    throw ApiError.badRequest('One or more services were not found');
  }
  const serviceMap = new Map(services.map((service) => [service.id, service]));

  const booking = await sequelize.transaction(async (t) => {
    const bookingNumber = await generateBookingNumber(tenantId, t);

    let totalAmount = 0;
    const lineItems = data.services.map((item) => {
      const service = serviceMap.get(item.serviceId);
      const price = resolveServicePrice(service, vehicleSnapshot.vehicleTypeId);
      totalAmount += price * item.quantity;
      return {
        tenantId,
        serviceId: service.id,
        priceAtBooking: price,
        durationAtBooking: service.durationMinutes,
        quantity: item.quantity,
      };
    });

    const newBooking = await Booking.create(
      {
        tenantId,
        branchId: data.branchId,
        customerId: data.customerId,
        bookingNumber,
        status: 'confirmed',
        scheduledAt: data.scheduledAt,
        notes: data.notes,
        totalAmount,
        createdBy: userId,
        ...vehicleSnapshot,
      },
      { transaction: t }
    );

    await BookingService.bulkCreate(
      lineItems.map((item) => ({ ...item, bookingId: newBooking.id })),
      { transaction: t }
    );

    if (customer) {
      await scheduleBookingNotifications(tenantId, newBooking, customer, t);
    }

    return newBooking;
  });

  return getById(tenantId, booking.id);
};

const update = async (tenantId, id, data) => {
  const booking = await getRawById(tenantId, id);

  if (data.branchId) await verifyBranch(tenantId, data.branchId);
  if (data.customerId) await verifyCustomer(tenantId, data.customerId);

  await booking.update(data);
  return getById(tenantId, id);
};

const remove = async (tenantId, id) => {
  const booking = await getRawById(tenantId, id);
  await booking.destroy();
};

const recalculateTotal = async (bookingId, transaction) => {
  const lineItems = await BookingService.findAll({ where: { bookingId }, transaction });
  const total = lineItems.reduce((sum, item) => sum + Number(item.priceAtBooking) * item.quantity, 0);
  await Booking.update({ totalAmount: total }, { where: { id: bookingId }, transaction });
};

const addService = async (tenantId, bookingId, item) => {
  const booking = await getRawById(tenantId, bookingId);
  const service = await Service.findByPk(item.serviceId, {
    include: [{ model: ServiceVehiclePrice, as: 'vehiclePrices' }],
  });
  assertTenantOwnership(service, tenantId);

  const price = resolveServicePrice(service, booking.vehicleTypeId);

  await sequelize.transaction(async (t) => {
    await BookingService.create(
      {
        tenantId,
        bookingId: booking.id,
        serviceId: service.id,
        priceAtBooking: price,
        durationAtBooking: service.durationMinutes,
        quantity: item.quantity,
      },
      { transaction: t }
    );

    await recalculateTotal(booking.id, t);
  });

  return getById(tenantId, bookingId);
};

const removeService = async (tenantId, bookingId, bookingServiceId) => {
  const booking = await getRawById(tenantId, bookingId);
  const lineItem = await BookingService.findByPk(bookingServiceId);
  if (!lineItem || lineItem.bookingId !== booking.id) {
    throw ApiError.notFound('Resource not found');
  }

  await sequelize.transaction(async (t) => {
    await lineItem.destroy({ transaction: t });
    await recalculateTotal(booking.id, t);
  });

  return getById(tenantId, bookingId);
};

const addAssignment = async (tenantId, user, bookingId, data) => {
  const booking = await getRawById(tenantId, bookingId);

  // Adding staff normally requires bookings.manage, but the booking's
  // creator (bookings.create) may add the initial assignment(s) — before
  // anyone else has been assigned — as part of creating the booking.
  if (!user.permissions.includes('bookings.manage')) {
    const assignmentCount = await BookingAssignment.count({ where: { bookingId: booking.id } });
    if (booking.createdBy !== user.id || assignmentCount > 0) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
  }

  const employee = await Employee.findByPk(data.employeeId);
  assertTenantOwnership(employee, tenantId);

  if (data.bookingServiceId) {
    const lineItem = await BookingService.findByPk(data.bookingServiceId);
    if (!lineItem || lineItem.bookingId !== booking.id) {
      throw ApiError.badRequest('bookingServiceId does not belong to this booking');
    }
  }

  if (data.teamId) {
    const team = await Team.findByPk(data.teamId);
    assertTenantOwnership(team, tenantId);
  }

  await sequelize.transaction(async (t) => {
    const existingLead = await BookingAssignment.findOne({
      where: { bookingId: booking.id, isTeamLead: true },
      transaction: t,
    });

    const assignment = await BookingAssignment.create(
      {
        tenantId,
        bookingId: booking.id,
        bookingServiceId: data.bookingServiceId || null,
        employeeId: employee.id,
        teamId: data.teamId || null,
        status: 'waiting',
        assignedAt: new Date(),
        isTeamLead: false,
      },
      { transaction: t }
    );

    if (data.isTeamLead || !existingLead) {
      await promoteTeamLead(booking.id, assignment.id, t);
    }
  });

  return getById(tenantId, bookingId);
};

const updateAssignment = async (tenantId, bookingId, assignmentId, data) => {
  const booking = await getRawById(tenantId, bookingId);
  const assignment = await BookingAssignment.findByPk(assignmentId);
  if (!assignment || assignment.bookingId !== booking.id) {
    throw ApiError.notFound('Resource not found');
  }

  if (data.isTeamLead !== undefined && data.isTeamLead !== true) {
    throw ApiError.badRequest('isTeamLead can only be set to true — nominate a replacement instead of unsetting');
  }

  await sequelize.transaction(async (t) => {
    if (data.status !== undefined) {
      assignment.status = data.status;
      if (data.status === 'in_progress' && !assignment.startedAt) assignment.startedAt = new Date();
      if (data.status === 'completed' && !assignment.completedAt) assignment.completedAt = new Date();
      await assignment.save({ transaction: t });

      if (data.status === 'cancelled' && assignment.isTeamLead) {
        await reassignLeadIfVacant(booking.id, t);
      }
    }

    if (data.isTeamLead === true) {
      await promoteTeamLead(booking.id, assignment.id, t);
    }

    await syncBookingStatusFromAssignments(booking, t);
  });

  return getById(tenantId, bookingId);
};

const removeAssignment = async (tenantId, bookingId, assignmentId) => {
  const booking = await getRawById(tenantId, bookingId);
  const assignment = await BookingAssignment.findByPk(assignmentId);
  if (!assignment || assignment.bookingId !== booking.id) {
    throw ApiError.notFound('Resource not found');
  }

  await sequelize.transaction(async (t) => {
    const wasLead = assignment.isTeamLead;
    await assignment.destroy({ transaction: t });
    if (wasLead) await reassignLeadIfVacant(booking.id, t);
  });
};

module.exports = {
  list,
  create,
  getById,
  getByIdForUser,
  update,
  remove,
  addService,
  removeService,
  addAssignment,
  updateAssignment,
  removeAssignment,
  computeStatusStamps,
};
