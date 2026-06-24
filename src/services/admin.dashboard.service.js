const { Op } = require('sequelize');
const { sequelize, Tenant, Plan, Subscription, Notification, Booking } = require('../models');

const TENANT_STATUSES = ['trial', 'active', 'suspended', 'cancelled'];
const SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due', 'cancelled', 'expired'];
const TREND_MONTHS = 6;
const EXPIRY_WINDOW_DAYS = 30;
const TOP_N = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfMonthUTC = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const monthKey = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

// Zero-filled map of the last TREND_MONTHS calendar months (oldest first),
// matching the bucketing idiom in reports.service.js#getOverview.
const buildMonthBuckets = (now) => {
  const map = new Map();
  for (let i = 0; i < TREND_MONTHS; i += 1) {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (TREND_MONTHS - 1) + i, 1));
    map.set(monthKey(monthDate), { month: monthKey(monthDate), count: 0 });
  }
  return map;
};

const daysLeft = (target, now) => Math.ceil((new Date(target).getTime() - now.getTime()) / DAY_MS);

const monthlyAmount = (subscription) => {
  const plan = subscription.plan;
  if (!plan) return 0;
  return subscription.billingCycle === 'yearly' ? Number(plan.priceYearly) / 12 : Number(plan.priceMonthly);
};

const getOverview = async () => {
  const now = new Date();
  const trendStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (TREND_MONTHS - 1), 1));
  const monthStart = startOfMonthUTC(now);
  const in30Days = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * DAY_MS);

  // ── Tenants ──────────────────────────────────────────────────────────────
  const [tenantTotal, tenantStatusRows, newTenants] = await Promise.all([
    Tenant.count(),
    Tenant.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),
    Tenant.findAll({
      where: { createdAt: { [Op.gte]: trendStart } },
      attributes: ['createdAt'],
      raw: true,
    }),
  ]);

  const tenantByStatus = Object.fromEntries(TENANT_STATUSES.map((s) => [s, 0]));
  tenantStatusRows.forEach((row) => { tenantByStatus[row.status] = Number(row.count); });

  const tenantTrendMap = buildMonthBuckets(now);
  newTenants.forEach((t) => {
    const entry = tenantTrendMap.get(monthKey(new Date(t.createdAt)));
    if (entry) entry.count += 1;
  });

  // ── Subscriptions ────────────────────────────────────────────────────────
  const [subscriptionStatusRows, billableSubscriptions, expiringTrialTenants, expiringSubscriptions] = await Promise.all([
    Subscription.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),
    Subscription.findAll({
      where: { status: ['active', 'past_due'] },
      include: [{ model: Plan, as: 'plan', attributes: ['id', 'name', 'priceMonthly', 'priceYearly'] }],
    }),
    Tenant.findAll({
      where: { status: 'trial', trialEndsAt: { [Op.between]: [now, in30Days] } },
      attributes: ['id', 'name', 'trialEndsAt'],
      order: [['trialEndsAt', 'ASC']],
      limit: TOP_N * 2,
      raw: true,
    }),
    Subscription.findAll({
      where: {
        status: ['active', 'past_due'],
        [Op.or]: [{ currentPeriodEnd: { [Op.between]: [now, in30Days] } }, { cancelAtPeriodEnd: true }],
      },
      include: [
        { model: Tenant, attributes: ['id', 'name'] },
        { model: Plan, as: 'plan', attributes: ['id', 'name'] },
      ],
      order: [['currentPeriodEnd', 'ASC']],
      limit: TOP_N * 2,
    }),
  ]);

  const subscriptionByStatus = Object.fromEntries(SUBSCRIPTION_STATUSES.map((s) => [s, 0]));
  subscriptionStatusRows.forEach((row) => { subscriptionByStatus[row.status] = Number(row.count); });

  let mrr = 0;
  const mrrByPlanMap = new Map();
  billableSubscriptions.forEach((subscription) => {
    const amount = monthlyAmount(subscription);
    mrr += amount;
    const planName = subscription.plan?.name ?? 'No plan';
    if (!mrrByPlanMap.has(planName)) mrrByPlanMap.set(planName, { planName, mrr: 0, tenantCount: 0 });
    const entry = mrrByPlanMap.get(planName);
    entry.mrr += amount;
    entry.tenantCount += 1;
  });
  const mrrByPlan = [...mrrByPlanMap.values()].sort((a, b) => b.mrr - a.mrr);

  const expiringTrials = expiringTrialTenants.map((tenant) => ({
    tenantId: tenant.id,
    tenantName: tenant.name,
    trialEndsAt: tenant.trialEndsAt,
    daysLeft: daysLeft(tenant.trialEndsAt, now),
  }));

  const expiringSubscriptionsList = expiringSubscriptions.map((subscription) => ({
    tenantId: subscription.Tenant?.id,
    tenantName: subscription.Tenant?.name,
    planName: subscription.plan?.name ?? 'No plan',
    currentPeriodEnd: subscription.currentPeriodEnd,
    daysLeft: daysLeft(subscription.currentPeriodEnd, now),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  }));

  // ── SMS usage ────────────────────────────────────────────────────────────
  const [smsThisMonthRows, smsTrendRows, smsByTenantRows] = await Promise.all([
    Notification.count({ where: { channel: 'sms', status: 'sent', sentAt: { [Op.gte]: monthStart } } }),
    Notification.findAll({
      where: { channel: 'sms', status: 'sent', sentAt: { [Op.gte]: trendStart } },
      attributes: ['sentAt'],
      raw: true,
    }),
    Notification.findAll({
      where: { channel: 'sms', status: 'sent', sentAt: { [Op.gte]: monthStart } },
      attributes: ['tenantId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['tenantId'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: TOP_N,
      raw: true,
    }),
  ]);

  const smsTrendMap = buildMonthBuckets(now);
  smsTrendRows.forEach((row) => {
    const entry = smsTrendMap.get(monthKey(new Date(row.sentAt)));
    if (entry) entry.count += 1;
  });

  const smsTenantIds = smsByTenantRows.map((row) => row.tenantId);
  const smsTenants = smsTenantIds.length
    ? await Tenant.findAll({
        where: { id: smsTenantIds },
        attributes: ['id', 'name'],
        include: [{ model: Plan, attributes: ['smsMonthlyLimit'] }],
        raw: true,
      })
    : [];
  const smsTenantMap = new Map(smsTenants.map((t) => [t.id, t]));

  const smsByTenant = smsByTenantRows.map((row) => {
    const tenant = smsTenantMap.get(row.tenantId);
    const limit = tenant?.['Plan.smsMonthlyLimit'] ?? null;
    const count = Number(row.count);
    return {
      tenantId: row.tenantId,
      tenantName: tenant?.name ?? 'Unknown tenant',
      count,
      limit,
      percentUsed: limit ? Math.round((count / limit) * 100) : null,
    };
  });

  // ── Booking trend ────────────────────────────────────────────────────────
  const [bookingsThisMonth, bookingTrendRows, bookingStatusRows, bookingTopTenantRows] = await Promise.all([
    Booking.count({ where: { scheduledAt: { [Op.gte]: monthStart } } }),
    Booking.findAll({
      where: { scheduledAt: { [Op.gte]: trendStart } },
      attributes: ['scheduledAt'],
      raw: true,
    }),
    Booking.findAll({
      where: { scheduledAt: { [Op.gte]: monthStart } },
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),
    Booking.findAll({
      where: { scheduledAt: { [Op.gte]: monthStart } },
      attributes: ['tenantId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['tenantId'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: TOP_N,
      raw: true,
    }),
  ]);

  const bookingTrendMap = buildMonthBuckets(now);
  bookingTrendRows.forEach((row) => {
    const entry = bookingTrendMap.get(monthKey(new Date(row.scheduledAt)));
    if (entry) entry.count += 1;
  });

  const bookingByStatus = bookingStatusRows.map((row) => ({ status: row.status, count: Number(row.count) }));

  const bookingTenantIds = bookingTopTenantRows.map((row) => row.tenantId);
  const bookingTenants = bookingTenantIds.length
    ? await Tenant.findAll({ where: { id: bookingTenantIds }, attributes: ['id', 'name'], raw: true })
    : [];
  const bookingTenantMap = new Map(bookingTenants.map((t) => [t.id, t.name]));
  const bookingTopTenants = bookingTopTenantRows.map((row) => ({
    tenantId: row.tenantId,
    tenantName: bookingTenantMap.get(row.tenantId) ?? 'Unknown tenant',
    count: Number(row.count),
  }));

  return {
    tenants: {
      total: tenantTotal,
      byStatus: tenantByStatus,
      trend: [...tenantTrendMap.values()],
    },
    subscriptions: {
      byStatus: subscriptionByStatus,
      mrr,
      arr: mrr * 12,
      mrrByPlan,
      expiringTrials,
      expiringSubscriptions: expiringSubscriptionsList,
    },
    sms: {
      totalThisMonth: smsThisMonthRows,
      trend: [...smsTrendMap.values()],
      byTenant: smsByTenant,
    },
    bookings: {
      totalThisMonth: bookingsThisMonth,
      trend: [...bookingTrendMap.values()],
      byStatus: bookingByStatus,
      topTenants: bookingTopTenants,
    },
  };
};

module.exports = { getOverview };
