const express = require('express');

const controller = require('../controllers/admin.businessTypes.controller');

const router = express.Router();

// Public — no auth required. Used by the registration page to populate
// the business type dropdown before a user account exists.
router.get('/', controller.listPublic);

module.exports = router;
