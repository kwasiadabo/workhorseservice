'use strict';

const { Subscription, Plan } = require('../models');

// Whether the tenant's current (trialing or paid) plan includes a feature key,
// e.g. tenantHasFeature(tenantId, 'sms'). Plan.features is a JSON-stringified
// array seeded per plan (see 20260617000001-seed-plans-v2.js).
const tenantHasFeature = async (tenantId, key) => {
  const subscription = await Subscription.findOne({
    where: { tenantId, status: ['trialing', 'active'] },
    include: [{ model: Plan, as: 'plan', attributes: ['features'] }],
  });

  if (!subscription?.plan?.features) return false;

  try {
    const features = JSON.parse(subscription.plan.features);
    return Array.isArray(features) && features.includes(key);
  } catch {
    return false;
  }
};

module.exports = { tenantHasFeature };
