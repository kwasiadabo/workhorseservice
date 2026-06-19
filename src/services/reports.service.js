const { Op, QueryTypes } = require('sequelize');
const { sequelize, Booking, BookingAssignment, BookingService, Payment, Branch, Employee, Customer, Service, Expense, ExpenseCategory } = require('../models');
const { withTenantScope } = require('../utils/tenantScope');

const BOOKING_STATUSES = ['confirmed', 'in_progress', 'awaiting_payment', 'completed', 'cancelled', 'no_show'];
const TOP_N = 10;
const TREND_MONTHS = 6;

// UTC, exclusive-end date boundaries for the requested period — defaults to
// the last 30 days, matching the idiom in dashboard.service.js.
const getPeriod = (query) => {
  const now = new Date();

  const endInput = query.endDate ? new Date(query.endDate) : now;
  const endDate = new Date(Date.UTC(endInput.getUTCFullYear(), endInput.getUTCMonth(), endInput.getUTCDate()));
  const exclusiveEnd = new Date(endDate);
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);

  const startInput = query.startDate ? new Date(query.startDate) : new Date(exclusiveEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = new Date(Date.UTC(startInput.getUTCFullYear(), startInput.getUTCMonth(), startInput.getUTCDate()));

  return { startDate, endDate, exclusiveEnd };
};

const round1 = (value) => Math.round(value * 10) / 10;

const getOverview = async (tenantId, query) => {
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

  // -- bookings by status --
  const statusCounts = Object.fromEntries(BOOKING_STATUSES.map((status) => [status, 0]));
  let completedBookingsRevenue = 0;
  bookings.forEach((booking) => {
    statusCounts[booking.status] += 1;
    if (booking.status === 'completed') completedBookingsRevenue += Number(booking.totalAmount);
  });
  const bookingsByStatus = BOOKING_STATUSES.map((status) => ({ status, count: statusCounts[status] }));
  const completedBookings = statusCounts.completed;
  const avgBookingValue = completedBookings > 0 ? completedBookingsRevenue / completedBookings : 0;

  // -- core revenue: actual cash collected in the period (completed payments
  // by paidAt) — matches the revenue trend below and revenueReport.service.js.
  // NOT booking.totalAmount by scheduledAt, which can include bookings whose
  // payment was recorded outside the requested period (or vice versa),
  // causing this figure to disagree with the trend chart / banking section
  // on the same page.
  const periodPayments = await Payment.findAll({
    where: withTenantScope(tenantId, { status: 'completed', paidAt: { [Op.gte]: startDate, [Op.lt]: exclusiveEnd } }),
    include: [{ model: Booking, attributes: ['branchId'], where: branchId ? { branchId } : undefined, required: true }],
    attributes: ['amount'],
  });
  let totalRevenue = 0;
  const branchRevenueMap = new Map();
  periodPayments.forEach((payment) => {
    const amount = Number(payment.amount);
    totalRevenue += amount;
    const paymentBranchId = payment.Booking?.branchId;
    if (paymentBranchId) branchRevenueMap.set(paymentBranchId, (branchRevenueMap.get(paymentBranchId) ?? 0) + amount);
  });

  // -- branch performance --
  const branches = await Branch.findAll({
    where: withTenantScope(tenantId, branchId ? { id: branchId } : {}),
    attributes: ['id', 'name'],
    raw: true,
  });
  const branchNameMap = new Map(branches.map((branch) => [branch.id, branch.name]));

  const branchStats = new Map(
    branches.map((branch) => [
      branch.id,
      { branchId: branch.id, branchName: branch.name, bookingsCount: 0, completedCount: 0, satisfactionSum: 0, satisfactionCount: 0 },
    ])
  );

  bookings.forEach((booking) => {
    const stats = branchStats.get(booking.branchId);
    if (!stats) return;
    stats.bookingsCount += 1;
    if (booking.status === 'completed') stats.completedCount += 1;
    if (booking.satisfactionRating != null) {
      stats.satisfactionSum += booking.satisfactionRating;
      stats.satisfactionCount += 1;
    }
  });

  const employeeCountRows = await Employee.findAll({
    where: withTenantScope(tenantId, { status: 'active' }),
    attributes: ['branchId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['branchId'],
    raw: true,
  });
  const employeeCountMap = new Map(employeeCountRows.map((row) => [row.branchId, Number(row.count)]));

  const branchPerformance = [...branchStats.values()]
    .map((stats) => ({
      branchId: stats.branchId,
      branchName: stats.branchName,
      bookingsCount: stats.bookingsCount,
      completedCount: stats.completedCount,
      revenue: branchRevenueMap.get(stats.branchId) ?? 0,
      avgSatisfaction: stats.satisfactionCount > 0 ? round1(stats.satisfactionSum / stats.satisfactionCount) : null,
      employeeCount: employeeCountMap.get(stats.branchId) ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // -- service provider (employee) performance --
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
        // Revenue only counts work actually completed — an assignment still
        // waiting/in_progress hasn't earned its share yet.
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

  const employeePerformance = [...employeeStats.values()]
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
    .sort((a, b) => b.servicesAssigned - a.servicesAssigned);

  // -- top services (completed bookings only — a cancelled/no-show booking's
  // line items were never actually earned) --
  const serviceStats = new Map();
  bookings.forEach((booking) => {
    if (booking.status !== 'completed') return;
    (booking.bookingServices ?? []).forEach((bookingService) => {
      const service = bookingService.Service;
      if (!service) return;
      if (!serviceStats.has(service.id)) {
        serviceStats.set(service.id, { serviceId: service.id, name: service.name, bookingsCount: 0, revenue: 0 });
      }
      const stats = serviceStats.get(service.id);
      stats.bookingsCount += bookingService.quantity;
      stats.revenue += Number(bookingService.priceAtBooking) * bookingService.quantity;
    });
  });
  const topServices = [...serviceStats.values()].sort((a, b) => b.revenue - a.revenue).slice(0, TOP_N);

  // -- top customers --
  const customerStats = new Map();
  bookings.forEach((booking) => {
    const customer = booking.Customer;
    if (!customer) return;
    if (!customerStats.has(customer.id)) {
      customerStats.set(customer.id, { customerId: customer.id, name: customer.name, phone: customer.phone, bookingsCount: 0, totalSpent: 0, lastVisit: booking.scheduledAt });
    }
    const stats = customerStats.get(customer.id);
    stats.bookingsCount += 1;
    if (booking.status === 'completed') stats.totalSpent += Number(booking.totalAmount);
    if (new Date(booking.scheduledAt) > new Date(stats.lastVisit)) stats.lastVisit = booking.scheduledAt;
  });
  const topCustomers = [...customerStats.values()].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, TOP_N);

  // -- revenue trend: last TREND_MONTHS calendar months, independent of the period filter --
  const trendStart = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - (TREND_MONTHS - 1), 1));
  const trendPayments = await Payment.findAll({
    where: withTenantScope(tenantId, { status: 'completed', paidAt: { [Op.gte]: trendStart } }),
    include: branchId ? [{ model: Booking, attributes: [], where: { branchId }, required: true }] : [],
    attributes: ['amount', 'paidAt'],
    raw: true,
  });

  const revenueTrendMap = new Map();
  for (let i = 0; i < TREND_MONTHS; i += 1) {
    const monthDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - (TREND_MONTHS - 1) + i, 1));
    const key = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}`;
    revenueTrendMap.set(key, { month: key, totalAmount: 0, count: 0 });
  }
  trendPayments.forEach((payment) => {
    const paidAt = new Date(payment.paidAt);
    const key = `${paidAt.getUTCFullYear()}-${String(paidAt.getUTCMonth() + 1).padStart(2, '0')}`;
    const entry = revenueTrendMap.get(key);
    if (entry) {
      entry.totalAmount += Number(payment.amount);
      entry.count += 1;
    }
  });
  const revenueTrend = [...revenueTrendMap.values()];

  // -- remaining summary counts --
  const [totalCustomers, newCustomers, totalBranches, activeEmployees] = await Promise.all([
    Customer.count({ where: withTenantScope(tenantId, {}) }),
    Customer.count({ where: withTenantScope(tenantId, { createdAt: { [Op.gte]: startDate, [Op.lt]: exclusiveEnd } }) }),
    Branch.count({ where: withTenantScope(tenantId, {}) }),
    Employee.count({ where: withTenantScope(tenantId, branchId ? { status: 'active', branchId } : { status: 'active' }) }),
  ]);

  // -- busiest hours + days --
  // MSSQL DATEPART weekday: 1=Sun, 2=Mon … 7=Sat (@@DATEFIRST=7 default)
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const branchHourClause = branchId ? `AND [branchId] = :branchId` : '';

  const [hourRows, dayRows] = await Promise.all([
    sequelize.query(
      `SELECT DATEPART(hour, [scheduledAt]) AS hr, COUNT(*) AS cnt
       FROM [Bookings]
       WHERE [tenantId] = :tenantId AND [deletedAt] IS NULL
         AND [scheduledAt] >= :startDate AND [scheduledAt] < :exclusiveEnd
         ${branchHourClause}
       GROUP BY DATEPART(hour, [scheduledAt])
       ORDER BY hr`,
      { replacements: { tenantId, startDate, exclusiveEnd, branchId: branchId || null }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT DATEPART(weekday, [scheduledAt]) AS dow, COUNT(*) AS cnt
       FROM [Bookings]
       WHERE [tenantId] = :tenantId AND [deletedAt] IS NULL
         AND [scheduledAt] >= :startDate AND [scheduledAt] < :exclusiveEnd
         ${branchHourClause}
       GROUP BY DATEPART(weekday, [scheduledAt])
       ORDER BY dow`,
      { replacements: { tenantId, startDate, exclusiveEnd, branchId: branchId || null }, type: QueryTypes.SELECT }
    ),
  ]);

  // Zero-fill all 24 hours
  const hourMap = new Map(Array.from({ length: 24 }, (_, h) => [h, { hour: h, label: `${String(h).padStart(2, '0')}:00`, count: 0 }]));
  hourRows.forEach((r) => { const e = hourMap.get(Number(r.hr)); if (e) e.count = Number(r.cnt); });
  const busiestHours = [...hourMap.values()];

  // Zero-fill all 7 days (MSSQL dow 1-7 → index 0-6)
  const dayMap = new Map(Array.from({ length: 7 }, (_, i) => [i + 1, { dow: i + 1, label: DAY_NAMES[i], count: 0 }]));
  dayRows.forEach((r) => { const e = dayMap.get(Number(r.dow)); if (e) e.count = Number(r.cnt); });
  const busiestDays = [...dayMap.values()];

  // -- returning customers (visited before the period) --
  const returningCustomers = await sequelize.query(
    `SELECT COUNT(DISTINCT b.[customerId]) AS cnt
     FROM [Bookings] b
     WHERE b.[tenantId] = :tenantId AND b.[deletedAt] IS NULL
       AND b.[scheduledAt] >= :startDate AND b.[scheduledAt] < :exclusiveEnd
       AND EXISTS (
         SELECT 1 FROM [Bookings] prev
         WHERE prev.[tenantId] = :tenantId AND prev.[deletedAt] IS NULL
           AND prev.[customerId] = b.[customerId]
           AND prev.[scheduledAt] < :startDate
       )`,
    { replacements: { tenantId, startDate, exclusiveEnd }, type: QueryTypes.SELECT }
  );
  const returningCustomerCount = Number(returningCustomers[0]?.cnt ?? 0);

  // -- expenses for the period --
  const toDateStr = (d) => d.toISOString().split('T')[0];
  const expensesWhere = { expenseDate: { [Op.gte]: toDateStr(startDate), [Op.lte]: toDateStr(endDate) } };
  if (branchId) expensesWhere.branchId = branchId;

  const periodExpenses = await Expense.findAll({
    where: withTenantScope(tenantId, expensesWhere),
    include: [{ model: ExpenseCategory, attributes: ['id', 'name'] }],
  });

  let totalExpenses = 0;
  const catMap = new Map();
  periodExpenses.forEach((e) => {
    totalExpenses += Number(e.amount);
    const catId = e.categoryId ?? '__none__';
    const catName = e.ExpenseCategory?.name ?? 'Uncategorized';
    if (!catMap.has(catId)) catMap.set(catId, { categoryId: catId === '__none__' ? null : catId, categoryName: catName, total: 0, count: 0 });
    const s = catMap.get(catId);
    s.total += Number(e.amount);
    s.count += 1;
  });
  const expensesByCategory = [...catMap.values()].sort((a, b) => b.total - a.total);

  return {
    period: { startDate, endDate },
    summary: {
      totalBookings: bookings.length,
      completedBookings,
      cancelledBookings: statusCounts.cancelled,
      noShowBookings: statusCounts.no_show,
      totalRevenue,
      avgBookingValue,
      totalExpenses,
      expenseCount: periodExpenses.length,
      netIncome: totalRevenue - totalExpenses,
      totalCustomers,
      newCustomers,
      returningCustomers: returningCustomerCount,
      totalBranches,
      activeEmployees,
    },
    revenueTrend,
    bookingsByStatus,
    branchPerformance,
    employeePerformance,
    topServices,
    topCustomers,
    expensesByCategory,
    busiestHours,
    busiestDays,
  };
};

module.exports = { getOverview };
