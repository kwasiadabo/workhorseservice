const express = require('express');

const controller = require('../controllers/expenses.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema } = require('../validators/common.validators');
const {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesSchema,
} = require('../validators/expenses.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /expenses:
 *   get:
 *     tags: [Expenses]
 *     summary: List expenses
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - name: branchId
 *         in: query
 *         description: Filter by branch
 *         schema: { type: string, format: uuid }
 *       - name: categoryId
 *         in: query
 *         description: Filter by expense category
 *         schema: { type: string, format: uuid }
 *       - name: startDate
 *         in: query
 *         description: Only include expenses with expenseDate on or after this date
 *         schema: { type: string, format: date }
 *       - name: endDate
 *         in: query
 *         description: Only include expenses with expenseDate on or before this date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Paginated list of expenses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Expense' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requirePermission('expenses.view'), validate(listExpensesSchema), controller.list);

/**
 * @swagger
 * /expenses:
 *   post:
 *     tags: [Expenses]
 *     summary: Record a new expense
 *     description: >
 *       `recordedBy` is set server-side from the authenticated user and
 *       cannot be supplied in the request body. `categoryId` must reference
 *       an `ExpenseCategory` belonging to the tenant; `branchId`, if
 *       provided, must reference a `Branch` belonging to the tenant.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExpenseInput'
 *     responses:
 *       201:
 *         description: Expense created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Expense' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/', requirePermission('expenses.manage'), validate(createExpenseSchema), controller.create);

/**
 * @swagger
 * /expenses/{id}:
 *   get:
 *     tags: [Expenses]
 *     summary: Get an expense by ID
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Expense found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Expense' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', requirePermission('expenses.view'), validate({ params: idParamSchema }), controller.getById);

/**
 * @swagger
 * /expenses/{id}:
 *   patch:
 *     tags: [Expenses]
 *     summary: Update an expense
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExpenseInput'
 *     responses:
 *       200:
 *         description: Expense updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Expense' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  '/:id',
  requirePermission('expenses.manage'),
  validate({ params: idParamSchema, ...updateExpenseSchema }),
  controller.update
);

/**
 * @swagger
 * /expenses/{id}:
 *   delete:
 *     tags: [Expenses]
 *     summary: Delete an expense
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       204:
 *         $ref: '#/components/responses/NoContent'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/:id',
  requirePermission('expenses.manage'),
  validate({ params: idParamSchema }),
  controller.remove
);

module.exports = router;
