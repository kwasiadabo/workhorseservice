const { Op } = require('sequelize');
const { Booking, BookingAssignment, BookingService, Branch, Employee, Service, Customer } = require('../models');
const { withTenantScope } = require('../utils/tenantScope');

const BOOKING_STATUSES = ['confirmed', 'in_progress', 'awaiting_payment', 'completed', 'cancelled', 'no_show'];
const TOP_N = 10;
const TREND_MONTHS = 6;

const getPeriod = (query) => {
  const now = new Date();
  const endInput = query.endDate ? new Date(query.endDate) : now;
  const endDate = new Date(Date.UTC(endInput.getUTCFullYear(), endInput.getUTCMonth(), endInput.getUTCDate()));
  const exclusiveEnd = new Date(endDate);
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
  const startInput = query.startDate
    ? new Date(query.startDate)
    : new Date(exclusiveEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = new Date(Date.UTC(startInput.getUTCFullYear(), startInput.getUTCMonth(), startInput.getUTCDate()));
  return { startDate, endDate, exclusiveEnd };
};

const round1 = (value) => Math.round(value * 10) / 10;

const getBookingsReport = async (tenantId, query) => {
  const { startDate, endDate, exclusiveEnd } = getPeriod(query);
  const { branchId } = query;

  const bookingsWhere = { scheduledAt: { [Op.gte]: startDate, [Op.lt]: exclusiveEnd } };
  if (branchId) bookingsWhere.branchId = branchId;

  const bookings = await Booking.findAll({
    where: withTenantScope(tenantId, bookingsWhere),
    include: [
      { model: Branch, attributes: ['id', 'name'] },
      { model: Customer, attributes: ['id', 'name', 'phone'] },
      {
        model: BookingAssignment,
        as: 'assignments',
        include: [{ model: Employee, attributes: ['id', 'firstName', 'lastName', 'branchId'] }],
      },
      {
        model: BookingService,
        as: 'bookingServices',
        include: [{ model: Service, attributes: ['id', 'name'] }],
      },
    ],
  });

  // status counts + revenue
  const statusCounts = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0]));
  let totalRevenue = 0;
  bookings.forEach((b) => {
    statusCounts[b.status] += 1;
    if (b.status === 'completed') totalRevenue += Number(b.totalAmount);
  });
  const completedBookings = statusCounts.completed;
  const cancelledBookings = statusCounts.cancelled + statusCounts.no_show;
  const inProgressBookings = statusCounts.confirmed + statusCounts.in_progress + statusCounts.awaiting_payment;
  const completionRate = bookings.length > 0 ? round1((completedBookings / bookings.length) * 100) : 0;
  const avgBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;
  const bookingsByStatus = BOOKING_STATUSES.map((status) => ({ status, count: statusCounts[status] }));

  // branch performance
  const branches = await Branch.findAll({
    where: withTenantScope(tenantId, branchId ? { id: branchId } : {}),
    attributes: ['id', 'name'],
    raw: true,
  });
  const branchNameMap = new Map(branches.map((b) => [b.id, b.name]));
  const branchStats = new Map(
    branches.map((b) => [
      b.id,
      { branchId: b.id, branchName: b.name, bookingsCount: 0, completedCount: 0, cancelledCount: 0, revenue: 0 },
    ])
  );
  bookings.forEach((b) => {
    const stats = branchStats.get(b.branchId);
    if (!stats) return;
    stats.bookingsCount += 1;
    if (b.status === 'completed') {
      stats.completedCount += 1;
      stats.revenue += Number(b.totalAmount);
    }
    if (b.status === 'cancelled' || b.status === 'no_show') stats.cancelledCount += 1;
  });
  const branchPerformance = [...branchStats.values()].sort((a, b) => b.bookingsCount - a.bookingsCount);

  // top services
  const serviceStats = new Map();
  bookings.forEach((b) => {
    (b.bookingServices ?? []).forEach((bs) => {
      const service = bs.Service;
      if (!service) return;
      if (!serviceStats.has(service.id)) {
        serviceStats.set(service.id, { serviceId: service.id, name: service.name, bookingsCount: 0, revenue: 0 });
      }
      const s = serviceStats.get(service.id);
      s.bookingsCount += bs.quantity;
      s.revenue += Number(bs.priceAtBooking) * bs.quantity;
    });
  });
  const topServices = [...serviceStats.values()].sort((a, b) => b.bookingsCount - a.bookingsCount).slice(0, TOP_N);

  // top staff
  const staffStats = new Map();
  bookings.forEach((b) => {
    (b.assignments ?? []).forEach((a) => {
      const emp = a.Employee;
      if (!emp) return;
      if (!staffStats.has(emp.id)) {
        staffStats.set(emp.id, {
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          branchName: branchNameMap.get(emp.branchId) ?? '—',
          servicesAssigned: 0,
          completedCount: 0,
        });
      }
      const s = staffStats.get(emp.id);
      s.servicesAssigned += 1;
      if (a.status === 'completed') s.completedCount += 1;
    });
  });
  const topStaff = [...staffStats.values()].sort((a, b) => b.servicesAssigned - a.servicesAssigned).slice(0, TOP_N);

  // booking trend (last TREND_MONTHS calendar months, independent of period filter)
  const trendStart = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - (TREND_MONTHS - 1), 1));
  const trendBookings = await Booking.findAll({
    where: withTenantScope(tenantId, {
      scheduledAt: { [Op.gte]: trendStart },
      ...(branchId ? { branchId } : {}),
    }),
    attributes: ['scheduledAt', 'status'],
    raw: true,
  });

  const trendMap = new Map();
  for (let i = 0; i < TREND_MONTHS; i += 1) {
    const d = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - (TREND_MONTHS - 1) + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    trendMap.set(key, { month: key, count: 0, completedCount: 0 });
  }
  trendBookings.forEach((b) => {
    const d = new Date(b.scheduledAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const entry = trendMap.get(key);
    if (entry) {
      entry.count += 1;
      if (b.status === 'completed') entry.completedCount += 1;
    }
  });
  const bookingTrend = [...trendMap.values()];

  return {
    period: { startDate, endDate },
    summary: {
      totalBookings: bookings.length,
      completedBookings,
      cancelledBookings,
      inProgressBookings,
      completionRate,
      avgBookingValue,
      totalRevenue,
    },
    bookingsByStatus,
    bookingTrend,
    branchPerformance,
    topServices,
    topStaff,
  };
};

module.exports = { getBookingsReport };
