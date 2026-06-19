'use strict';

const express = require('express');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const ctrl = require('../controllers/reviews.controller');

const router = express.Router();

// Tenant-scoped review viewing
router.use(authenticate, requirePasswordChanged, resolveTenant);
router.get('/', requirePermission('bookings.view'), ctrl.list);
router.get('/summary', requirePermission('bookings.view'), ctrl.getSummary);

module.exports = router;
