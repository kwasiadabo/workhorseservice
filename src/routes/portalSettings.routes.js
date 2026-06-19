'use strict';

const express = require('express');
const { authenticate, requirePasswordChanged } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { Tenant } = require('../models');

const router = express.Router();

router.use(authenticate, requirePasswordChanged, resolveTenant);

// GET /portal-settings — any tenant user can read the portal config
router.get('/', asyncHandler(async (req, res) => {
  const tenant = await Tenant.findByPk(req.tenantId, {
    attributes: ['id', 'slug', 'portalDepositPercent'],
  });
  res.json({ success: true, data: { slug: tenant.slug, depositPercent: tenant.portalDepositPercent } });
}));

// PATCH /portal-settings — tenant_owner only
router.patch(
  '/',
  requireRole('tenant_owner'),
  asyncHandler(async (req, res) => {
    const { depositPercent } = req.body;
    const pct = Number(depositPercent);
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ success: false, message: 'depositPercent must be an integer between 0 and 100' });
    }
    const tenant = await Tenant.findByPk(req.tenantId);
    await tenant.update({ portalDepositPercent: pct });
    res.json({ success: true, data: { depositPercent: pct } });
  })
);

module.exports = router;
