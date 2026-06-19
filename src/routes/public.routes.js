'use strict';

const express = require('express');
const reviewsCtrl = require('../controllers/reviews.controller');
const portalCtrl = require('../controllers/portal.controller');

const router = express.Router();

// ── Public review link ──────────────────────────────────────────────────────
router.get('/review/:token', reviewsCtrl.getByToken);
router.post('/review/:token', reviewsCtrl.submit);

// ── Self-service booking portal ─────────────────────────────────────────────
router.get('/:slug/info', portalCtrl.getInfo);
router.get('/:slug/staff', portalCtrl.getStaff);
router.get('/:slug/services', portalCtrl.getServices);
router.get('/:slug/staff/:employeeId/availability', portalCtrl.getAvailability);
router.post('/:slug/payment/initialize', portalCtrl.initializePayment);
router.post('/:slug/bookings', portalCtrl.createBooking);

module.exports = router;
