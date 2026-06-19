const express = require('express');

const controller = require('../controllers/paymentsReport.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { getOverviewSchema } = require('../validators/reports.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /payments-report:
 *   get:
 *     tags: [Payments]
 *     summary: Payments analytics report
 *     description: >
 *       Returns aggregated payment analytics for the tenant (or a single branch).
 *       Requires `reports.view` — accessible to `tenant_owner` and `manager`.
 *     parameters:
 *       - name: startDate
 *         in: query
 *         description: Start of the reporting period (inclusive, date). Defaults to 30 days before endDate.
 *         schema: { type: string, format: date }
 *       - name: endDate
 *         in: query
 *         description: End of the reporting period (inclusive, date). Defaults to today.
 *         schema: { type: string, format: date }
 *       - name: branchId
 *         in: query
 *         description: Restrict results to a single branch.
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payments analytics report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         startDate: { type: string, format: date-time }
 *                         endDate: { type: string, format: date-time }
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRevenue: { type: number }
 *                         paymentCount: { type: integer }
 *                         avgPayment: { type: number }
 *                     revenueTrend:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month: { type: string, example: '2026-06' }
 *                           total: { type: number }
 *                           count: { type: integer }
 *                     byMethod:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           method: { type: string }
 *                           total: { type: number }
 *                           count: { type: integer }
 *                     byBranch:
 *                       type: array
 *                       items:
 *                         type: object
 *                     topCustomers:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requirePermission('reports.view'), validate(getOverviewSchema), controller.getReport);

module.exports = router;
