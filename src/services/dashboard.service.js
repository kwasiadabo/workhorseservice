const { Op, QueryTypes } = require('sequelize');
const { sequelize, Employee, Booking, BookingAssignment, BookingService, Service, Payment, CashHandover, Customer, Branch } = require('../models');

const ASSIGNMENT_STATUSES = ['waiting', 'in_progress', 'completed', 'cancelled'];
const PAYMENT_METHODS = ['cash', 'card', 'mobile_money', 'bank_transfer', 'other'];
const HANDOVER_STATUSES = ['submitted', 'reconciled', 'disputed'];
const TERMINAL_BOOKING_STATUSES = ['completed', 'cancelled', 'no_show'];

const EMPTY_PAYMENTS = {
  allTime: { count: 0, totalAmount: 0 },
  today: { count: 0, totalAmount: 0 },
  thisMonth: { count: 0, totalAmount: 0 },
  byMethod: PAYMENT_METHODS.map((method) => ({ method, count: 0, totalAmount: 0 })),
  recent: [],
};

const EMPTY_PAYLOAD = {
  hasEmployeeRecord: false,
  employee: null,
  assignments: {
    byStatus: { waiting: 0, in_progress: 0, completed: 0, cancelled: 0 },
    totalBookings: 0,
    todayCount: 0,
    thisWeekCount: 0,
    thisMonthCount: 0,
    avgDurationMinutes: 0,
    avgSatisfactionRating: 0,
    upcoming: [],
  },
  payments: EMPTY_PAYMENTS,
  cashHandovers: {
    totals: { count: 0, totalDeclared: 0, totalExpected: 0, totalVariance: 0 },
    byStatus: { submitted: 0, reconciled: 0, disputed: 0 },
    recent: [],
  },
};

// UTC, exclusive-end date boundaries — matches the
// `exclusiveEnd.setUTCDate(... + 1)` idiom used in bookings/payments/
// cashHandovers services.
const getDateBoundaries = () => {
  const now = new Date();

  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  // ISO week (Monday start). getUTCDay(): 0=Sun..6=Sat
  const diffToMonday = (todayStart.getUTCDay() + 6) % 7;
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return { todayStart, todayEnd, weekStart, weekEnd, monthStart, monthEnd };
};

const getAssignmentStats = async (tenantId, employee, dates) => {
  const statusRows = await BookingAssignment.findAll({
    where: { tenantId, employeeId: employee.id },
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['status'],
    raw: true,
  });
  const byStatus = { waiting: 0, in_progress: 0, completed: 0, cancelled: 0 };
  statusRows.forEach((row) => {
    byStatus[row.status] = Number(row.count);
  });

  const [distinctRow] = await BookingAssignment.findAll({
    where: { tenantId, employeeId: employee.id },
    attributes: [[sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('bookingId'))), 'totalBookings']],
    raw: true,
  });
  const totalBookings = Number(distinctRow?.totalBookings ?? 0);

  const countInRange = (start, end) =>
    Booking.count({
      where: { tenantId, scheduledAt: { [Op.gte]: start, [Op.lt]: end } },
      include: [
        { model: BookingAssignment, as: 'assignments', where: { employeeId: employee.id }, required: true, attributes: [] },
      ],
      distinct: true,
      col: 'id',
    });

  const [todayCount, thisWeekCount, thisMonthCount] = await Promise.all([
    countInRange(dates.todayStart, dates.todayEnd),
    countInRange(dates.weekStart, dates.weekEnd),
    countInRange(dates.monthStart, dates.monthEnd),
  ]);

  const [avgRow] = await Booking.findAll({
    where: { tenantId, status: 'completed' },
    include: [
      {
        model: BookingAssignment,
        as: 'assignments',
        where: { employeeId: employee.id, status: 'completed' },
        required: true,
        attributes: [],
      },
    ],
    attributes: [
      [sequelize.fn('AVG', sequelize.col('Booking.durationMinutes')), 'avgDuration'],
      [sequelize.fn('AVG', sequelize.col('Booking.satisfactionRating')), 'avgSatisfaction'],
    ],
    raw: true,
    subQuery: false,
  });
  const avgDurationMinutes = avgRow?.avgDuration != null ? Math.round(Number(avgRow.avgDuration) * 10) / 10 : 0;
  const avgSatisfactionRating = avgRow?.avgSatisfaction != null ? Math.round(Number(avgRow.avgSatisfaction) * 10) / 10 : 0;

  const upcomingRows = await Booking.findAll({
    where: { tenantId, status: { [Op.notIn]: TERMINAL_BOOKING_STATUSES }, scheduledAt: { [Op.gte]: dates.todayStart } },
    include: [
      {
        model: BookingAssignment,
        as: 'assignments',
        where: { employeeId: employee.id },
        required: true,
        attributes: ['status', 'isTeamLead', 'employeeId'],
      },
      { model: Customer, attributes: ['id', 'name'] },
      { model: Branch, attributes: ['id', 'name'] },
    ],
    order: [['scheduledAt', 'ASC']],
    limit: 5,
    subQuery: false,
  });

  const upcoming = upcomingRows.map((booking) => {
    const assignment = booking.assignments.find((a) => a.employeeId === employee.id) ?? booking.assignments[0];
    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      scheduledAt: booking.scheduledAt,
      status: booking.status,
      assignmentStatus: assignment?.status ?? null,
      isTeamLead: assignment?.isTeamLead ?? false,
      customerName: booking.Customer?.name ?? null,
      branchName: booking.Branch?.name ?? null,
    };
  });

  return { byStatus, totalBookings, todayCount, thisWeekCount, thisMonthCount, avgDurationMinutes, avgSatisfactionRating, upcoming };
};

const getPaymentStats = async (tenantId, employee, dates) => {
  if (!employee.userId) return EMPTY_PAYMENTS;

  const baseWhere = { tenantId, receivedBy: employee.userId, status: 'completed' };

  const buildTotals = async (where) => {
    const [row] = await Payment.findAll({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalAmount'],
      ],
      raw: true,
    });
    return { count: Number(row?.count ?? 0), totalAmount: Number(row?.totalAmount ?? 0) };
  };

  const [allTime, today, thisMonth] = await Promise.all([
    buildTotals(baseWhere),
    buildTotals({ ...baseWhere, paidAt: { [Op.gte]: dates.todayStart, [Op.lt]: dates.todayEnd } }),
    buildTotals({ ...baseWhere, paidAt: { [Op.gte]: dates.monthStart, [Op.lt]: dates.monthEnd } }),
  ]);

  const methodRows = await Payment.findAll({
    where: baseWhere,
    attributes: [
      'method',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalAmount'],
    ],
    group: ['method'],
    raw: true,
  });
  const methodMap = new Map(methodRows.map((row) => [row.method, { count: Number(row.count), totalAmount: Number(row.totalAmount) }]));
  const byMethod = PAYMENT_METHODS.map((method) => ({
    method,
    count: methodMap.get(method)?.count ?? 0,
    totalAmount: methodMap.get(method)?.totalAmount ?? 0,
  }));

  const recentRows = await Payment.findAll({
    where: baseWhere,
    include: [{ model: Booking, attributes: ['id', 'bookingNumber'], include: [{ model: Customer, attributes: ['id', 'name'] }] }],
    order: [['paidAt', 'DESC']],
    limit: 5,
    subQuery: false,
  });
  const recent = recentRows.map((payment) => ({
    id: payment.id,
    amount: Number(payment.amount),
    currency: payment.currency,
    method: payment.method,
    paidAt: payment.paidAt,
    bookingNumber: payment.Booking?.bookingNumber ?? null,
    customerName: payment.Booking?.Customer?.name ?? null,
  }));

  return { allTime, today, thisMonth, byMethod, recent };
};

const getCashHandoverStats = async (tenantId, employee) => {
  const where = { tenantId, employeeId: employee.id };

  const [totalsRow] = await CashHandover.findAll({
    where,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('expectedAmount')), 0), 'totalExpected'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('declaredAmount')), 0), 'totalDeclared'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('variance')), 0), 'totalVariance'],
    ],
    raw: true,
  });

  const statusRows = await CashHandover.findAll({
    where,
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['status'],
    raw: true,
  });
  const byStatus = { submitted: 0, reconciled: 0, disputed: 0 };
  statusRows.forEach((row) => {
    byStatus[row.status] = Number(row.count);
  });

  const recentRows = await CashHandover.findAll({ where, order: [['periodStart', 'DESC']], limit: 5 });
  const recent = recentRows.map((handover) => ({
    id: handover.id,
    periodStart: handover.periodStart,
    periodEnd: handover.periodEnd,
    declaredAmount: Number(handover.declaredAmount),
    expectedAmount: Number(handover.expectedAmount),
    variance: Number(handover.variance),
    status: handover.status,
    submittedAt: handover.submittedAt,
  }));

  return {
    totals: {
      count: Number(totalsRow?.count ?? 0),
      totalDeclared: Number(totalsRow?.totalDeclared ?? 0),
      totalExpected: Number(totalsRow?.totalExpected ?? 0),
      totalVariance: Number(totalsRow?.totalVariance ?? 0),
    },
    byStatus,
    recent,
  };
};

const getMyDashboard = async (tenantId, userId) => {
  const employee = await Employee.findOne({ where: { tenantId, userId } });
  if (!employee) return EMPTY_PAYLOAD;

  const dates = getDateBoundaries();

  const [assignments, payments, cashHandovers] = await Promise.all([
    getAssignmentStats(tenantId, employee, dates),
    getPaymentStats(tenantId, employee, dates),
    getCashHandoverStats(tenantId, employee),
  ]);

  return {
    hasEmployeeRecord: true,
    employee: { id: employee.id, firstName: employee.firstName, lastName: employee.lastName, branchId: employee.branchId },
    assignments,
    payments,
    cashHandovers,
  };
};

// Owner/manager-facing tenant-wide summary — today's revenue, this week's
// revenue trend, who's busy, and this week's growth signals. Distinct from
// getMyDashboard, which is scoped to the caller's own Employee record.
const getOwnerSummary = async (tenantId) => {
  const dates = getDateBoundaries();

  const [revenueRow] = await Payment.findAll({
    where: { tenantId, status: 'completed', paidAt: { [Op.gte]: dates.todayStart, [Op.lt]: dates.todayEnd } },
    attributes: [[sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'total']],
    raw: true,
  });
  const todayRevenue = Number(revenueRow?.total ?? 0);

  // Revenue trend for the week — daily completed-payment totals, Mon-Sun,
  // zero-filled (including days later in the week that haven't happened yet).
  const weekPayments = await Payment.findAll({
    where: { tenantId, status: 'completed', paidAt: { [Op.gte]: dates.weekStart, [Op.lt]: dates.weekEnd } },
    attributes: ['amount', 'paidAt'],
    raw: true,
  });
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const revenueTrendMap = new Map();
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(dates.weekStart);
    day.setUTCDate(day.getUTCDate() + i);
    const key = day.toISOString().slice(0, 10);
    revenueTrendMap.set(key, { date: key, label: DAY_LABELS[i], total: 0 });
  }
  weekPayments.forEach((payment) => {
    const key = new Date(payment.paidAt).toISOString().slice(0, 10);
    const entry = revenueTrendMap.get(key);
    if (entry) entry.total += Number(payment.amount);
  });
  const revenueTrend = [...revenueTrendMap.values()];

  // Staff utilization today — busy (has an in-progress assignment right
  // now) vs. available, plus how many assignments they have today.
  const [activeEmployees, branches, todaysAssignments] = await Promise.all([
    Employee.findAll({ where: { tenantId, status: 'active' }, attributes: ['id', 'firstName', 'lastName', 'branchId'], raw: true }),
    Branch.findAll({ where: { tenantId }, attributes: ['id', 'name'], raw: true }),
    BookingAssignment.findAll({
      where: { tenantId },
      include: [
        {
          model: Booking,
          attributes: [],
          where: { scheduledAt: { [Op.gte]: dates.todayStart, [Op.lt]: dates.todayEnd } },
          required: true,
        },
      ],
      attributes: ['employeeId', 'status'],
      raw: true,
    }),
  ]);
  const branchNameMap = new Map(branches.map((b) => [b.id, b.name]));

  const staffStatsMap = new Map();
  todaysAssignments.forEach((a) => {
    if (!staffStatsMap.has(a.employeeId)) staffStatsMap.set(a.employeeId, { todayCount: 0, busy: false });
    const stats = staffStatsMap.get(a.employeeId);
    stats.todayCount += 1;
    if (a.status === 'in_progress') stats.busy = true;
  });
  const staffUtilization = activeEmployees
    .map((employee) => {
      const stats = staffStatsMap.get(employee.id) ?? { todayCount: 0, busy: false };
      return {
        employeeId: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        branchName: branchNameMap.get(employee.branchId) ?? '—',
        todayCount: stats.todayCount,
        status: stats.busy ? 'busy' : 'available',
      };
    })
    .sort((a, b) => b.todayCount - a.todayCount);

  // New vs. returning clients this week.
  const [newCustomers, returningRows] = await Promise.all([
    Customer.count({ where: { tenantId, createdAt: { [Op.gte]: dates.weekStart, [Op.lt]: dates.weekEnd } } }),
    sequelize.query(
      `SELECT COUNT(DISTINCT b.[customerId]) AS cnt
       FROM [Bookings] b
       WHERE b.[tenantId] = :tenantId AND b.[deletedAt] IS NULL
         AND b.[scheduledAt] >= :weekStart AND b.[scheduledAt] < :weekEnd
         AND EXISTS (
           SELECT 1 FROM [Bookings] prev
           WHERE prev.[tenantId] = :tenantId AND prev.[deletedAt] IS NULL
             AND prev.[customerId] = b.[customerId]
             AND prev.[scheduledAt] < :weekStart
         )`,
      { replacements: { tenantId, weekStart: dates.weekStart, weekEnd: dates.weekEnd }, type: QueryTypes.SELECT }
    ),
  ]);
  const returningCustomers = Number(returningRows[0]?.cnt ?? 0);

  // Top service by revenue this week (completed bookings only).
  const weekBookings = await Booking.findAll({
    where: { tenantId, status: 'completed', scheduledAt: { [Op.gte]: dates.weekStart, [Op.lt]: dates.weekEnd } },
    attributes: ['id'],
    include: [{ model: BookingService, as: 'bookingServices', include: [{ model: Service, attributes: ['id', 'name'] }] }],
  });
  const serviceRevenueMap = new Map();
  weekBookings.forEach((booking) => {
    (booking.bookingServices ?? []).forEach((bs) => {
      const service = bs.Service;
      if (!service) return;
      const revenue = Number(bs.priceAtBooking) * bs.quantity;
      const existing = serviceRevenueMap.get(service.id);
      serviceRevenueMap.set(service.id, { name: service.name, revenue: (existing?.revenue ?? 0) + revenue });
    });
  });
  const topService = [...serviceRevenueMap.values()].sort((a, b) => b.revenue - a.revenue)[0] ?? null;

  return {
    money: { todayRevenue },
    revenueTrend,
    staffUtilization,
    growth: { newCustomers, returningCustomers, topService },
  };
};

module.exports = { getMyDashboard, getOwnerSummary, ASSIGNMENT_STATUSES, PAYMENT_METHODS, HANDOVER_STATUSES };
