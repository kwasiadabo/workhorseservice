'use strict';

const env = require('./env');

// Inactive by default — there's no Sentry account/DSN configured yet. Set
// SENTRY_DSN in the environment to turn this on; nothing else needs to
// change. Until then, captureException is a no-op so call sites never need
// to check whether Sentry is actually active.
let Sentry = null;

if (env.SENTRY_DSN) {
  Sentry = require('@sentry/node');
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0,
  });
  console.info('[sentry] Error tracking active.');
}

const captureException = (err) => {
  if (Sentry) Sentry.captureException(err);
};

module.exports = { captureException };
