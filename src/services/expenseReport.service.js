const { Op } = require('sequelize');
const { Expense, ExpenseCategory, Branch } = require('../models');
const { withTenantScope } = require('../utils/tenantScope');

const TREND_MONTHS = 6;

const toDateStr = (d) => d.toISOString().split('T')[0];

const getPeriod = (query) => {
  const now = new Date();

  const endInput = query.endDate ? new Date(query.endDate) : now;
  const endDate = new Date(Date.UTC(endInput.getUTCFullYear(), endInput.getUTCMonth(), endInput.getUTCDate()));

  const startInput = query.startDate ? new Date(query.startDate) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = new Date(Date.UTC(startInput.getUTCFullYear(), startInput.getUTCMonth(), startInput.getUTCDate()));

  return { startDate, endDate };
};

const getExpenseReport = async (tenantId, query) => {
  const { startDate, endDate } = getPeriod(query);
  const { branchId } = query;

  // -- expenses for the selected period --
  const periodWhere = { expenseDate: { [Op.gte]: toDateStr(startDate), [Op.lte]: toDateStr(endDate) } };
  if (branchId) periodWhere.branchId = branchId;

  const expenses = await Expense.findAll({
    where: withTenantScope(tenantId, periodWhere),
    include: [
      { model: Branch, attributes: ['id', 'name'] },
      { model: ExpenseCategory, attributes: ['id', 'name'] },
    ],
  });

  let totalExpenses = 0;
  expenses.forEach((e) => {
    totalExpenses += Number(e.amount);
  });
  const expenseCount = expenses.length;
  const avgExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

  // -- by category --
  const catMap = new Map();
  expenses.forEach((e) => {
    const catId = e.categoryId ?? '__none__';
    const catName = e.ExpenseCategory?.name ?? 'Uncategorized';
    if (!catMap.has(catId)) {
      catMap.set(catId, { categoryId: catId === '__none__' ? null : catId, categoryName: catName, total: 0, count: 0 });
    }
    const s = catMap.get(catId);
    s.total += Number(e.amount);
    s.count += 1;
  });
  const expensesByCategory = [...catMap.values()].sort((a, b) => b.total - a.total);

  // -- by branch --
  const branchMap = new Map();
  expenses.forEach((e) => {
    const brId = e.branchId ?? '__none__';
    const brName = e.Branch?.name ?? 'No branch';
    if (!branchMap.has(brId)) {
      branchMap.set(brId, { branchId: brId === '__none__' ? null : brId, branchName: brName, total: 0, count: 0 });
    }
    const s = branchMap.get(brId);
    s.total += Number(e.amount);
    s.count += 1;
  });
  const expensesByBranch = [...branchMap.values()].sort((a, b) => b.total - a.total);

  // -- expense trend: last TREND_MONTHS calendar months, independent of the period filter --
  const trendStart = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - (TREND_MONTHS - 1), 1));
  const trendWhere = { expenseDate: { [Op.gte]: toDateStr(trendStart), [Op.lte]: toDateStr(endDate) } };
  if (branchId) trendWhere.branchId = branchId;

  const trendExpenses = await Expense.findAll({
    where: withTenantScope(tenantId, trendWhere),
    attributes: ['amount', 'expenseDate'],
    raw: true,
  });

  const trendMap = new Map();
  for (let i = 0; i < TREND_MONTHS; i += 1) {
    const d = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - (TREND_MONTHS - 1) + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    trendMap.set(key, { month: key, total: 0, count: 0 });
  }
  trendExpenses.forEach((e) => {
    const key = String(e.expenseDate).substring(0, 7);
    const entry = trendMap.get(key);
    if (entry) {
      entry.total += Number(e.amount);
      entry.count += 1;
    }
  });
  const expenseTrend = [...trendMap.values()];

  return {
    period: { startDate, endDate },
    summary: { totalExpenses, expenseCount, avgExpense },
    expenseTrend,
    expensesByCategory,
    expensesByBranch,
  };
};

module.exports = { getExpenseReport };
