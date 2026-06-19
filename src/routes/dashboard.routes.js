const express = require('express');

const controller = require('../controllers/dashboard.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /dashboard/me:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get the current user's personal analytics
 *     description: >
 *       Returns booking-assignment, payment and cash-handover stats for the
 *       caller's linked `Employee` record. Any authenticated tenant user may
 *       call this — no permission required. If the caller has no linked
 *       `Employee` record, returns `hasEmployeeRecord: false` with a zeroed
 *       payload (still `200 OK`).
 *     responses:
 *       200:
 *         description: Personal analytics payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasEmployeeRecord: { type: boolean }
 *                     employee:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         firstName: { type: string }
 *                         lastName: { type: string }
 *                         branchId: { type: string, format: uuid }
 *                     assignments:
 *                       type: object
 *                       properties:
 *                         byStatus:
 *                           type: object
 *                           properties:
 *                             waiting: { type: integer }
 *                             in_progress: { type: integer }
 *                             completed: { type: integer }
 *                             cancelled: { type: integer }
 *                         totalBookings: { type: integer }
 *                         todayCount: { type: integer }
 *                         thisWeekCount: { type: integer }
 *                         thisMonthCount: { type: integer }
 *                         avgDurationMinutes: { type: number }
 *                         avgSatisfactionRating: { type: number }
 *                         upcoming:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               bookingId: { type: string, format: uuid }
 *                               bookingNumber: { type: string }
 *                               scheduledAt: { type: string, format: date-time }
 *                               status: { type: string }
 *                               assignmentStatus: { type: string }
 *                               isTeamLead: { type: boolean }
 *                               customerName: { type: string }
 *                               branchName: { type: string }
 *                     payments:
 *                       type: object
 *                       properties:
 *                         allTime:
 *                           type: object
 *                           properties: { count: { type: integer }, totalAmount: { type: number } }
 *                         today:
 *                           type: object
 *                           properties: { count: { type: integer }, totalAmount: { type: number } }
 *                         thisMonth:
 *                           type: object
 *                           properties: { count: { type: integer }, totalAmount: { type: number } }
 *                         byMethod:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               method: { type: string }
 *                               count: { type: integer }
 *                               totalAmount: { type: number }
 *                         recent:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               amount: { type: number }
 *                               currency: { type: string }
 *                               method: { type: string }
 *                               paidAt: { type: string, format: date-time }
 *                               bookingNumber: { type: string }
 *                               customerName: { type: string }
 *                     cashHandovers:
 *                       type: object
 *                       properties:
 *                         totals:
 *                           type: object
 *                           properties:
 *                             count: { type: integer }
 *                             totalDeclared: { type: number }
 *                             totalExpected: { type: number }
 *                             totalVariance: { type: number }
 *                         byStatus:
 *                           type: object
 *                           properties:
 *                             submitted: { type: integer }
 *                             reconciled: { type: integer }
 *                             disputed: { type: integer }
 *                         recent:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               periodStart: { type: string, format: date-time }
 *                               periodEnd: { type: string, format: date-time }
 *                               declaredAmount: { type: number }
 *                               expectedAmount: { type: number }
 *                               variance: { type: number }
 *                               status: { type: string }
 *                               submittedAt: { type: string, format: date-time }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me', controller.me);

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Owner/manager tenant-wide dashboard summary
 *     description: >
 *       Today's revenue, outstanding balance owed, the next few upcoming
 *       bookings, today's staff utilization, and this week's new-vs-returning
 *       clients and top service by revenue. Requires `bookings.manage`
 *       (tenant_owner/manager only).
 *     responses:
 *       200:
 *         description: Owner dashboard summary
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/summary', requirePermission('bookings.manage'), controller.summary);

module.exports = router;
