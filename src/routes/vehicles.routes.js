const express = require('express');

const controller = require('../controllers/vehicles.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema } = require('../validators/common.validators');
const { createVehicleSchema, updateVehicleSchema, listVehiclesSchema } = require('../validators/vehicles.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

/**
 * @swagger
 * /vehicles:
 *   get:
 *     tags: [Bookings]
 *     summary: List a client's vehicles
 *     description: >
 *       Returns vehicles registered for the tenant, optionally filtered to one
 *       client via `customerId`. Requires `bookings.create` (the same roles that
 *       create bookings need to look up/register a client's vehicle inline).
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - name: customerId
 *         in: query
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated list of vehicles
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', requirePermission('bookings.create'), validate(listVehiclesSchema), controller.list);

/**
 * @swagger
 * /vehicles:
 *   post:
 *     tags: [Bookings]
 *     summary: Register a vehicle for a client
 *     description: Requires `bookings.create`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, registration]
 *             properties:
 *               customerId: { type: string, format: uuid }
 *               vehicleTypeId: { type: string, format: uuid }
 *               registration: { type: string, example: 'GR-1234-20' }
 *               make: { type: string, example: 'Toyota' }
 *               model: { type: string, example: 'Corolla' }
 *     responses:
 *       201:
 *         description: Vehicle created
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', requirePermission('bookings.create'), validate(createVehicleSchema), controller.create);

router.get('/:id', requirePermission('bookings.create'), validate({ params: idParamSchema }), controller.getById);

router.patch(
  '/:id',
  requirePermission('bookings.manage'),
  validate({ params: idParamSchema, ...updateVehicleSchema }),
  controller.update
);

router.delete('/:id', requirePermission('bookings.manage'), validate({ params: idParamSchema }), controller.remove);

module.exports = router;
