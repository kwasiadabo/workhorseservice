'use strict';

const { Op } = require('sequelize');
const { sequelize, Tenant, Branch, Employee, Service, ServiceCategory, ServiceVehiclePrice, VehicleType, Booking, BookingService, BookingAssignment, Customer } = require('../models');
const ApiError = require('../utils/ApiError');
const { withTenantScope } = require('../utils/tenantScope');
const { scheduleBookingNotifications } = require('./notifications.service');
const paystack = require('../utils/paystack');
const env = require('../config/env');

// Resolve a tenant by slug — throws 404 if not found or not accepting bookings
const resolveTenantBySlug = async (slug) => {
  const tenant = await Tenant.findOne({
    where: { slug },
    attributes: ['id', 'name', 'slug', 'businessType', 'logoUrl', 'email', 'phone', 'address', 'status', 'portalDepositPercent'],
  });
  if (!tenant) throw ApiError.notFound('Business not found');
  if (!['trial', 'active'].includes(tenant.status)) {
    throw ApiError.badRequest('This business is not currently accepting bookings');
  }
  return tenant;
};

const getInfo = async (slug) => {
  const tenant = await resolveTenantBySlug(slug);
  const branches = await Branch.findAll({
    where: withTenantScope(tenant.id, {}),
    attributes: ['id', 'name', 'address', 'city', 'phone'],
  });
  return {
    tenant,
    branches,
    depositPercent: tenant.portalDepositPercent ?? 0,
    paystackPublicKey: env.PAYSTACK_PUBLIC_KEY,
  };
};

const getStaff = async (slug) => {
  const tenant = await resolveTenantBySlug(slug);
  const employees = await Employee.findAll({
    where: withTenantScope(tenant.id, { status: 'active' }),
    attributes: ['id', 'firstName', 'lastName'],
  });
  return employees;
};

const getServices = async (slug) => {
  const tenant = await resolveTenantBySlug(slug);
  const services = await Service.findAll({
    where: withTenantScope(tenant.id, { isActive: true }),
    attributes: ['id', 'name', 'price', 'currency', 'durationMinutes'],
    include: [
      { model: ServiceCategory, attributes: ['id', 'name'] },
      {
        model: ServiceVehiclePrice,
        as: 'vehiclePrices',
        attributes: ['vehicleTypeId', 'price'],
        include: [{ model: VehicleType, attributes: ['id', 'name', 'displayOrder'] }],
      },
    ],
    order: [['name', 'ASC']],
  });
  return services;
};

// Return available time slots for a staff member on a given date
// Slots are every 30 minutes, 08:00 – 18:00, excluding already-booked times
const getAvailability = async (slug, employeeId, date) => {
  const tenant = await resolveTenantBySlug(slug);
  const employee = await Employee.findOne({
    where: withTenantScope(tenant.id, { id: employeeId, status: 'active' }),
    attributes: ['id', 'firstName', 'lastName'],
  });
  if (!employee) throw ApiError.notFound('Staff member not found');

  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);

  // Find all confirmed/in_progress bookings for this employee on this date
  const busyAssignments = await BookingAssignment.findAll({
    where: { employeeId, status: { [Op.notIn]: ['cancelled'] } },
    include: [
      {
        model: Booking,
        where: {
          tenantId: tenant.id,
          scheduledAt: { [Op.gte]: dayStart, [Op.lte]: dayEnd },
          status: { [Op.notIn]: ['cancelled', 'no_show'] },
        },
        attributes: ['scheduledAt'],
        include: [{ model: BookingService, as: 'bookingServices', attributes: ['durationAtBooking', 'quantity'] }],
      },
    ],
  });

  // Build busy intervals
  const busyIntervals = busyAssignments
    .filter((a) => a.Booking)
    .map((a) => {
      const start = new Date(a.Booking.scheduledAt);
      const totalDuration = (a.Booking.bookingServices ?? []).reduce(
        (sum, bs) => sum + (bs.durationAtBooking ?? 30) * (bs.quantity ?? 1),
        30
      );
      const end = new Date(start.getTime() + totalDuration * 60 * 1000);
      return { start, end };
    });

  // Generate 30-min slots 08:00 – 17:30 local
  const slots = [];
  const baseDate = new Date(`${date}T08:00:00`);
  for (let i = 0; i < 20; i++) {
    const slotStart = new Date(baseDate.getTime() + i * 30 * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    const isBusy = busyIntervals.some(
      (b) => slotStart < b.end && slotEnd > b.start
    );
    slots.push({ time: slotStart.toISOString(), available: !isBusy });
  }

  return { date, employee: { id: employee.id, firstName: employee.firstName, lastName: employee.lastName }, slots };
};

// Initialize a Paystack transaction for the deposit on a self-booking
const initializeDepositPayment = async (slug, { serviceId, customerEmail, customerName }) => {
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant.portalDepositPercent) throw ApiError.badRequest('This business does not require a deposit');

  const service = await Service.findOne({ where: withTenantScope(tenant.id, { id: serviceId }) });
  if (!service) throw ApiError.notFound('Service not found');

  const depositAmount = Math.round(Number(service.price) * (tenant.portalDepositPercent / 100) * 100); // pesewas
  const reference = paystack.generateReference(tenant.id);

  const result = await paystack.initializeTransaction({
    email: customerEmail || `portal+${reference}@workhorse.local`,
    amountInPesewas: depositAmount,
    reference,
    callbackUrl: `${env.FRONTEND_URL}/book/${slug}`,
    metadata: { tenantId: tenant.id, serviceId, customerName, type: 'portal_deposit' },
  });

  return {
    authorization_url: result.authorization_url,
    reference,
    depositAmount: depositAmount / 100,
  };
};

// Public booking creation — finds or creates customer by phone
const createBooking = async (slug, data) => {
  const tenant = await resolveTenantBySlug(slug);

  // Find or create customer by phone
  let customer = await Customer.findOne({
    where: withTenantScope(tenant.id, { phone: data.phone }),
    paranoid: false,
  });

  return sequelize.transaction(async (t) => {
    if (!customer) {
      customer = await Customer.create(
        { tenantId: tenant.id, name: data.name, phone: data.phone, email: data.email || null },
        { transaction: t }
      );
    } else if (customer.deletedAt) {
      await customer.restore({ transaction: t });
      await customer.update({ name: data.name, email: data.email || null }, { transaction: t });
    }

    // Resolve branchId — fall back to the tenant's first branch if not supplied
    let branchId = data.branchId || null;
    if (!branchId) {
      const firstBranch = await Branch.findOne({ where: withTenantScope(tenant.id, {}), attributes: ['id'] });
      if (!firstBranch) throw ApiError.badRequest('This business has no locations configured');
      branchId = firstBranch.id;
    }

    // Validate employee + service belong to tenant
    const employee = await Employee.findOne({
      where: withTenantScope(tenant.id, { id: data.employeeId, status: 'active' }),
    });
    if (!employee) throw ApiError.notFound('Staff member not found');

    const service = await Service.findOne({
      where: withTenantScope(tenant.id, { id: data.serviceId }),
    });
    if (!service) throw ApiError.notFound('Service not found');

    // For vehicle-type pricing (e.g. car washes), look up the per-vehicle price
    let effectivePrice = Number(service.price);
    if (data.vehicleTypeId) {
      const vehiclePrice = await ServiceVehiclePrice.findOne({
        where: { serviceId: service.id, vehicleTypeId: data.vehicleTypeId },
      });
      if (!vehiclePrice) throw ApiError.badRequest('Invalid vehicle type for this service');
      effectivePrice = Number(vehiclePrice.price);
    }

    // Generate booking number (BK-YYYYMMDD-NNNN, sequential per tenant per day)
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `BK-${datePart}-`;
    const count = await Booking.count({ where: { tenantId: tenant.id, bookingNumber: { [Op.like]: `${prefix}%` } }, paranoid: false, transaction: t });
    const bookingNumber = `${prefix}${String(count + 1).padStart(4, '0')}`;

    // Deposit verification — required when tenant has configured a deposit percent
    let depositReference = null;
    let depositAmount = null;
    if (tenant.portalDepositPercent > 0) {
      if (!data.paystackReference) throw ApiError.badRequest('A deposit payment is required to confirm this booking');
      const paystackResult = await paystack.verifyTransaction(data.paystackReference);
      if (paystackResult.status !== 'success') throw ApiError.badRequest('Deposit payment was not successful');
      const expectedPesewas = Math.round(effectivePrice * (tenant.portalDepositPercent / 100) * 100);
      if (paystackResult.amount !== expectedPesewas) throw ApiError.badRequest('Deposit amount does not match');
      depositReference = data.paystackReference;
      depositAmount = paystackResult.amount / 100;
    }

    const booking = await Booking.create(
      {
        tenantId: tenant.id,
        branchId,
        customerId: customer.id,
        bookingNumber,
        status: 'confirmed',
        source: 'portal',
        scheduledAt: data.scheduledAt,
        notes: data.notes || null,
        vehicleTypeId: data.vehicleTypeId || null,
        totalAmount: effectivePrice,
        depositReference,
        depositAmount,
      },
      { transaction: t }
    );

    await BookingService.create(
      {
        tenantId: tenant.id,
        bookingId: booking.id,
        serviceId: service.id,
        priceAtBooking: effectivePrice,
        durationAtBooking: service.durationMinutes,
        quantity: 1,
      },
      { transaction: t }
    );

    await BookingAssignment.create(
      { tenantId: tenant.id, bookingId: booking.id, employeeId: employee.id, status: 'waiting', isTeamLead: true },
      { transaction: t }
    );

    await scheduleBookingNotifications(tenant.id, booking, customer, t);

    return { bookingNumber: booking.bookingNumber, scheduledAt: booking.scheduledAt };
  });
};

module.exports = { getInfo, getStaff, getServices, getAvailability, initializeDepositPayment, createBooking };
