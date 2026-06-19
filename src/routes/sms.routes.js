'use strict';

const express = require('express');
const controller = require('../controllers/sms.controller');
const { authenticate, requirePasswordChanged, requireFeature } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { sendCampaignSchema, previewAudienceSchema, listCampaignsSchema } = require('../validators/sms.validators');

const router = express.Router();
router.use(authenticate, requirePasswordChanged, resolveTenant, requirePermission('sms.manage'));

router.get('/campaigns', validate(listCampaignsSchema), controller.listCampaigns);
router.get('/campaigns/audience', requireFeature('sms'), validate(previewAudienceSchema), controller.previewAudience);
router.post('/campaigns', requireFeature('sms'), validate(sendCampaignSchema), controller.sendCampaign);

module.exports = router;
