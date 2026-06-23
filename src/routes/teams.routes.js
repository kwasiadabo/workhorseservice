const express = require('express');

const controller = require('../controllers/teams.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema } = require('../validators/common.validators');
const { createTeamSchema, updateTeamSchema, listTeamsSchema } = require('../validators/teams.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /teams:
 *   get:
 *     tags: [Teams]
 *     summary: List teams
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Paginated list of teams
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requirePermission('employees.view'), validate(listTeamsSchema), controller.list);

/**
 * @swagger
 * /teams:
 *   post:
 *     tags: [Teams]
 *     summary: Create a team
 *     responses:
 *       201:
 *         description: Team created
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', requirePermission('employees.manage'), validate(createTeamSchema), controller.create);

/**
 * @swagger
 * /teams/{id}:
 *   get:
 *     tags: [Teams]
 *     summary: Get a team by ID
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Team found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', requirePermission('employees.view'), validate({ params: idParamSchema }), controller.getById);

/**
 * @swagger
 * /teams/{id}:
 *   patch:
 *     tags: [Teams]
 *     summary: Update a team
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Team updated
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
  requirePermission('employees.manage'),
  validate({ params: idParamSchema, ...updateTeamSchema }),
  controller.update
);

/**
 * @swagger
 * /teams/{id}:
 *   delete:
 *     tags: [Teams]
 *     summary: Delete a team
 *     description: Soft-delete (paranoid model) — the record is excluded from future queries.
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
  requirePermission('employees.manage'),
  validate({ params: idParamSchema }),
  controller.remove
);

module.exports = router;
