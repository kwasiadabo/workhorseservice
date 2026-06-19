'use strict';

const { dispatchPending } = require('./services/notifications.service');

let cron = null;
try {
  cron = require('node-cron');
} catch (_) {
  console.warn('[scheduler] node-cron not installed — run: npm install --prefix backend node-cron');
}

const startScheduler = () => {
  if (!cron) return;

  // Dispatch pending SMS notifications every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await dispatchPending();
    } catch (err) {
      console.error('[scheduler] dispatchPending error:', err?.message);
    }
  });

  console.info('[scheduler] Started: SMS dispatch every 5 minutes');
};

module.exports = { startScheduler };
