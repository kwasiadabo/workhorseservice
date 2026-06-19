const { Op } = require('sequelize');
const { sequelize, Payment, Booking, BookingAssignment, Customer, Employee, User, Tenant } = require('../models');
const ApiError = require('../utils/ApiError');
const { withTenantScope, assertTenantOwnership } = require('../utils/tenantScope');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { getTotalPaid } = require('../utils/bookingPayments');
const { computeStatusStamps } = require('./bookings.service');
const { createReviewRequest } = require('./reviews.service');
const { scheduleReviewNotification, schedulePaymentReceipt } = require('./notifications.service');

const TERMINAL_BOOKING_STATUSES = ['completed', 'cancelled', 'no_show'];

const LIST_INCLUDES = [
  {
    model: Booking,
    attributes: ['id', 'bookingNumber'],
    include: [{ model: Customer, attributes: ['id', 'name'] }],
  },
  {
    model: User,
    as: 'receiver',
    attributes: ['id', 'firstName', 'lastName'],
    include: [{ model: Employee, attributes: ['id', 'firstName', 'lastName'] }],
  },
];

const EMPTY_RESULT = (page, limit) => ({
  items: [],
  meta: buildPaginationMeta({ page, limit, count: 0 }),
  totals: { count: 0, totalAmount: 0 },
});

const list = async (tenantId, query = {}) => {
  const { page, limit, offset, order } = parsePagination(query);
  const where = withTenantScope(tenantId, {});
  if (query.bookingId) where.bookingId = query.bookingId;

  if (query.startDate) where.paidAt = { ...where.paidAt, [Op.gte]: query.startDate };
  if (query.endDate) {
    const exclusiveEnd = new Date(query.endDate);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    where.paidAt = { ...where.paidAt, [Op.lt]: exclusiveEnd };
  }

  // "Service provider" filter — Payments don't store an employeeId directly,
  // so resolve the employee's linked user account and filter on `receivedBy`.
  if (query.employeeId) {
    const employee = await Employee.findByPk(query.employeeId);
    assertTenantOwnership(employee, tenantId);
    if (!employee.userId) return EMPTY_RESULT(page, limit);
    where.receivedBy = employee.userId;
  }

  // Free-text search across reference number, notes, booking number and
  // customer name (resolved to a set of bookingIds up front to avoid
  // cross-association `$nested$` where-references).
  if (query.search) {
    const like = { [Op.like]: `%${query.search}%` };
    const matchingCustomers = await Customer.findAll({
      where: withTenantScope(tenantId, { name: like }),
      attributes: ['id'],
    });
    const customerIds = matchingCustomers.map((c) => c.id);
    const matchingBookings = await Booking.findAll({
      where: withTenantScope(tenantId, {
        [Op.or]: [{ bookingNumber: like }, ...(customerIds.length ? [{ customerId: { [Op.in]: customerIds } }] : [])],
      }),
      attributes: ['id'],
      paranoid: false,
    });
    const bookingIds = matchingBookings.map((b) => b.id);

    where[Op.or] = [{ referenceNumber: like }, { notes: like }, ...(bookingIds.length ? [{ bookingId: { [Op.in]: bookingIds } }] : [])];
  }

  const { rows, count } = await Payment.findAndCountAll({
    where,
    include: LIST_INCLUDES,
    limit,
    offset,
    order: order || [['paidAt', 'DESC']],
  });

  // `findAll` (not `findOne`) — on MSSQL, `findOne` adds an
  // `ORDER BY [id] OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY` clause, which SQL
  // Server rejects for an aggregate query with no GROUP BY (`id` isn't
  // aggregated). `findAll` without limit/offset emits no such clause, and
  // the aggregate naturally returns a single row.
  const [totalsRow] = await Payment.findAll({
    where,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalAmount'],
    ],
    raw: true,
  });

  return {
    items: rows,
    meta: buildPaginationMeta({ page, limit, count }),
    totals: { count: Number(totalsRow?.count ?? 0), totalAmount: Number(totalsRow?.totalAmount ?? 0) },
  };
};

const generateReferenceNumber = async (tenantId, transaction) => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `PAY-${datePart}-`;
  const count = await Payment.count({
    where: { tenantId, referenceNumber: { [Op.like]: `${prefix}%` } },
    transaction,
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

const create = async (tenantId, user, data) => {
  const booking = await Booking.findByPk(data.bookingId);
  assertTenantOwnership(booking, tenantId);

  let justCompleted = false;

  const payment = await sequelize.transaction(async (t) => {
    const totalPaid = await getTotalPaid(booking.id, t);
    const balanceDue = Math.round((Number(booking.totalAmount) - totalPaid) * 100) / 100;
    if (balanceDue <= 0) {
      throw ApiError.conflict('This booking is already fully paid');
    }
    if (Number(data.amount) < balanceDue) {
      throw ApiError.badRequest(`Payment amount cannot be less than the balance due (GH¢ ${balanceDue.toFixed(2)})`);
    }

    const referenceNumber = data.referenceNumber || (await generateReferenceNumber(tenantId, t));

    const newPayment = await Payment.create(
      {
        tenantId,
        bookingId: booking.id,
        amount: data.amount,
        currency: data.currency || 'GH¢',
        method: data.method || 'cash',
        referenceNumber,
        receivedBy: user.id,
        paidAt: data.paidAt || new Date(),
        notes: data.notes,
      },
      { transaction: t }
    );

    // Payment is the final step before a booking is "completed" — once a
    // non-terminal booking's recorded payments fully cover totalAmount, mark
    // it completed, regardless of how far the assignment workflow has gotten.
    if (!TERMINAL_BOOKING_STATUSES.includes(booking.status)) {
      const totalPaidAfter = await getTotalPaid(booking.id, t);
      if (totalPaidAfter >= Number(booking.totalAmount)) {
        justCompleted = true;
        const statusData = { status: 'completed' };
        Object.assign(statusData, computeStatusStamps(booking, statusData));
        await booking.update(statusData, { transaction: t });

        // A fully-paid booking is done even if staff never progressed their
        // assignments — close out any still-open ones so queue views show
        // "completed" instead of a stale "waiting"/"in_progress". Two bulk
        // updates (split on whether startedAt is already set) instead of one
        // round trip per assignment — this is the dominant cost on a remote
        // DB when a booking has several staff assignments.
        const now = new Date();
        const openAssignments = await BookingAssignment.findAll({
          where: { bookingId: booking.id, status: { [Op.in]: ['waiting', 'in_progress'] } },
          attributes: ['id', 'startedAt'],
          transaction: t,
        });
        const withStart = openAssignments.filter((a) => a.startedAt).map((a) => a.id);
        const withoutStart = openAssignments.filter((a) => !a.startedAt).map((a) => a.id);
        if (withStart.length) {
          await BookingAssignment.update(
            { status: 'completed', completedAt: now },
            { where: { id: { [Op.in]: withStart } }, transaction: t }
          );
        }
        if (withoutStart.length) {
          await BookingAssignment.update(
            { status: 'completed', completedAt: now, startedAt: now },
            { where: { id: { [Op.in]: withoutStart } }, transaction: t }
          );
        }

        // Award 1 loyalty point to the customer for a completed visit.
        if (booking.customerId) {
          await Customer.increment('loyaltyPoints', {
            by: 1,
            where: { id: booking.customerId },
            transaction: t,
          });
        }
      }
    }

    return newPayment;
  });

  // Receipt/review SMS aren't on the payment's critical path — schedule them
  // after the transaction commits so the request doesn't wait on extra round
  // trips (Rating.create, Customer/Tenant lookups, Notification.create)
  // before responding to the client.
  if (booking.customerId) {
    Promise.all([Customer.findByPk(booking.customerId), Tenant.findByPk(tenantId, { attributes: ['name'] })])
      .then(async ([customer, tenant]) => {
        await schedulePaymentReceipt(tenantId, booking, customer, payment, tenant?.name);

        if (justCompleted) {
          const reviewResult = await createReviewRequest(tenantId, booking);
          if (reviewResult) {
            await scheduleReviewNotification(tenantId, booking, customer, reviewResult.token, tenant?.name);
          }
        }
      })
      .catch((err) => console.error('[payments] receipt/review notification scheduling failed:', err?.message));
  }

  return payment;
};

const getById = async (tenantId, id) => {
  const payment = await Payment.findByPk(id);
  return assertTenantOwnership(payment, tenantId);
};

const listForBooking = async (tenantId, bookingId) => {
  const booking = await Booking.findByPk(bookingId);
  assertTenantOwnership(booking, tenantId);
  return Payment.findAll({ where: { tenantId, bookingId }, order: [['paidAt', 'DESC']] });
};

module.exports = { list, create, getById, listForBooking };
