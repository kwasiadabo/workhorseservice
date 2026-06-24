'use strict';

const env = require('./config/env');
const { dispatchPending } = require('./services/notifications.service');

let cron = null;
try {
  cron = require('node-cron');
} catch {
  console.warn('[scheduler] node-cron not installed — run: npm install --prefix backend node-cron');
}

// Runs in-process, per instance — there is no distributed lock. Running more
// than one API instance with this enabled means every instance fires the job
// on the same interval (wasted work at best, duplicate sends at worst if
// dispatchPending isn't perfectly idempotent under concurrent runs). Until
// this moves to a real job queue (see docs/SCALABILITY.md), operators running
// >1 instance must set SCHEDULER_ENABLED=false on all but one.
const startScheduler = () => {
  if (!cron) return;

  if (!env.SCHEDULER_ENABLED) {
    console.info('[scheduler] Disabled via SCHEDULER_ENABLED=false — not starting.');
    return;
  }

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
