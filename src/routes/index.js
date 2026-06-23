const express = require('express');
const { authenticate, requirePasswordChanged, requireActiveSubscription } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');

const router = express.Router();

// ── Public / auth ──────────────────────────────────────────────────────────
router.use('/auth', require('./auth.routes'));
router.use('/plans', require('./plans.routes'));
router.use('/business-types', require('./businessTypes.routes'));
router.use('/public', require('./public.routes'));

// ── Super admin (no tenant context) ────────────────────────────────────────
router.use('/admin/tenants', require('./admin.tenants.routes'));
router.use('/admin/users', require('./admin.users.routes'));
router.use('/admin/business-types', require('./admin.businessTypes.routes'));

// ── Subscription (own auth stack; no enforcement — expired tenants must reach this) ──
router.use('/subscription', require('./subscription.routes'));

// ── Tenant-scoped routes with subscription enforcement ────────────────────
// authenticate + resolveTenant run twice (once here, once inside each route file)
// — the double-run is harmless; it ensures requireActiveSubscription fires
// before any business-logic route handler.
const enforced = express.Router();
enforced.use(authenticate, requirePasswordChanged, resolveTenant, requireActiveSubscription);

enforced.use('/users', require('./users.routes'));
enforced.use('/branches', require('./branches.routes'));
enforced.use('/employees', require('./employees.routes'));
enforced.use('/positions', require('./positions.routes'));
enforced.use('/teams', require('./teams.routes'));
enforced.use('/customers', require('./customers.routes'));
enforced.use('/service-categories', require('./serviceCategories.routes'));
enforced.use('/services', require('./services.routes'));
enforced.use('/bookings', require('./bookings.routes'));
enforced.use('/payments', require('./payments.routes'));
enforced.use('/cash-handovers', require('./cashHandovers.routes'));
enforced.use('/dashboard', require('./dashboard.routes'));
enforced.use('/reports', require('./reports.routes'));
enforced.use('/vehicle-types', require('./vehicleTypes.routes'));
enforced.use('/vehicles', require('./vehicles.routes'));
enforced.use('/expense-categories', require('./expenseCategories.routes'));
enforced.use('/expenses', require('./expenses.routes'));
enforced.use('/expense-report', require('./expenseReport.routes'));
enforced.use('/bookings-report', require('./bookingsReport.routes'));
enforced.use('/payments-report', require('./paymentsReport.routes'));
enforced.use('/revenue-report', require('./revenueReport.routes'));
enforced.use('/service-provider-report', require('./serviceProviderReport.routes'));
enforced.use('/team-performance-report', require('./teamPerformanceReport.routes'));
enforced.use('/banks', require('./banks.routes'));
enforced.use('/bank-accounts', require('./bankAccounts.routes'));
enforced.use('/bank-transactions', require('./bankTransactions.routes'));
enforced.use('/banking-report', require('./bankingReport.routes'));
enforced.use('/commission', require('./commission.routes'));
enforced.use('/loyalty', require('./loyalty.routes'));
enforced.use('/reviews', require('./reviews.routes'));
enforced.use('/portal-settings', require('./portalSettings.routes'));
enforced.use('/sms', require('./sms.routes'));

router.use(enforced);

module.exports = router;
