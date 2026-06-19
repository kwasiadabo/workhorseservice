const express = require('express');

const controller = require('../controllers/payments.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema } = require('../validators/common.validators');
const { createPaymentSchema, listPaymentsSchema } = require('../validators/payments.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /payments:
 *   get:
 *     tags: [Payments]
 *     summary: List payments
 *     description: >
 *       Requires `payments.view`. Default order by `paidAt DESC`. `meta.totals`
 *       reflects the full filtered result set (not just the current page):
 *       `{ count, totalAmount }`.
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - name: search
 *         in: query
 *         description: Matches `referenceNumber`, `notes`, the booking number, or the customer name.
 *         schema: { type: string }
 *       - name: bookingId
 *         in: query
 *         schema: { type: string, format: uuid }
 *       - name: employeeId
 *         in: query
 *         description: Filter to payments received by this service provider (resolved via their linked user account).
 *         schema: { type: string, format: uuid }
 *       - name: startDate
 *         in: query
 *         description: Only include payments paid on or after this date.
 *         schema: { type: string, format: date }
 *       - name: endDate
 *         in: query
 *         description: Only include payments paid on or before this date (inclusive of the whole day).
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Paginated list of payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Payment' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requirePermission('payments.view'), validate(listPaymentsSchema), controller.list);

/**
 * @swagger
 * /payments:
 *   post:
 *     tags: [Payments]
 *     summary: Record a payment
 *     description: >
 *       Requires `payments.create`. `bookingId` is verified to belong to the
 *       tenant. `receivedBy` is set
 *       to the current user automatically. `status` defaults to `completed`
 *       (no external payment gateway in the MVP — this records payments
 *       already collected offline/in-person). `amount` must be greater than
 *       or equal to the booking's remaining balance
 *       (`totalAmount` − sum of existing `completed` payments) — partial
 *       payments that would leave a balance are rejected with `400`. A
 *       booking automatically moves to `completed` once a payment brings the
 *       total paid to (or above) `totalAmount`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentInput'
 *     responses:
 *       201:
 *         description: Payment recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Payment' }
 *       400:
 *         description: >
 *           Validation error, or `amount` is less than the booking's
 *           remaining balance.
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: '`bookingId` does not belong to the tenant'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: This booking is already fully paid.
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/', requirePermission('payments.create'), validate(createPaymentSchema), controller.create);

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get a payment by ID
 *     description: Requires `payments.view`.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Payment found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Payment' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', requirePermission('payments.view'), validate({ params: idParamSchema }), controller.getById);

module.exports = router;
