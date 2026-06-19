const { Op } = require('sequelize');
const { sequelize, Booking, BookingAssignment, BookingService, Branch, Employee, Service, Customer } = require('../models');
const { withTenantScope, assertTenantOwnership } = require('../utils/tenantScope');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

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

/**
 * Consolidated service-provider performance for the period — one row per
 * employee, across all branches or restricted to one. Revenue only counts
 * assignments that were actually completed (see reports.service.js for the
 * same convention).
 */
const getPerformance = async (tenantId, query) => {
  const { startDate, endDate, exclusiveEnd } = getPeriod(query);
  const { branchId } = query;

  const bookingsWhere = { scheduledAt: { [Op.gte]: startDate, [Op.lt]: exclusiveEnd } };
  if (branchId) bookingsWhere.branchId = branchId;

  const bookings = await Booking.findAll({
    where: withTenantScope(tenantId, bookingsWhere),
    attributes: ['id', 'totalAmount', 'satisfactionRating', 'durationMinutes'],
    include: [
      {
        model: BookingAssignment,
        as: 'assignments',
        include: [{ model: Employee, attributes: ['id', 'firstName', 'lastName', 'branchId'] }],
      },
      { model: BookingService, as: 'bookingServices' },
    ],
  });

  const branches = await Branch.findAll({
    where: withTenantScope(tenantId, branchId ? { id: branchId } : {}),
    attributes: ['id', 'name'],
    raw: true,
  });
  const branchNameMap = new Map(branches.map((b) => [b.id, b.name]));

  const employeeStats = new Map();
  bookings.forEach((booking) => {
    // For whole-booking assignments (no bookingServiceId), split totalAmount equally.
    const wholeBookingAssignees = (booking.assignments ?? []).filter((a) => !a.bookingServiceId && a.Employee);
    const wholeBookingShare =
      wholeBookingAssignees.length > 0 ? Number(booking.totalAmount) / wholeBookingAssignees.length : 0;

    (booking.assignments ?? []).forEach((assignment) => {
      const employee = assignment.Employee;
      if (!employee) return;

      if (!employeeStats.has(employee.id)) {
        employeeStats.set(employee.id, {
          employeeId: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          branchName: branchNameMap.get(employee.branchId) ?? '—',
          bookingIds: new Set(),
          servicesAssigned: 0,
          assignmentsCompleted: 0,
          revenue: 0,
          satisfactionSum: 0,
          satisfactionCount: 0,
          durationSum: 0,
          durationCount: 0,
        });
      }
      const stats = employeeStats.get(employee.id);
      stats.bookingIds.add(booking.id);
      stats.servicesAssigned += 1;

      if (assignment.status === 'completed') {
        stats.assignmentsCompleted += 1;
        if (booking.satisfactionRating != null) {
          stats.satisfactionSum += booking.satisfactionRating;
          stats.satisfactionCount += 1;
        }
        if (booking.durationMinutes != null) {
          stats.durationSum += booking.durationMinutes;
          stats.durationCount += 1;
        }
        if (assignment.bookingServiceId) {
          const bookingService = (booking.bookingServices ?? []).find((bs) => bs.id === assignment.bookingServiceId);
          if (bookingService) {
            stats.revenue += Number(bookingService.priceAtBooking) * bookingService.quantity;
          }
        } else {
          stats.revenue += wholeBookingShare;
        }
      }
    });
  });

  const employees = [...employeeStats.values()]
    .map((stats) => ({
      employeeId: stats.employeeId,
      name: stats.name,
      branchName: stats.branchName,
      bookingsCount: stats.bookingIds.size,
      servicesAssigned: stats.servicesAssigned,
      assignmentsCompleted: stats.assignmentsCompleted,
      revenue: stats.revenue,
      avgSatisfaction: stats.satisfactionCount > 0 ? round1(stats.satisfactionSum / stats.satisfactionCount) : null,
      avgDurationMinutes: stats.durationCount > 0 ? Math.round(stats.durationSum / stats.durationCount) : null,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = employees.reduce((sum, e) => sum + e.revenue, 0);
  const totalServicesAssigned = employees.reduce((sum, e) => sum + e.servicesAssigned, 0);

  return {
    period: { startDate, endDate },
    summary: { totalServiceProviders: employees.length, totalServicesAssigned, totalRevenue },
    employees,
  };
};

/**
 * Detail list — every service assigned to one specific service provider in
 * the period, newest first. Loads the full matching set (not just the
 * requested page) so the total reflects every assignment in the period, not
 * just what's currently on screen — paginated assignment volumes per
 * employee are small enough that this is cheap, same trade-off
 * reports.service.js already makes for its in-memory aggregation.
 */
const getAssignments = async (tenantId, query) => {
  const { startDate, endDate, exclusiveEnd } = getPeriod(query);
  const { page, limit, offset } = parsePagination(query);

  const employee = await Employee.findByPk(query.employeeId);
  assertTenantOwnership(employee, tenantId);

  const assignments = await BookingAssignment.findAll({
    where: withTenantScope(tenantId, { employeeId: query.employeeId }),
    include: [
      {
        model: Booking,
        required: true,
        where: { scheduledAt: { [Op.gte]: startDate, [Op.lt]: exclusiveEnd } },
        attributes: ['id', 'bookingNumber', 'scheduledAt', 'status', 'totalAmount'],
        include: [{ model: Customer, attributes: ['id', 'name', 'phone'] }],
      },
      { model: BookingService, include: [{ model: Service, attributes: ['id', 'name'] }] },
    ],
    order: [[Booking, 'scheduledAt', 'DESC']],
  });

  // A whole-booking assignment (no bookingServiceId) splits the booking's
  // totalAmount across every employee assigned to the whole booking, not
  // just this one — look up how many co-assignees each such booking has.
  const wholeBookingIds = [...new Set(assignments.filter((a) => !a.bookingServiceId).map((a) => a.bookingId))];
  const shareCountMap = new Map();
  if (wholeBookingIds.length) {
    const shareRows = await BookingAssignment.findAll({
      where: { tenantId, bookingId: { [Op.in]: wholeBookingIds }, bookingServiceId: null },
      attributes: ['bookingId', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
      group: ['bookingId'],
      raw: true,
    });
    shareRows.forEach((r) => shareCountMap.set(r.bookingId, Number(r.cnt)));
  }

  const items = assignments.map((assignment) => {
    const booking = assignment.Booking;
    const bookingService = assignment.BookingService;
    const amount = bookingService
      ? Number(bookingService.priceAtBooking) * bookingService.quantity
      : Number(booking.totalAmount) / (shareCountMap.get(assignment.bookingId) || 1);
    return {
      assignmentId: assignment.id,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      customerName: booking.Customer?.name ?? '—',
      serviceName: bookingService?.Service?.name ?? 'Whole booking',
      scheduledAt: booking.scheduledAt,
      bookingStatus: booking.status,
      assignmentStatus: assignment.status,
      isTeamLead: assignment.isTeamLead,
      amount,
    };
  });

  const search = query.search?.trim().toLowerCase();
  const filtered = search
    ? items.filter(
        (item) =>
          item.customerName.toLowerCase().includes(search) ||
          item.bookingNumber.toLowerCase().includes(search) ||
          item.serviceName.toLowerCase().includes(search)
      )
    : items;

  const totalAmount = filtered.reduce((sum, item) => sum + item.amount, 0);
  const count = filtered.length;

  return {
    employee: { id: employee.id, name: `${employee.firstName} ${employee.lastName}` },
    period: { startDate, endDate },
    items: filtered.slice(offset, offset + limit),
    summary: { count, totalAmount },
    meta: buildPaginationMeta({ page, limit, count }),
  };
};

module.exports = { getPerformance, getAssignments };
