const express = require('express');

const controller = require('../controllers/setup.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /setup-status:
 *   get:
 *     tags: [Setup]
 *     summary: Whether the tenant has completed initial setup
 *     description: >
 *       Counts branches, service categories, services and employees for the
 *       tenant. `complete` is true only when all four exist. Used to force
 *       tenant owners through initial setup and to block booking creation
 *       until the business is bookable. Requires `bookings.create` — the
 *       exact set of roles (owner/manager/receptionist) that ever need this.
 *     responses:
 *       200:
 *         description: Setup status
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requirePermission('bookings.create'), controller.getStatus);

module.exports = router;
