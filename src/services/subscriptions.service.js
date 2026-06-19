const { Tenant, Subscription, Plan, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const paystack = require('../utils/paystack');
const env = require('../config/env');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns how many unused trial days a tenant has left.
 * Never negative; capped at 30.
 */
const trialDaysUnused = (trialStartedAt) => {
  if (!trialStartedAt) return 0;
  const daysUsed = Math.ceil((Date.now() - new Date(trialStartedAt).getTime()) / MS_PER_DAY);
  return Math.max(0, 30 - daysUsed);
};

/**
 * Compute the end of the first paid billing period, crediting any unused trial days.
 * billingCycleDays: 30 for monthly, 365 for yearly.
 */
const computeCreditedEnd = (trialStartedAt, billingCycleDays) => {
  const unused = trialDaysUnused(trialStartedAt);
  return new Date(Date.now() + (billingCycleDays + unused) * MS_PER_DAY);
};

const getForTenant = async (tenantId) => {
  const sub = await Subscription.findOne({
    where: { tenantId },
    include: [{ model: Plan, as: 'plan', attributes: ['id', 'name', 'description', 'priceMonthly', 'priceYearly', 'currency', 'maxBranches', 'maxEmployees', 'maxBookingsPerMonth', 'smsMonthlyLimit', 'features'] }],
  });
  if (!sub) throw ApiError.notFound('Subscription not found');
  return sub;
};

/**
 * Activate a paid subscription for a tenant.
 * Credits any unused trial days into the first billing period.
 * billingCycle: 'monthly' (30 days) | 'yearly' (365 days)
 */
const activate = async (tenantId, { planId, billingCycle = 'monthly' }) => {
  const plan = await Plan.findOne({ where: { id: planId, isActive: true } });
  if (!plan) throw ApiError.notFound('Plan not found or inactive');

  const billingDays = billingCycle === 'yearly' ? 365 : 30;

  return sequelize.transaction(async (t) => {
    const [tenant, sub] = await Promise.all([
      Tenant.findByPk(tenantId, { transaction: t }),
      Subscription.findOne({ where: { tenantId }, transaction: t }),
    ]);

    if (!tenant) throw ApiError.notFound('Tenant not found');

    const now = new Date();
    const trialStartedAt = sub?.trialStartedAt ?? now;
    const daysUnused = trialDaysUnused(trialStartedAt);
    const periodEnd = computeCreditedEnd(trialStartedAt, billingDays);

    if (sub) {
      await sub.update({
        planId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialSkipped: daysUnused > 0,
        cancelAtPeriodEnd: false,
      }, { transaction: t });
    } else {
      await Subscription.create({
        tenantId,
        planId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialStartedAt: now,
        trialSkipped: true,
      }, { transaction: t });
    }

    await tenant.update({ status: 'active', planId }, { transaction: t });

    return { daysUnused, periodEnd };
  });
};

const initializePayment = async (tenantId, { planId, billingCycle = 'monthly' }) => {
  const plan = await Plan.findOne({ where: { id: planId, isActive: true } });
  if (!plan) throw ApiError.notFound('Plan not found or inactive');

  const amountInPesewas = Math.round(
    Number(billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly) * 100,
  );

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) throw ApiError.notFound('Tenant not found');

  // Ensure we have a Paystack customer code
  if (!tenant.paystackCustomerCode) {
    const customer = await paystack.createCustomer({
      email: tenant.email,
      firstName: tenant.name,
      lastName: '',
    });
    if (customer?.customer_code) {
      await tenant.update({ paystackCustomerCode: customer.customer_code });
    }
  }

  const reference = paystack.generateReference(tenantId);

  // Store intent on subscription row before redirecting
  let sub = await Subscription.findOne({ where: { tenantId } });
  if (sub) {
    await sub.update({ planId, paystackReference: reference, billingCycle });
  } else {
    sub = await Subscription.create({
      tenantId,
      planId,
      status: 'trialing',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * MS_PER_DAY),
      trialStartedAt: new Date(),
      paystackReference: reference,
      billingCycle,
    });
  }

  const result = await paystack.initializeTransaction({
    email: tenant.email,
    amountInPesewas,
    reference,
    callbackUrl: `${env.FRONTEND_URL}/app/subscription/callback`,
    metadata: { tenantId, planId, billingCycle },
  });

  return { authorization_url: result.authorization_url, reference };
};

const verifyAndActivate = async (tenantId, { reference }) => {
  const sub = await Subscription.findOne({ where: { tenantId } });
  if (!sub) throw ApiError.notFound('Subscription not found');

  // Idempotency — already activated with this reference
  if (sub.lastPaymentReference === reference && sub.status === 'active') {
    const plan = await Plan.findByPk(sub.planId);
    return {
      alreadyActivated: true,
      periodEnd: sub.currentPeriodEnd,
      planName: plan?.name ?? '',
      daysUnused: 0,
    };
  }

  // Reference integrity — must match what we stored during initialize
  if (sub.paystackReference !== reference) {
    throw ApiError.badRequest('Payment reference does not match the pending payment');
  }

  const paystackResult = await paystack.verifyTransaction(reference);
  if (paystackResult.status !== 'success') {
    throw ApiError.badRequest('Payment was not successful');
  }

  // Amount validation — re-read plan to prevent price manipulation
  const plan = await Plan.findByPk(sub.planId);
  if (!plan) throw ApiError.notFound('Plan not found');

  const expectedPesewas = Math.round(
    Number(sub.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly) * 100,
  );
  if (paystackResult.amount !== expectedPesewas) {
    throw ApiError.badRequest('Payment amount does not match plan price');
  }

  const authorizationCode = paystackResult.authorization?.authorization_code ?? null;

  // Activate — trial-credit logic lives here
  const { daysUnused, periodEnd } = await activate(tenantId, {
    planId: sub.planId,
    billingCycle: sub.billingCycle,
  });

  // Store authorization code and clear the pending reference
  await sub.reload();
  await sub.update({
    paystackAuthorizationCode: authorizationCode,
    lastPaymentReference: reference,
    paystackReference: null,
    billingCycle: sub.billingCycle,
  });

  return { daysUnused, periodEnd, planName: plan.name };
};

const handleWebhookEvent = async (event) => {
  try {
    const { event: eventType, data } = event;

    if (eventType === 'charge.success') {
      const tenantId = data?.metadata?.tenantId;
      if (!tenantId) return;
      await verifyAndActivate(tenantId, { reference: data.reference }).catch(() => {});
      return;
    }

    if (eventType === 'invoice.payment_failed') {
      const tenantId = data?.subscription?.metadata?.tenantId ?? data?.metadata?.tenantId;
      if (!tenantId) return;
      const sub = await Subscription.findOne({ where: { tenantId } });
      if (sub) await sub.update({ status: 'past_due' });
      const tenant = await Tenant.findByPk(tenantId);
      if (tenant) await tenant.update({ status: 'suspended' });
      return;
    }

    if (eventType === 'subscription.disable') {
      const tenantId = data?.metadata?.tenantId;
      if (!tenantId) return;
      const sub = await Subscription.findOne({ where: { tenantId } });
      if (sub) await sub.update({ status: 'cancelled' });
      const tenant = await Tenant.findByPk(tenantId);
      if (tenant) await tenant.update({ status: 'cancelled' });
    }
  } catch (err) {
    console.error('[webhook] Error handling Paystack event:', err.message);
  }
};

module.exports = {
  getForTenant,
  activate,
  trialDaysUnused,
  computeCreditedEnd,
  initializePayment,
  verifyAndActivate,
  handleWebhookEvent,
};
