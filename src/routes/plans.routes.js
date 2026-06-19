const express = require('express');
const plansController = require('../controllers/plans.controller');

const router = express.Router();

// Public — no authentication required
router.get('/', plansController.list);

module.exports = router;
