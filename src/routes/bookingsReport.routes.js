const express = require('express');

const controller = require('../controllers/bookingsReport.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { getOverviewSchema } = require('../validators/reports.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /bookings-report:
 *   get:
 *     tags: [Bookings]
 *     summary: Bookings analytics report
 *     description: >
 *       Returns aggregated booking analytics for the tenant (or a single branch).
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
 *         description: Bookings analytics report
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
 *                         totalBookings: { type: integer }
 *                         completedBookings: { type: integer }
 *                         cancelledBookings: { type: integer }
 *                         inProgressBookings: { type: integer }
 *                         completionRate: { type: number }
 *                         avgBookingValue: { type: number }
 *                         totalRevenue: { type: number }
 *                     bookingsByStatus:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status: { type: string }
 *                           count: { type: integer }
 *                     bookingTrend:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month: { type: string, example: '2026-06' }
 *                           count: { type: integer }
 *                           completedCount: { type: integer }
 *                     branchPerformance:
 *                       type: array
 *                       items:
 *                         type: object
 *                     topServices:
 *                       type: array
 *                       items:
 *                         type: object
 *                     topStaff:
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
