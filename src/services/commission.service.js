const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

const getPeriod = (query) => {
  const now = new Date();
  const endInput = query.endDate ? new Date(query.endDate) : now;
  const endDate = new Date(Date.UTC(endInput.getUTCFullYear(), endInput.getUTCMonth(), endInput.getUTCDate()));
  const exclusiveEnd = new Date(endDate);
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
  const startInput = query.startDate
    ? new Date(query.startDate)
    : new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1)); // default: current month
  const startDate = new Date(Date.UTC(startInput.getUTCFullYear(), startInput.getUTCMonth(), startInput.getUTCDate()));
  return { startDate, endDate, exclusiveEnd };
};

const getCommissionReport = async (tenantId, query) => {
  const { startDate, endDate, exclusiveEnd } = getPeriod(query);
  const branchClause = query.branchId ? `AND e.[branchId] = :branchId` : '';

  const rows = await sequelize.query(
    `SELECT
       e.[id]              AS employeeId,
       e.[firstName],
       e.[lastName],
       e.[commissionRate],
       br.[name]           AS branchName,
       COUNT(DISTINCT ba.[bookingId]) AS bookingsCount,
       COUNT(ba.[id])                AS assignmentsCompleted,
       COALESCE(SUM(bs.[priceAtBooking] * bs.[quantity]), 0) AS serviceRevenue,
       COALESCE(
         SUM(bs.[priceAtBooking] * bs.[quantity])
         * MAX(COALESCE(e.[commissionRate], 0)) / 100.0,
         0
       ) AS commissionEarned
     FROM [Employees] e
     JOIN [Branches] br ON e.[branchId] = br.[id]
     LEFT JOIN [BookingAssignments] ba
       ON ba.[employeeId] = e.[id]
       AND ba.[status] = 'completed'
       AND ba.[completedAt] >= :startDate
       AND ba.[completedAt] <  :exclusiveEnd
     LEFT JOIN [BookingServices] bs ON bs.[id] = ba.[bookingServiceId]
     WHERE e.[tenantId] = :tenantId
       AND e.[deletedAt] IS NULL
       ${branchClause}
     GROUP BY e.[id], e.[firstName], e.[lastName], e.[commissionRate], br.[name]
     ORDER BY commissionEarned DESC`,
    {
      replacements: { tenantId, startDate, exclusiveEnd, branchId: query.branchId || null },
      type: QueryTypes.SELECT,
    }
  );

  const employees = rows.map((r) => ({
    employeeId: r.employeeId,
    name: `${r.firstName} ${r.lastName}`,
    branchName: r.branchName,
    commissionRate: r.commissionRate != null ? Number(r.commissionRate) : null,
    bookingsCount: Number(r.bookingsCount),
    assignmentsCompleted: Number(r.assignmentsCompleted),
    serviceRevenue: Number(r.serviceRevenue),
    commissionEarned: Number(r.commissionEarned),
  }));

  const totalCommission = employees.reduce((s, e) => s + e.commissionEarned, 0);
  const totalServiceRevenue = employees.reduce((s, e) => s + e.serviceRevenue, 0);

  return {
    period: { startDate, endDate },
    summary: { totalServiceRevenue, totalCommission },
    employees,
  };
};

module.exports = { getCommissionReport };
