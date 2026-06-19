const express = require('express');

const controller = require('../controllers/serviceCategories.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema } = require('../validators/common.validators');
const {
  createServiceCategorySchema,
  updateServiceCategorySchema,
  listServiceCategoriesSchema,
} = require('../validators/serviceCategories.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /service-categories:
 *   get:
 *     tags: [Service Categories]
 *     summary: List service categories
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Paginated list of service categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ServiceCategory' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requirePermission('services.view'), validate(listServiceCategoriesSchema), controller.list);

/**
 * @swagger
 * /service-categories:
 *   post:
 *     tags: [Service Categories]
 *     summary: Create a service category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServiceCategoryInput'
 *     responses:
 *       201:
 *         description: Service category created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ServiceCategory' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', requirePermission('services.manage'), validate(createServiceCategorySchema), controller.create);

/**
 * @swagger
 * /service-categories/{id}:
 *   get:
 *     tags: [Service Categories]
 *     summary: Get a service category by ID
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Service category found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ServiceCategory' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', requirePermission('services.view'), validate({ params: idParamSchema }), controller.getById);

/**
 * @swagger
 * /service-categories/{id}:
 *   patch:
 *     tags: [Service Categories]
 *     summary: Update a service category
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServiceCategoryInput'
 *     responses:
 *       200:
 *         description: Service category updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ServiceCategory' }
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
  requirePermission('services.manage'),
  validate({ params: idParamSchema, ...updateServiceCategorySchema }),
  controller.update
);

/**
 * @swagger
 * /service-categories/{id}:
 *   delete:
 *     tags: [Service Categories]
 *     summary: Delete a service category
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
  requirePermission('services.manage'),
  validate({ params: idParamSchema }),
  controller.remove
);

module.exports = router;
