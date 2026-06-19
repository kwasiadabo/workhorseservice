'use strict';

const express = require('express');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const ctrl = require('../controllers/loyalty.controller');

const router = express.Router();
router.use(authenticate, requirePasswordChanged, resolveTenant);

// Settings — managers/owners only
router.get('/settings', requirePermission('customers.manage'), ctrl.getSettings);
router.put('/settings', requirePermission('customers.manage'), ctrl.updateSettings);

// Points leaderboard / list
router.get('/customers', requirePermission('customers.view'), ctrl.listCustomerPoints);

// Redeem points for a specific customer
router.post('/customers/:customerId/redeem', requirePermission('customers.manage'), ctrl.redeemPoints);

module.exports = router;
