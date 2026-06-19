const express = require('express');

const controller = require('../controllers/bookings.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema, nestedIdParamSchema } = require('../validators/common.validators');
const {
  createBookingSchema,
  updateBookingSchema,
  listBookingsSchema,
  addBookingServiceSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
} = require('../validators/bookings.validators');
const ApiError = require('../utils/ApiError');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

// Any of these permissions grants read access to the bookings list/detail —
// results are filtered server-side (employees only see their own assignments).
const requireAnyBookingAccess = (req, res, next) => {
  const perms = req.user.permissions;
  if (
    perms.includes('bookings.view') ||
    perms.includes('bookings.view_own') ||
    perms.includes('bookings.create')
  ) {
    return next();
  }
  return next(ApiError.forbidden('You do not have permission to perform this action'));
};

// Adding an assignment normally requires bookings.manage, but the booking's
// creator (bookings.create) may add the initial assignment(s) — before
// anyone else has been assigned — as part of creating the booking. The
// service layer enforces the createdBy/no-existing-assignments narrowing.
const requireAssignmentCreateAccess = (req, res, next) => {
  const perms = req.user.permissions;
  if (perms.includes('bookings.manage') || perms.includes('bookings.create')) {
    return next();
  }
  return next(ApiError.forbidden('You do not have permission to perform this action'));
};

/**
 * @swagger
 * /bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: List bookings
 *     description: >
 *       Requires any of `bookings.view`, `bookings.view_own`, or
 *       `bookings.create`. Callers with only `bookings.view_own` (the
 *       `employee` role) see only bookings where their linked `Employee`
 *       record has a `BookingAssignment`.
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, in_progress, completed, cancelled, no_show]
 *       - name: branchId
 *         in: query
 *         schema: { type: string, format: uuid }
 *       - name: employeeId
 *         in: query
 *         description: >
 *           Filter to bookings with an assignment for this employee
 *           (service provider). Only effective for callers with
 *           `bookings.view` — `bookings.view_own` callers are already
 *           scoped to their own assignments.
 *         schema: { type: string, format: uuid }
 *       - name: scheduledFrom
 *         in: query
 *         description: Only include bookings scheduled on or after this date.
 *         schema: { type: string, format: date }
 *       - name: scheduledTo
 *         in: query
 *         description: Only include bookings scheduled on or before this date (inclusive of the whole day).
 *         schema: { type: string, format: date }
 *       - name: unpaidOnly
 *         in: query
 *         description: >
 *           Only include bookings that are not completed/cancelled/no_show —
 *           i.e. that still have an outstanding balance.
 *         schema: { type: boolean }
 *       - name: search
 *         in: query
 *         description: Filter by booking number or customer name (partial match).
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of bookings (default order `scheduledAt DESC`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Booking' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requireAnyBookingAccess, validate(listBookingsSchema), controller.list);

/**
 * @swagger
 * /bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a booking
 *     description: >
 *       Requires `bookings.create`. `branchId`/`customerId` must belong to the
 *       tenant. New bookings are created with `status: "confirmed"` — the
 *       customer is assumed to be present (walk-in) or already committed to
 *       the slot. Generates `bookingNumber` as `BK-<YYYYMMDD>-<NNNN>`
 *       (sequential per tenant per day) and computes `totalAmount` as
 *       Σ (service.price × quantity), snapshotting each service's
 *       `price`/`durationMinutes` into `BookingServices`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBookingInput'
 *     responses:
 *       201:
 *         description: Booking created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Booking' }
 *       400:
 *         description: Validation error, or one or more `services` were not found for this tenant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: '`branchId` or `customerId` does not belong to the tenant'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', requirePermission('bookings.create'), validate(createBookingSchema), controller.create);

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get a booking by ID
 *     description: >
 *       Requires any of `bookings.view`, `bookings.view_own`, or
 *       `bookings.create`. Returns `404` (not `403`) for `bookings.view_own`
 *       callers if their employee record has no assignment on this booking,
 *       to avoid leaking existence.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Booking found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Booking' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', requireAnyBookingAccess, validate({ params: idParamSchema }), controller.getById);

/**
 * @swagger
 * /bookings/{id}:
 *   patch:
 *     tags: [Bookings]
 *     summary: Update a booking
 *     description: >
 *       Requires `bookings.manage`. `status` can only be set manually to
 *       `cancelled` or `no_show` — every other transition (`confirmed` ->
 *       `in_progress` -> `awaiting_payment` -> `completed`) happens
 *       automatically based on assignment/payment events. `startedAt` is not
 *       client-settable — it is stamped automatically the first time `status`
 *       is set to `in_progress` (or backfilled from `scheduledAt` if a booking
 *       is marked `completed` without ever passing through `in_progress`).
 *       When `completedAt` is provided, `durationMinutes` is recalculated as
 *       `completedAt - startedAt`.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBookingInput'
 *     responses:
 *       200:
 *         description: Booking updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Booking' }
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
  requirePermission('bookings.manage'),
  validate({ params: idParamSchema, ...updateBookingSchema }),
  controller.update
);

/**
 * @swagger
 * /bookings/{id}:
 *   delete:
 *     tags: [Bookings]
 *     summary: Delete a booking
 *     description: Soft-delete. Requires `bookings.manage`.
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
  requirePermission('bookings.manage'),
  validate({ params: idParamSchema }),
  controller.remove
);

/**
 * @swagger
 * /bookings/{id}/payments:
 *   get:
 *     tags: [Bookings]
 *     summary: List payments for a booking
 *     description: Requires `payments.view`. Returns the full (unpaginated) payment history for one booking.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Payments for this booking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Payment' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/:id/payments',
  requirePermission('payments.view'),
  validate({ params: idParamSchema }),
  controller.listPayments
);

/**
 * @swagger
 * /bookings/{id}/services:
 *   post:
 *     tags: [Bookings]
 *     summary: Add a line item (service) to a booking
 *     description: >
 *       Requires `bookings.manage`. Snapshots the service's current
 *       `price`/`durationMinutes` and recalculates the booking's
 *       `totalAmount`.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddBookingServiceInput'
 *     responses:
 *       201:
 *         description: Updated booking (detail shape)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Booking' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  '/:id/services',
  requirePermission('bookings.manage'),
  validate({ params: idParamSchema, ...addBookingServiceSchema }),
  controller.addService
);

/**
 * @swagger
 * /bookings/{id}/services/{bsId}:
 *   delete:
 *     tags: [Bookings]
 *     summary: Remove a line item from a booking
 *     description: >
 *       Requires `bookings.manage`. Recalculates the booking's `totalAmount`.
 *       `404` if `bsId` doesn't belong to `id`.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *       - name: bsId
 *         in: path
 *         required: true
 *         description: BookingService (line item) UUID
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated booking (detail shape)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Booking' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/:id/services/:bsId',
  requirePermission('bookings.manage'),
  validate({ params: nestedIdParamSchema('bsId') }),
  controller.removeService
);

/**
 * @swagger
 * /bookings/{id}/assignments:
 *   post:
 *     tags: [Bookings]
 *     summary: Assign an employee to a booking or one line item
 *     description: >
 *       Requires `bookings.manage` — except a caller with only
 *       `bookings.create` may add the initial assignment(s) to a booking
 *       they created themselves, as long as it has no assignments yet
 *       (`403` otherwise). `bookingServiceId` is optional — omit or set to
 *       `null` to assign to the whole booking. `400` if `bookingServiceId`
 *       is provided but doesn't belong to this booking. The new assignment
 *       starts with `status: "waiting"` and `assignedAt: now`.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAssignmentInput'
 *     responses:
 *       201:
 *         description: Updated booking (detail shape)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Booking' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  '/:id/assignments',
  requireAssignmentCreateAccess,
  validate({ params: idParamSchema, ...createAssignmentSchema }),
  controller.addAssignment
);

/**
 * @swagger
 * /bookings/{id}/assignments/{aId}:
 *   patch:
 *     tags: [Bookings]
 *     summary: Update a booking assignment's status
 *     description: >
 *       Requires `bookings.manage`. Setting `in_progress` stamps `startedAt`
 *       (if unset); setting `completed` stamps `completedAt` (if unset).
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *       - name: aId
 *         in: path
 *         required: true
 *         description: BookingAssignment UUID
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAssignmentInput'
 *     responses:
 *       200:
 *         description: Updated booking (detail shape)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Booking' }
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
  '/:id/assignments/:aId',
  requirePermission('bookings.manage'),
  validate({ params: nestedIdParamSchema('aId'), ...updateAssignmentSchema }),
  controller.updateAssignment
);

/**
 * @swagger
 * /bookings/{id}/assignments/{aId}:
 *   delete:
 *     tags: [Bookings]
 *     summary: Remove a booking assignment
 *     description: 'Requires `bookings.manage`. `404` if `aId` doesn''t belong to `id`.'
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *       - name: aId
 *         in: path
 *         required: true
 *         description: BookingAssignment UUID
 *         schema: { type: string, format: uuid }
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
  '/:id/assignments/:aId',
  requirePermission('bookings.manage'),
  validate({ params: nestedIdParamSchema('aId') }),
  controller.removeAssignment
);

module.exports = router;
