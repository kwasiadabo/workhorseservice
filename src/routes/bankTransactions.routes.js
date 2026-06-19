const express = require('express');
const controller = require('../controllers/bankTransactions.controller');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { idParamSchema } = require('../validators/common.validators');
const { createBankTransactionSchema, updateBankTransactionSchema, listBankTransactionsSchema } = require('../validators/bankTransactions.validators');

const router = express.Router();
router.use(authenticate, requirePasswordChanged, resolveTenant);

router.get('/', requirePermission('banking.view'), validate(listBankTransactionsSchema), controller.list);
router.post('/', requirePermission('banking.manage'), validate(createBankTransactionSchema), controller.create);
router.get('/:id', requirePermission('banking.view'), validate({ params: idParamSchema }), controller.getById);
router.patch('/:id', requirePermission('banking.manage'), validate({ params: idParamSchema, ...updateBankTransactionSchema }), controller.update);
router.delete('/:id', requirePermission('banking.manage'), validate({ params: idParamSchema }), controller.remove);

module.exports = router;
