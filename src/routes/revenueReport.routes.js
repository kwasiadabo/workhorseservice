const express = require('express');

const controller = require('../controllers/revenueReport.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { getRevenueReportSchema } = require('../validators/revenueReport.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

router.get('/', requirePermission('reports.view'), validate(getRevenueReportSchema), controller.getReport);

module.exports = router;
