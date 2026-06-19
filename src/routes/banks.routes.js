const express = require('express');
const controller = require('../controllers/banks.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema } = require('../validators/common.validators');
const { createBankSchema, updateBankSchema, listBanksSchema } = require('../validators/banks.validators');

const router = express.Router();
router.use(authenticate, requirePasswordChanged, resolveTenant);

router.get('/', requirePermission('banking.view'), validate(listBanksSchema), controller.list);
router.post('/', requirePermission('banking.manage'), validate(createBankSchema), controller.create);
router.get('/:id', requirePermission('banking.view'), validate({ params: idParamSchema }), controller.getById);
router.patch('/:id', requirePermission('banking.manage'), validate({ params: idParamSchema, ...updateBankSchema }), controller.update);
router.delete('/:id', requirePermission('banking.manage'), validate({ params: idParamSchema }), controller.remove);

module.exports = router;
