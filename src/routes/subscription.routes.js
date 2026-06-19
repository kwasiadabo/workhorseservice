const express = require('express');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const subscriptionController = require('../controllers/subscription.controller');
const { activateSchema, initializePaymentSchema, verifyPaymentSchema } = require('../validators/subscription.validators');

const router = express.Router();

// All subscription routes require a valid tenant session
router.use(authenticate, requirePasswordChanged, resolveTenant);

// GET /subscription — any authenticated tenant user can view their subscription
// (skip requireActiveSubscription so expired tenants can still see the page)
router.get('/', subscriptionController.get);

// POST /subscription/activate — tenant_owner only; activates or upgrades the subscription
router.post(
  '/activate',
  requireRole('tenant_owner'),
  validate(activateSchema),
  subscriptionController.activate
);

// POST /subscription/payment/initialize — creates Paystack transaction, returns authorization_url
router.post(
  '/payment/initialize',
  requireRole('tenant_owner'),
  validate(initializePaymentSchema),
  subscriptionController.initializePayment
);

// POST /subscription/payment/verify — verifies completed payment, activates subscription
router.post(
  '/payment/verify',
  requireRole('tenant_owner'),
  validate(verifyPaymentSchema),
  subscriptionController.verifyPayment
);

module.exports = router;
