const express = require('express');

const controller = require('../controllers/admin.businessTypes.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema } = require('../validators/common.validators');
const {
  createBusinessTypeSchema,
  updateBusinessTypeSchema,
  listBusinessTypesSchema,
} = require('../validators/admin.businessTypes.validators');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, requireRole('super_admin'));

router.get('/', validate(listBusinessTypesSchema), controller.list);
router.post('/', validate(createBusinessTypeSchema), controller.create);
router.get('/:id', validate({ params: idParamSchema }), controller.getById);
router.patch('/:id', validate({ params: idParamSchema, ...updateBusinessTypeSchema }), controller.update);
router.delete('/:id', validate({ params: idParamSchema }), controller.remove);

module.exports = router;
