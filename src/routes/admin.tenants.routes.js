const express = require('express');

const controller = require('../controllers/admin.tenants.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema } = require('../validators/common.validators');
const { updateTenantSchema, listTenantsSchema } = require('../validators/admin.tenants.validators');

const router = express.Router();

// Platform-level resource — super admins operate across all tenants and are
// not subject to `resolveTenant`.
router.use(authenticate, requirePasswordChanged, requireRole('super_admin'));

/**
 * @swagger
 * /admin/tenants:
 *   get:
 *     tags: [Admin - Tenants]
 *     summary: List tenants (platform-wide)
 *     description: Requires the `super_admin` role. Each item includes its `Plan`.
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - name: search
 *         in: query
 *         description: Case-insensitive match against `name`/`email`/`slug`
 *         schema: { type: string }
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [trial, active, suspended, cancelled]
 *     responses:
 *       200:
 *         description: Paginated list of tenants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Tenant' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', validate(listTenantsSchema), controller.list);

/**
 * @swagger
 * /admin/tenants/{id}:
 *   get:
 *     tags: [Admin - Tenants]
 *     summary: Get a tenant by ID (platform-wide)
 *     description: >
 *       Requires the `super_admin` role. Includes `Plan` and a list of the
 *       tenant's `Users` (`id, email, firstName, lastName, isActive,
 *       lastLoginAt`).
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Tenant found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/TenantWithUsers' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validate({ params: idParamSchema }), controller.getById);

/**
 * @swagger
 * /admin/tenants/{id}:
 *   patch:
 *     tags: [Admin - Tenants]
 *     summary: Update a tenant (platform-wide)
 *     description: >
 *       Requires the `super_admin` role. Use this to activate a tenant after
 *       manual billing setup, change plans, or extend a trial. All fields
 *       optional.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTenantInput'
 *     responses:
 *       200:
 *         description: Tenant updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Tenant' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id', validate({ params: idParamSchema, ...updateTenantSchema }), controller.update);

/**
 * @swagger
 * /admin/tenants/{id}:
 *   delete:
 *     tags: [Admin - Tenants]
 *     summary: Cancel a tenant (platform-wide)
 *     description: >
 *       Requires the `super_admin` role. **Not a hard delete** — tenants are
 *       not soft-deletable (their data must remain for audit/billing). Sets
 *       `status = "cancelled"` and returns the updated tenant with `200`.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Tenant cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Tenant' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', validate({ params: idParamSchema }), controller.remove);

module.exports = router;
