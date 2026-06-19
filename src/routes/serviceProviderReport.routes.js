const express = require('express');

const controller = require('../controllers/serviceProviderReport.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { getPerformanceSchema, getAssignmentsSchema } = require('../validators/serviceProviderReport.validators');

const router = express.Router();
router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /service-provider-report:
 *   get:
 *     tags: [Reports]
 *     summary: Consolidated service-provider performance report
 *     description: >
 *       One row per service provider for the period: bookings touched, services
 *       assigned, completed assignments, revenue from completed work, average
 *       customer satisfaction and average service duration. Requires `reports.view`.
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
 *         description: Service-provider performance report
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requirePermission('reports.view'), validate(getPerformanceSchema), controller.getPerformance);

/**
 * @swagger
 * /service-provider-report/assignments:
 *   get:
 *     tags: [Reports]
 *     summary: Services assigned to one service provider over a date range
 *     description: >
 *       Paginated, newest-first list of every service assignment for the given
 *       `employeeId` within the period. Requires `reports.view`.
 *     parameters:
 *       - name: employeeId
 *         in: query
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: startDate
 *         in: query
 *         schema: { type: string, format: date }
 *       - name: endDate
 *         in: query
 *         schema: { type: string, format: date }
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Service-provider assignment list
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/assignments', requirePermission('reports.view'), validate(getAssignmentsSchema), controller.getAssignments);

module.exports = router;
