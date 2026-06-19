const asyncHandler = require('../utils/asyncHandler');
const subscriptionsService = require('../services/subscriptions.service');

const get = asyncHandler(async (req, res) => {
  const sub = await subscriptionsService.getForTenant(req.tenantId);
  res.json({ success: true, data: sub });
});

const activate = asyncHandler(async (req, res) => {
  const { planId, billingCycle } = req.body;
  const result = await subscriptionsService.activate(req.tenantId, { planId, billingCycle });
  res.json({ success: true, data: result });
});

const initializePayment = asyncHandler(async (req, res) => {
  const { planId, billingCycle } = req.body;
  const result = await subscriptionsService.initializePayment(req.tenantId, { planId, billingCycle });
  res.json({ success: true, data: result });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.body;
  const result = await subscriptionsService.verifyAndActivate(req.tenantId, { reference });
  res.json({ success: true, data: result });
});

// Webhook handler — must always respond 200; errors are caught internally in the service
const handleWebhook = asyncHandler(async (req, res) => {
  await subscriptionsService.handleWebhookEvent(req.body);
  res.status(200).json({ received: true });
});

module.exports = { get, activate, initializePayment, verifyPayment, handleWebhook };
