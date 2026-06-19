const { Op } = require('sequelize');
const { sequelize, CashHandover, Employee, Branch, Payment, Booking, Customer, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { withTenantScope, assertTenantOwnership } = require('../utils/tenantScope');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const DETAIL_INCLUDES = [
  { model: Employee, attributes: ['id', 'firstName', 'lastName'] },
  { model: Branch, attributes: ['id', 'name'] },
  { model: User, as: 'submitter', attributes: ['id', 'firstName', 'lastName'] },
  { model: User, as: 'reconciler', attributes: ['id', 'firstName', 'lastName'] },
];

// `completed` payments personally recorded by this employee's linked user
// account within [periodStart, periodEnd] that haven't yet been included in
// a cash handover — the set a new handover for this period would cover.
const getPendingPayments = (tenantId, employeeUserId, periodStart, periodEnd) =>
  Payment.findAll({
    where: withTenantScope(tenantId, {
      receivedBy: employeeUserId,
      status: 'completed',
      cashHandoverId: null,
      paidAt: { [Op.between]: [periodStart, periodEnd] },
    }),
    include: [
      { model: Booking, attributes: ['id', 'bookingNumber'], include: [{ model: Customer, attributes: ['id', 'name'] }] },
    ],
    order: [['paidAt', 'ASC']],
  });

// Sum (and underlying list) of this employee's not-yet-handed-over `completed`
// payments within [periodStart, periodEnd] — the amount they're expected to
// be able to hand over for this period.
const computeExpectedAmount = async (tenantId, employeeId, periodStart, periodEnd) => {
  const employee = await Employee.findByPk(employeeId);
  assertTenantOwnership(employee, tenantId);
  if (!employee.userId) return { expectedAmount: 0, payments: [] };

  const payments = await getPendingPayments(tenantId, employee.userId, periodStart, periodEnd);
  const expectedAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  return { expectedAmount, payments };
};

// Whether this employee already has a handover (any status) covering any day
// in [periodStart, periodEnd] — used to block double-submission for the same
// period.
const findOverlappingHandover = (tenantId, employeeId, periodStart, periodEnd) =>
  CashHandover.findOne({
    where: withTenantScope(tenantId, {
      employeeId,
      periodStart: { [Op.lte]: periodEnd },
      periodEnd: { [Op.gte]: periodStart },
    }),
  });

// cash_handovers.manage callers (the only callers reaching this service) can
// declare/preview for any employee in the tenant — employeeId is required.
const resolveEmployee = async (tenantId, requestedEmployeeId) => {
  if (!requestedEmployeeId) {
    throw ApiError.badRequest('employeeId is required');
  }
  const employee = await Employee.findByPk(requestedEmployeeId);
  return assertTenantOwnership(employee, tenantId);
};

const preview = async (tenantId, query) => {
  const employee = await resolveEmployee(tenantId, query.employeeId);
  const [{ expectedAmount, payments }, overlapping] = await Promise.all([
    computeExpectedAmount(tenantId, employee.id, query.periodStart, query.periodEnd),
    findOverlappingHandover(tenantId, employee.id, query.periodStart, query.periodEnd),
  ]);
  return {
    employeeId: employee.id,
    expectedAmount,
    periodAlreadySubmitted: Boolean(overlapping),
    payments: payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      method: payment.method,
      paidAt: payment.paidAt,
      bookingNumber: payment.Booking?.bookingNumber ?? null,
      customerName: payment.Booking?.Customer?.name ?? null,
    })),
  };
};

const getById = async (tenantId, id) => {
  const handover = await CashHandover.findByPk(id, { include: DETAIL_INCLUDES });
  return assertTenantOwnership(handover, tenantId);
};

const create = async (tenantId, user, data) => {
  const employee = await resolveEmployee(tenantId, data.employeeId);

  // A handover already covers this employee for any day in [periodStart,
  // periodEnd] — block a second submission for the same period so the same
  // days can't be handed over (and reconciled) twice.
  const overlapping = await findOverlappingHandover(tenantId, employee.id, data.periodStart, data.periodEnd);
  if (overlapping) {
    throw ApiError.conflict('A cash handover has already been submitted for this period');
  }

  let branchId = data.branchId;
  if (branchId) {
    const branch = await Branch.findByPk(branchId);
    assertTenantOwnership(branch, tenantId);
  } else {
    branchId = employee.branchId;
  }

  const { expectedAmount, payments } = await computeExpectedAmount(tenantId, employee.id, data.periodStart, data.periodEnd);
  const variance = Number(data.declaredAmount) - expectedAmount;

  const handover = await sequelize.transaction(async (t) => {
    const created = await CashHandover.create(
      {
        tenantId,
        branchId,
        employeeId: employee.id,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        expectedAmount,
        declaredAmount: data.declaredAmount,
        variance,
        status: 'submitted',
        notes: data.notes,
        submittedBy: user.id,
        submittedAt: new Date(),
      },
      { transaction: t }
    );

    // Mark the payments that made up `expectedAmount` as handed over, so
    // they aren't counted again in a future handover's `expectedAmount`.
    if (payments.length) {
      await Payment.update(
        { cashHandoverId: created.id },
        { where: { id: { [Op.in]: payments.map((payment) => payment.id) } }, transaction: t }
      );
    }

    return created;
  });

  return getById(tenantId, handover.id);
};

const list = async (tenantId, query = {}) => {
  const { page, limit, offset, order } = parsePagination(query);
  const where = withTenantScope(tenantId, {});

  if (query.employeeId) where.employeeId = query.employeeId;
  if (query.branchId) where.branchId = query.branchId;
  if (query.status) where.status = query.status;

  // Date range filter — include any handover whose period overlaps
  // [startDate, endDate].
  if (query.startDate) where.periodEnd = { ...where.periodEnd, [Op.gte]: query.startDate };
  if (query.endDate) {
    const exclusiveEnd = new Date(query.endDate);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    where.periodStart = { ...where.periodStart, [Op.lt]: exclusiveEnd };
  }

  // Free-text search across employee name, branch name, and notes —
  // resolved to id sets up front to avoid cross-association `$nested$`
  // where-references.
  if (query.search) {
    const like = { [Op.like]: `%${query.search}%` };
    const matchingEmployees = await Employee.findAll({
      where: withTenantScope(tenantId, { [Op.or]: [{ firstName: like }, { lastName: like }] }),
      attributes: ['id'],
      paranoid: false,
    });
    const employeeIds = matchingEmployees.map((e) => e.id);
    const matchingBranches = await Branch.findAll({
      where: withTenantScope(tenantId, { name: like }),
      attributes: ['id'],
      paranoid: false,
    });
    const branchIds = matchingBranches.map((b) => b.id);

    where[Op.or] = [
      { notes: like },
      { reviewNotes: like },
      ...(employeeIds.length ? [{ employeeId: { [Op.in]: employeeIds } }] : []),
      ...(branchIds.length ? [{ branchId: { [Op.in]: branchIds } }] : []),
    ];
  }

  const { rows, count } = await CashHandover.findAndCountAll({
    where,
    include: DETAIL_INCLUDES,
    limit,
    offset,
    order: order || [['periodStart', 'DESC']],
    distinct: true,
  });

  // `findAll` (not `findOne`) — on MSSQL, `findOne` adds an
  // `ORDER BY [id] OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY` clause, which SQL
  // Server rejects for an aggregate query with no GROUP BY (`id` isn't
  // aggregated). `findAll` without limit/offset emits no such clause, and
  // the aggregate naturally returns a single row.
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

  return {
    items: rows,
    meta: buildPaginationMeta({ page, limit, count }),
    totals: {
      count: Number(totalsRow?.count ?? 0),
      totalExpected: Number(totalsRow?.totalExpected ?? 0),
      totalDeclared: Number(totalsRow?.totalDeclared ?? 0),
      totalVariance: Number(totalsRow?.totalVariance ?? 0),
    },
  };
};

const review = async (tenantId, user, id, data) => {
  const handover = await CashHandover.findByPk(id);
  assertTenantOwnership(handover, tenantId);

  if (handover.status !== 'submitted') {
    throw ApiError.conflict('This cash handover has already been reviewed');
  }

  await handover.update({
    status: data.status,
    reviewNotes: data.reviewNotes,
    reconciledBy: user.id,
    reconciledAt: new Date(),
  });

  return getById(tenantId, id);
};

module.exports = { preview, getById, create, list, review };
