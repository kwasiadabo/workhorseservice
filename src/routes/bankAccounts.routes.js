const express = require('express');
const controller = require('../controllers/bankAccounts.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema } = require('../validators/common.validators');
const { createBankAccountSchema, updateBankAccountSchema, listBankAccountsSchema } = require('../validators/bankAccounts.validators');

const router = express.Router();
router.use(authenticate, requirePasswordChanged, resolveTenant);

router.get('/', requirePermission('banking.view'), validate(listBankAccountsSchema), controller.list);
router.post('/', requirePermission('banking.manage'), validate(createBankAccountSchema), controller.create);
router.get('/:id', requirePermission('banking.view'), validate({ params: idParamSchema }), controller.getById);
router.patch('/:id', requirePermission('banking.manage'), validate({ params: idParamSchema, ...updateBankAccountSchema }), controller.update);
router.delete('/:id', requirePermission('banking.manage'), validate({ params: idParamSchema }), controller.remove);

module.exports = router;
