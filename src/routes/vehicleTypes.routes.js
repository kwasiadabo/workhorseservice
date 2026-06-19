const express = require('express');

const controller = require('../controllers/vehicleTypes.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema } = require('../validators/common.validators');
const {
  createVehicleTypeSchema,
  updateVehicleTypeSchema,
  listVehicleTypesSchema,
} = require('../validators/vehicleTypes.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /vehicle-types:
 *   get:
 *     tags: [Bookings]
 *     summary: List vehicle types
 *     description: Returns the tenant's vehicle type catalog. Requires `bookings.view`.
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Paginated list of vehicle types
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requirePermission('bookings.view'), validate(listVehicleTypesSchema), controller.list);

/**
 * @swagger
 * /vehicle-types:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a vehicle type
 *     description: Requires `bookings.manage`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: 'Saloon' }
 *               displayOrder: { type: integer, example: 0 }
 *     responses:
 *       201:
 *         description: Vehicle type created
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', requirePermission('bookings.manage'), validate(createVehicleTypeSchema), controller.create);

router.get('/:id', requirePermission('bookings.view'), validate({ params: idParamSchema }), controller.getById);

router.patch(
  '/:id',
  requirePermission('bookings.manage'),
  validate({ params: idParamSchema, ...updateVehicleTypeSchema }),
  controller.update
);

router.delete('/:id', requirePermission('bookings.manage'), validate({ params: idParamSchema }), controller.remove);

module.exports = router;
