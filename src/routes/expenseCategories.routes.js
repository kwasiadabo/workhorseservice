const express = require('express');

const controller = require('../controllers/expenseCategories.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema } = require('../validators/common.validators');
const {
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  listExpenseCategoriesSchema,
} = require('../validators/expenseCategories.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /expense-categories:
 *   get:
 *     tags: [Expense Categories]
 *     summary: List expense categories
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Paginated list of expense categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ExpenseCategory' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requirePermission('expenses.view'), validate(listExpenseCategoriesSchema), controller.list);

/**
 * @swagger
 * /expense-categories:
 *   post:
 *     tags: [Expense Categories]
 *     summary: Create an expense category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExpenseCategoryInput'
 *     responses:
 *       201:
 *         description: Expense category created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ExpenseCategory' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', requirePermission('expenses.manage'), validate(createExpenseCategorySchema), controller.create);

/**
 * @swagger
 * /expense-categories/{id}:
 *   get:
 *     tags: [Expense Categories]
 *     summary: Get an expense category by ID
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Expense category found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ExpenseCategory' }
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
 * /expense-categories/{id}:
 *   patch:
 *     tags: [Expense Categories]
 *     summary: Update an expense category
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExpenseCategoryInput'
 *     responses:
 *       200:
 *         description: Expense category updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ExpenseCategory' }
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
  validate({ params: idParamSchema, ...updateExpenseCategorySchema }),
  controller.update
);

/**
 * @swagger
 * /expense-categories/{id}:
 *   delete:
 *     tags: [Expense Categories]
 *     summary: Delete an expense category
 *     description: Soft-delete (paranoid model) — the record is excluded from future queries.
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
