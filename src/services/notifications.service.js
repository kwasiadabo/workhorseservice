'use strict';

const { Op } = require('sequelize');
const { Notification, Booking, Customer } = require('../models');
const { sendSms, normalisePhone } = require('../utils/sms');
const { tenantHasFeature } = require('../utils/planFeatures');
const env = require('../config/env');

const REVIEW_BASE_URL = `${env.FRONTEND_URL}/review`;

const buildConfirmationBody = (booking, customer) =>
  `Hi ${customer.name}, your booking ${booking.bookingNumber} at our branch is confirmed for ${new Date(booking.scheduledAt).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}. Thank you!`;

const buildReminderBody = (booking, customer, hoursAhead) =>
  `Hi ${customer.name}, reminder: your appointment (${booking.bookingNumber}) is in ${hoursAhead} hour${hoursAhead === 1 ? '' : 's'}. See you soon!`;

const buildReviewBody = (token, tenantName) =>
  `Thank you for visiting ${tenantName}! Share your experience: ${REVIEW_BASE_URL}/${token}`;

const buildReceiptBody = (payment, booking, customer, tenantName) =>
  `Hi ${customer.name}, ${tenantName} received your payment of ${payment.currency} ${Number(payment.amount).toFixed(2)} for booking ${booking.bookingNumber} (ref ${payment.referenceNumber}). Thank you!`;

/**
 * Schedule booking confirmation + reminder notifications.
 * Called inside bookings.service.js#create (within the booking transaction).
 */
const scheduleBookingNotifications = async (tenantId, booking, customer, transaction) => {
  const phone = normalisePhone(customer?.phone);
  if (!phone) return;
  if (!(await tenantHasFeature(tenantId, 'sms'))) return;

  const records = [];

  // Confirmation — send immediately (scheduledFor = now)
  records.push({
    tenantId,
    bookingId: booking.id,
    customerId: customer.id,
    channel: 'sms',
    type: 'booking_confirmation',
    to: phone,
    body: buildConfirmationBody(booking, customer),
    status: 'pending',
    scheduledFor: new Date(),
  });

  // 24h reminder
  if (booking.scheduledAt) {
    const remind24 = new Date(booking.scheduledAt);
    remind24.setHours(remind24.getHours() - 24);
    if (remind24 > new Date()) {
      records.push({
        tenantId,
        bookingId: booking.id,
        customerId: customer.id,
        channel: 'sms',
        type: 'reminder_24h',
        to: phone,
        body: buildReminderBody(booking, customer, 24),
        status: 'pending',
        scheduledFor: remind24,
      });
    }

    // 1h reminder
    const remind1 = new Date(booking.scheduledAt);
    remind1.setHours(remind1.getHours() - 1);
    if (remind1 > new Date()) {
      records.push({
        tenantId,
        bookingId: booking.id,
        customerId: customer.id,
        channel: 'sms',
        type: 'reminder_1h',
        to: phone,
        body: buildReminderBody(booking, customer, 1),
        status: 'pending',
        scheduledFor: remind1,
      });
    }
  }

  await Notification.bulkCreate(records, { transaction });
};

/**
 * Create a review-request notification after booking completion.
 * Called inside payments.service.js after createReviewRequest.
 */
const scheduleReviewNotification = async (tenantId, booking, customer, token, tenantName, transaction) => {
  const phone = normalisePhone(customer?.phone);
  if (!phone || !token) return;
  if (!(await tenantHasFeature(tenantId, 'sms'))) return;

  await Notification.create(
    {
      tenantId,
      bookingId: booking.id,
      customerId: customer.id,
      channel: 'sms',
      type: 'review_request',
      to: phone,
      body: buildReviewBody(token, tenantName),
      status: 'pending',
      scheduledFor: new Date(),
    },
    { transaction }
  );
};

/**
 * Create a payment-receipt notification right after a payment is recorded.
 * Called inside payments.service.js after the payment transaction commits.
 */
const schedulePaymentReceipt = async (tenantId, booking, customer, payment, tenantName, transaction) => {
  const phone = normalisePhone(customer?.phone);
  if (!phone) return;
  if (!(await tenantHasFeature(tenantId, 'sms'))) return;

  await Notification.create(
    {
      tenantId,
      bookingId: booking.id,
      customerId: customer.id,
      channel: 'sms',
      type: 'payment_receipt',
      to: phone,
      body: buildReceiptBody(payment, booking, customer, tenantName),
      status: 'pending',
      scheduledFor: new Date(),
    },
    { transaction }
  );
};

// Nalo has been observed intermittently rejecting otherwise-valid requests
// (e.g. a transient "IP not whitelisted" response that succeeds on retry) —
// retry a few times, spaced out by RETRY_DELAY_MS, before giving up.
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000;

/**
 * Dispatch all pending notifications whose scheduledFor has passed.
 * Called by the cron job every 5 minutes.
 */
const dispatchPending = async () => {
  const due = await Notification.findAll({
    where: {
      status: 'pending',
      scheduledFor: { [Op.lte]: new Date() },
    },
    limit: 50,
  });

  for (const notification of due) {
    try {
      const result = await sendSms(notification.to, notification.body);
      await notification.update({ status: 'sent', sentAt: new Date(), messageId: result?.messageId ?? null, error: null });
    } catch (err) {
      const attempts = notification.retryCount + 1;
      const message = String(err?.message ?? err).slice(0, 500);
      if (attempts >= MAX_ATTEMPTS) {
        await notification.update({ status: 'failed', retryCount: attempts, error: message });
      } else {
        await notification.update({
          status: 'pending',
          retryCount: attempts,
          error: message,
          scheduledFor: new Date(Date.now() + RETRY_DELAY_MS),
        });
      }
    }
  }
};

module.exports = {
  scheduleBookingNotifications,
  scheduleReviewNotification,
  schedulePaymentReceipt,
  dispatchPending,
};
