const express = require('express');

const controller = require('../controllers/cashHandovers.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const ApiError = require('../utils/ApiError');
const { idParamSchema } = require('../validators/common.validators');
const {
  createCashHandoverSchema,
  listCashHandoversSchema,
  previewCashHandoverSchema,
  reviewCashHandoverSchema,
} = require('../validators/cashHandovers.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

// Either of these permissions grants read/submit access.
const requireCashHandoverAccess = (req, res, next) => {
  const perms = req.user.permissions;
  if (perms.includes('cash_handovers.view') || perms.includes('cash_handovers.manage')) {
    return next();
  }
  return next(ApiError.forbidden('You do not have permission to perform this action'));
};

/**
 * @swagger
 * /cash-handovers:
 *   get:
 *     tags: [Cash Handovers]
 *     summary: List cash handovers
 *     description: >
 *       Requires `cash_handovers.view` or `cash_handovers.manage`. May filter
 *       by `employeeId`, `branchId`, `status`. Default order by
 *       `periodStart DESC`. `meta.totals` reflects the full filtered result
 *       set (not just the current page):
 *       `{ count, totalExpected, totalDeclared, totalVariance }`.
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - name: search
 *         in: query
 *         description: Matches employee name, branch name, submission notes, or review notes.
 *         schema: { type: string }
 *       - name: employeeId
 *         in: query
 *         schema: { type: string, format: uuid }
 *       - name: branchId
 *         in: query
 *         schema: { type: string, format: uuid }
 *       - name: status
 *         in: query
 *         schema: { type: string, enum: [submitted, reconciled, disputed] }
 *       - name: startDate
 *         in: query
 *         description: Only include handovers whose period overlaps on or after this date.
 *         schema: { type: string, format: date }
 *       - name: endDate
 *         in: query
 *         description: Only include handovers whose period overlaps on or before this date (inclusive of the whole day).
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Paginated list of cash handovers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/CashHandover' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requireCashHandoverAccess, validate(listCashHandoversSchema), controller.list);

/**
 * @swagger
 * /cash-handovers/preview:
 *   get:
 *     tags: [Cash Handovers]
 *     summary: Preview the expected amount and pending payments for a period before submitting
 *     description: >
 *       Requires `cash_handovers.view` or `cash_handovers.manage`.
 *       `employeeId` is required. Returns that employee's `completed`
 *       payments (`Payment.receivedBy`) with `paidAt` in
 *       `[periodStart, periodEnd]` that haven't already been included in a
 *       previous handover (`payments`), their sum (`expectedAmount`), and
 *       whether this period overlaps a handover already submitted for this
 *       employee (`periodAlreadySubmitted`) — submitting in that case would
 *       be rejected with `409`.
 *     parameters:
 *       - name: employeeId
 *         in: query
 *         schema: { type: string, format: uuid }
 *       - name: periodStart
 *         in: query
 *         required: true
 *         schema: { type: string, format: date-time }
 *       - name: periodEnd
 *         in: query
 *         required: true
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Expected amount for the period
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/CashHandoverPreview' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/preview', requireCashHandoverAccess, validate(previewCashHandoverSchema), controller.preview);

/**
 * @swagger
 * /cash-handovers:
 *   post:
 *     tags: [Cash Handovers]
 *     summary: Submit a cash handover for a period
 *     description: >
 *       Requires `cash_handovers.view` or `cash_handovers.manage`.
 *       `employeeId` is required. `expectedAmount` is computed server-side as
 *       the sum of that employee's `completed` payments with `paidAt` in
 *       `[periodStart, periodEnd]` that haven't already been included in a
 *       previous handover; those payments are then stamped with this
 *       handover's id (`Payment.cashHandoverId`) so they can't be counted
 *       again. `variance` is also computed server-side. Status starts as
 *       `submitted`. Rejected with `409` if this employee already has a
 *       handover (any status) whose period overlaps
 *       `[periodStart, periodEnd]` — use `GET /cash-handovers/preview` first
 *       to check `periodAlreadySubmitted`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCashHandoverInput'
 *     responses:
 *       201:
 *         description: Cash handover submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/CashHandover' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: A cash handover has already been submitted for this period.
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/', requireCashHandoverAccess, validate(createCashHandoverSchema), controller.create);

/**
 * @swagger
 * /cash-handovers/{id}:
 *   get:
 *     tags: [Cash Handovers]
 *     summary: Get a cash handover by ID
 *     description: Requires `cash_handovers.view` or `cash_handovers.manage`.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Cash handover found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/CashHandover' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', requireCashHandoverAccess, validate({ params: idParamSchema }), controller.getById);

/**
 * @swagger
 * /cash-handovers/{id}/review:
 *   patch:
 *     tags: [Cash Handovers]
 *     summary: Reconcile or dispute a submitted cash handover
 *     description: >
 *       Requires `cash_handovers.manage`. Only `submitted` handovers can be
 *       reviewed — reviewing an already-reviewed handover returns `409`.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewCashHandoverInput'
 *     responses:
 *       200:
 *         description: Cash handover reviewed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/CashHandover' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: This cash handover has already been reviewed.
 *         $ref: '#/components/responses/Conflict'
 */
router.patch(
  '/:id/review',
  requirePermission('cash_handovers.manage'),
  validate({ params: idParamSchema, ...reviewCashHandoverSchema }),
  controller.review
);

module.exports = router;
