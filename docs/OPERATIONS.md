# Operations runbook

This is a working template, not a finished document — the questions below
need real answers filled in by whoever provisions the production database
and hosting. Nothing here should be assumed true until verified.

## Backup & disaster recovery

This app requires an externally-managed Microsoft SQL Server instance (no
bundled/local DB — see the root `CLAUDE.md`). Backups, point-in-time
recovery, and failover are entirely the responsibility of whoever provisions
that instance, not this codebase. Answer and keep up to date:

- **Which managed SQL service backs production?** (e.g. Azure SQL Database,
  a self-managed VM, another provider) — _fill in_.
- **What's the backup retention / point-in-time-restore window?** Azure SQL
  Database defaults to 7 days of PITR on most tiers — confirm the actual
  tier and retention, don't assume the default — _fill in_.
- **Has a restore actually been tested?** A backup nobody has restored from
  is unverified. Date of last tested restore: _fill in_.
- **Who is responsible for responding to a DB outage or data-loss incident?**
  _fill in_.

## Environment variables added by the audit-fix pass

- `SENTRY_DSN` — leave blank to keep error tracking inactive (the default).
  Set it once a Sentry (or compatible) project exists; `src/config/sentry.js`
  picks it up automatically, no code changes needed.
- `SCHEDULER_ENABLED` — defaults to `true`. The SMS-dispatch cron
  (`src/scheduler.js`) has no distributed lock. **If running more than one
  API instance, set this to `false` on all but one**, or the dispatch job
  fires redundantly on every instance every 5 minutes (wasted work at best,
  duplicate sends at worst). The real fix is a proper job queue
  (see `docs/SCALABILITY.md`) — this flag is a stopgap.

## Production secrets

`NODE_ENV=production` now refuses to boot if `JWT_ACCESS_SECRET` or
`JWT_REFRESH_SECRET` are left at their `.env.example` dev defaults (see
`src/config/env.js`). Set real, unique values for any non-local environment:

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Incident response

There is no error-tracking/APM beyond the env-gated Sentry integration above
and structured `console.error` JSON lines (see `src/middleware/error.middleware.js`).
Until Sentry (or equivalent) is actually configured, a production incident
is debuggable only via whatever the hosting platform captures from stdout.
