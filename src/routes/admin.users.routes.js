const express = require('express');

const controller = require('../controllers/admin.users.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema } = require('../validators/common.validators');
const { listUsersSchema, updateUserSchema } = require('../validators/admin.users.validators');

const router = express.Router();

// Platform-level resource — super admins operate across all tenants and are
// not subject to `resolveTenant`.
router.use(authenticate, requirePasswordChanged, requireRole('super_admin'));

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin - Users]
 *     summary: List user accounts across all tenants
 *     description: >
 *       Requires the `super_admin` role. Excludes platform accounts
 *       (super admins) — only users belonging to a tenant are returned. Each
 *       item includes its `tenant` (`id, name, slug, status`).
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - name: tenantId
 *         in: query
 *         schema: { type: string, format: uuid }
 *       - name: role
 *         in: query
 *         schema: { type: string, enum: [tenant_owner, manager, receptionist, employee] }
 *       - name: isActive
 *         in: query
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AdminUser' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', validate(listUsersSchema), controller.list);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin - Users]
 *     summary: Get a user by ID (platform-wide)
 *     description: Requires the `super_admin` role.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/AdminUser' }
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
 * /admin/users/{id}:
 *   patch:
 *     tags: [Admin - Users]
 *     summary: Update a user (platform-wide)
 *     description: >
 *       Requires the `super_admin` role. Supports updating basic profile
 *       fields and activating/deactivating the account. The tenant owner
 *       cannot be deactivated here — suspend the tenant instead via
 *       `PATCH /admin/tenants/{id}`. Role and branch assignment are managed
 *       by the tenant via `/users`.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAdminUserInput'
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/AdminUser' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id', validate({ params: idParamSchema, ...updateUserSchema }), controller.update);

/**
 * @swagger
 * /admin/users/{id}/reset-password:
 *   post:
 *     tags: [Admin - Users]
 *     summary: Reset a user's password (platform-wide)
 *     description: >
 *       Requires the `super_admin` role. Generates a one-time temporary
 *       password, forces the user to change it on next login
 *       (`mustChangePassword: true`), and revokes their active sessions. The
 *       temporary password is returned **once** in this response and is not
 *       recoverable afterwards — share it with the user through a secure
 *       channel.
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Password reset
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ResetPasswordResult' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:id/reset-password', validate({ params: idParamSchema }), controller.resetPassword);

module.exports = router;
