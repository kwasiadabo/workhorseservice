const express = require('express');

const controller = require('../controllers/expenseReport.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { getOverviewSchema } = require('../validators/reports.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /expense-report:
 *   get:
 *     tags: [Expenses]
 *     summary: Expense analytics report
 *     description: >
 *       Returns aggregated expense analytics for the tenant (or a single branch).
 *       Requires `expenses.view` — accessible to `tenant_owner` and `manager`.
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
 *         description: Expense analytics report
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
 *                         totalExpenses: { type: number }
 *                         expenseCount: { type: integer }
 *                         avgExpense: { type: number }
 *                     expenseTrend:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month: { type: string, example: '2026-06' }
 *                           total: { type: number }
 *                           count: { type: integer }
 *                     expensesByCategory:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           categoryId: { type: string, format: uuid, nullable: true }
 *                           categoryName: { type: string }
 *                           total: { type: number }
 *                           count: { type: integer }
 *                     expensesByBranch:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           branchId: { type: string, format: uuid, nullable: true }
 *                           branchName: { type: string }
 *                           total: { type: number }
 *                           count: { type: integer }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requirePermission('expenses.view'), validate(getOverviewSchema), controller.getReport);

module.exports = router;
