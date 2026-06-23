const { Op } = require('sequelize');
const { Booking, BookingAssignment, BookingService, Branch, Employee, Team } = require('../models');
const { withTenantScope } = require('../utils/tenantScope');

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
 * Consolidated team performance for the period — one row per team that was
 * actually dispatched (via the "assign team" shortcut) on at least one
 * assignment in the period. Mirrors serviceProviderReport.service.js's
 * shape/conventions, but groups by BookingAssignment.teamId instead of
 * employeeId. Only assignments tagged with a team count; the whole-booking
 * revenue-split denominator still counts every assignee on that line
 * (team-tagged or not), so a team sharing a booking with individually-
 * assigned staff only gets its fair share.
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
      { model: BookingAssignment, as: 'assignments' },
      { model: BookingService, as: 'bookingServices' },
    ],
  });

  const teamStats = new Map();
  bookings.forEach((booking) => {
    const wholeBookingAssignees = (booking.assignments ?? []).filter((a) => !a.bookingServiceId);
    const wholeBookingShare =
      wholeBookingAssignees.length > 0 ? Number(booking.totalAmount) / wholeBookingAssignees.length : 0;

    (booking.assignments ?? []).forEach((assignment) => {
      if (!assignment.teamId) return;

      if (!teamStats.has(assignment.teamId)) {
        teamStats.set(assignment.teamId, {
          teamId: assignment.teamId,
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
      const stats = teamStats.get(assignment.teamId);
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

  const teamIds = [...teamStats.keys()];
  const teamRecords = teamIds.length
    ? await Team.findAll({
        where: withTenantScope(tenantId, { id: teamIds }),
        attributes: ['id', 'name', 'branchId'],
        include: [
          { model: Branch, attributes: ['id', 'name'] },
          { model: Employee, as: 'members', attributes: ['id'], through: { attributes: [] } },
        ],
      })
    : [];
  const teamMap = new Map(teamRecords.map((t) => [t.id, t]));

  const teams = teamIds
    .map((teamId) => {
      const stats = teamStats.get(teamId);
      const team = teamMap.get(teamId);
      return {
        teamId,
        name: team?.name ?? 'Deleted team',
        branchName: team?.Branch?.name ?? '—',
        memberCount: team?.members?.length ?? 0,
        bookingsCount: stats.bookingIds.size,
        servicesAssigned: stats.servicesAssigned,
        assignmentsCompleted: stats.assignmentsCompleted,
        revenue: stats.revenue,
        avgSatisfaction: stats.satisfactionCount > 0 ? round1(stats.satisfactionSum / stats.satisfactionCount) : null,
        avgDurationMinutes: stats.durationCount > 0 ? Math.round(stats.durationSum / stats.durationCount) : null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = teams.reduce((sum, t) => sum + t.revenue, 0);
  const totalServicesAssigned = teams.reduce((sum, t) => sum + t.servicesAssigned, 0);

  return {
    period: { startDate, endDate },
    summary: { totalTeams: teams.length, totalServicesAssigned, totalRevenue },
    teams,
  };
};

module.exports = { getPerformance };
