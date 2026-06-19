const express = require('express');

const controller = require('../controllers/reports.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { getOverviewSchema } = require('../validators/reports.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant, requireRole('tenant_owner'));

/**
 * @swagger
 * /reports/overview:
 *   get:
 *     tags: [Reports]
 *     summary: Get a tenant-wide business analytics overview (tenant_owner only)
 *     description: >
 *       Returns a combined business-analytics payload for the tenant:
 *       summary KPIs, revenue trend, bookings by status, branch performance,
 *       service-provider performance, top services and top customers.
 *       Restricted to `tenant_owner` — other roles (including `manager`, who
 *       holds `reports.view`) receive `403`.
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
 *         description: >
 *           Restrict the entire payload to a single branch (bookings,
 *           revenue trend, branch/service-provider/top-services breakdowns,
 *           and `summary.activeEmployees`). `summary.totalCustomers`,
 *           `summary.newCustomers` and `summary.totalBranches` remain
 *           tenant-wide. When set, `branchPerformance` returns a single row.
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Business analytics overview
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
 *                         noShowBookings: { type: integer }
 *                         totalRevenue: { type: number }
 *                         avgBookingValue: { type: number }
 *                         totalCustomers: { type: integer }
 *                         newCustomers: { type: integer }
 *                         totalBranches: { type: integer }
 *                         activeEmployees: { type: integer }
 *                     revenueTrend:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month: { type: string, example: '2026-06' }
 *                           totalAmount: { type: number }
 *                           count: { type: integer }
 *                     bookingsByStatus:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status: { type: string }
 *                           count: { type: integer }
 *                     branchPerformance:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           branchId: { type: string, format: uuid }
 *                           branchName: { type: string }
 *                           bookingsCount: { type: integer }
 *                           completedCount: { type: integer }
 *                           revenue: { type: number }
 *                           avgSatisfaction: { type: number, nullable: true }
 *                           employeeCount: { type: integer }
 *                     employeePerformance:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           employeeId: { type: string, format: uuid }
 *                           name: { type: string }
 *                           branchName: { type: string }
 *                           bookingsCount: { type: integer }
 *                           servicesAssigned: { type: integer }
 *                           assignmentsCompleted: { type: integer }
 *                           revenue: { type: number }
 *                           avgSatisfaction: { type: number, nullable: true }
 *                           avgDurationMinutes: { type: number, nullable: true }
 *                     topServices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           serviceId: { type: string, format: uuid }
 *                           name: { type: string }
 *                           bookingsCount: { type: integer }
 *                           revenue: { type: number }
 *                     topCustomers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           customerId: { type: string, format: uuid }
 *                           name: { type: string }
 *                           phone: { type: string, nullable: true }
 *                           bookingsCount: { type: integer }
 *                           totalSpent: { type: number }
 *                           lastVisit: { type: string, format: date-time }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/overview', validate(getOverviewSchema), controller.overview);

module.exports = router;
