const express = require('express');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { getReport } = require('../controllers/commission.controller');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

router.get('/', requirePermission('employees.manage'), getReport);

module.exports = router;
