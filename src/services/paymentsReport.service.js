const { Op } = require('sequelize');
const { Payment, Booking, Branch, Customer } = require('../models');
const { withTenantScope } = require('../utils/tenantScope');

const TREND_MONTHS = 6;
const TOP_N = 10;

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

const getPaymentsReport = async (tenantId, query) => {
  const { startDate, endDate, exclusiveEnd } = getPeriod(query);
  const { branchId } = query;

  const paymentsWhere = { status: 'completed', paidAt: { [Op.gte]: startDate, [Op.lt]: exclusiveEnd } };

  const payments = await Payment.findAll({
    where: withTenantScope(tenantId, paymentsWhere),
    include: [
      {
        model: Booking,
        attributes: ['id', 'branchId'],
        ...(branchId ? { where: { branchId }, required: true } : { required: false }),
        include: [
          { model: Customer, attributes: ['id', 'name', 'phone'] },
          { model: Branch, attributes: ['id', 'name'] },
        ],
      },
    ],
  });

  let totalRevenue = 0;
  const methodMap = new Map();
  const branchRevMap = new Map();
  const customerMap = new Map();

  payments.forEach((p) => {
    const amount = Number(p.amount);
    totalRevenue += amount;

    // by payment method
    const { method } = p;
    if (!methodMap.has(method)) methodMap.set(method, { method, total: 0, count: 0 });
    methodMap.get(method).total += amount;
    methodMap.get(method).count += 1;

    // by branch (resolved through Booking.Branch)
    const branch = p.Booking?.Branch;
    if (branch) {
      if (!branchRevMap.has(branch.id)) {
        branchRevMap.set(branch.id, { branchId: branch.id, branchName: branch.name, total: 0, count: 0 });
      }
      branchRevMap.get(branch.id).total += amount;
      branchRevMap.get(branch.id).count += 1;
    }

    // top customers (resolved through Booking.Customer)
    const customer = p.Booking?.Customer;
    if (customer) {
      if (!customerMap.has(customer.id)) {
        customerMap.set(customer.id, {
          customerId: customer.id,
          name: customer.name,
          phone: customer.phone,
          totalSpent: 0,
          paymentCount: 0,
        });
      }
      customerMap.get(customer.id).totalSpent += amount;
      customerMap.get(customer.id).paymentCount += 1;
    }
  });

  const byMethod = [...methodMap.values()].sort((a, b) => b.total - a.total);
  const byBranch = [...branchRevMap.values()].sort((a, b) => b.total - a.total);
  const topCustomers = [...customerMap.values()].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, TOP_N);

  // revenue trend (last TREND_MONTHS calendar months, independent of period filter)
  const trendStart = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - (TREND_MONTHS - 1), 1));
  const trendPayments = await Payment.findAll({
    where: withTenantScope(tenantId, { status: 'completed', paidAt: { [Op.gte]: trendStart } }),
    include: branchId ? [{ model: Booking, attributes: [], where: { branchId }, required: true }] : [],
    attributes: ['amount', 'paidAt'],
    raw: true,
  });

  const trendMap = new Map();
  for (let i = 0; i < TREND_MONTHS; i += 1) {
    const d = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - (TREND_MONTHS - 1) + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    trendMap.set(key, { month: key, total: 0, count: 0 });
  }
  trendPayments.forEach((p) => {
    const d = new Date(p.paidAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const entry = trendMap.get(key);
    if (entry) {
      entry.total += Number(p.amount);
      entry.count += 1;
    }
  });
  const revenueTrend = [...trendMap.values()];

  return {
    period: { startDate, endDate },
    summary: {
      totalRevenue,
      paymentCount: payments.length,
      avgPayment: payments.length > 0 ? totalRevenue / payments.length : 0,
    },
    revenueTrend,
    byMethod,
    byBranch,
    topCustomers,
  };
};

module.exports = { getPaymentsReport };
