const express = require('express');

const controller = require('../controllers/teamPerformanceReport.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { getPerformanceSchema } = require('../validators/teamPerformanceReport.validators');

const router = express.Router();
router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /team-performance-report:
 *   get:
 *     tags: [Reports]
 *     summary: Consolidated team performance report
 *     description: >
 *       One row per team that was actually dispatched (via the "assign team"
 *       shortcut) in the period: bookings touched, services assigned,
 *       completed assignments, revenue from completed work, average customer
 *       satisfaction and average service duration. Only assignments tagged
 *       with a team count — this is forward-looking from when team tagging
 *       shipped. Requires `reports.view`.
 *     parameters:
 *       - name: startDate
 *         in: query
 *         schema: { type: string, format: date }
 *       - name: endDate
 *         in: query
 *         schema: { type: string, format: date }
 *       - name: branchId
 *         in: query
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Team performance report
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requirePermission('reports.view'), validate(getPerformanceSchema), controller.getPerformance);

module.exports = router;
