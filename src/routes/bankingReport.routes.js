const express = require('express');
const controller = require('../controllers/bankingReport.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate, requirePasswordChanged, resolveTenant);

router.get('/', requirePermission('banking.view'), controller.getReport);

module.exports = router;
