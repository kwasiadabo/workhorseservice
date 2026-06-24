const express = require('express');

const controller = require('../controllers/admin.dashboard.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

const router = express.Router();

// Platform-level resource — super admins operate across all tenants and are
// not subject to `resolveTenant`.
router.use(authenticate, requirePasswordChanged, requireRole('super_admin'));

/**
 * @swagger
 * /admin/dashboard/overview:
 *   get:
 *     tags: [Admin - Dashboard]
 *     summary: Platform-wide overview (cross-tenant)
 *     description: >
 *       Requires the `super_admin` role. Aggregates tenant counts, current
 *       subscription MRR/ARR and upcoming trial/subscription expiries, this
 *       month's SMS usage, and this month's booking volume — all across every
 *       tenant on the platform.
 *     responses:
 *       200:
 *         description: Overview data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: object }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/overview', controller.overview);

module.exports = router;
