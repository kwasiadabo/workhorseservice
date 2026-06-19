// Static role -> permission map for the MVP. Permissions are seeded into the
// `Permissions` table (so they're discoverable/documentable), but the
// role -> permission assignment itself is hardcoded here rather than stored
// in a RolePermissions table. Phase 2 can introduce per-tenant customizable
// permissions via a RolePermissions join table without changing this module's
// public shape (ROLES / PERMISSIONS / getPermissionsForRole).

const ROLES = ['super_admin', 'tenant_owner', 'manager', 'receptionist', 'employee'];

// Roles a tenant admin is allowed to assign when creating/updating user
// accounts via `/users`. Excludes `super_admin` (platform-only) and
// `tenant_owner` (exactly one per tenant, set at registration).
const TENANT_ASSIGNABLE_ROLES = ['manager', 'receptionist', 'employee'];

const PERMISSIONS = [
  { key: 'platform.manage', description: 'Manage platform-wide settings, tenants and plans' },
  { key: 'tenants.manage', description: 'Create, update, suspend tenants' },
  { key: 'branches.manage', description: 'Create, update, delete branches' },
  { key: 'branches.view', description: 'View branches' },
  { key: 'employees.manage', description: 'Create, update, delete employees' },
  { key: 'employees.view', description: 'View employees' },
  { key: 'customers.manage', description: 'Create, update, delete customers' },
  { key: 'customers.view', description: 'View customers' },
  { key: 'services.manage', description: 'Create, update, delete services and categories' },
  { key: 'services.view', description: 'View services and categories' },
  { key: 'bookings.manage', description: 'Update/cancel any booking, manage assignments' },
  { key: 'bookings.create', description: 'Create new bookings' },
  { key: 'bookings.view', description: 'View all bookings' },
  { key: 'bookings.view_own', description: 'View bookings assigned to the current employee' },
  { key: 'payments.create', description: 'Record payments against bookings' },
  { key: 'payments.view', description: 'View payment history' },
  { key: 'cash_handovers.view', description: 'View all cash handovers' },
  { key: 'cash_handovers.manage', description: 'Submit cash handovers for any employee, and reconcile/dispute them' },
  { key: 'reports.view', description: 'View dashboards and reports' },
  { key: 'expenses.manage', description: 'Create, update and delete expenses and expense categories' },
  { key: 'expenses.view', description: 'View expenses and expense categories' },
  { key: 'users.manage', description: 'Create, update and deactivate user accounts for the tenant' },
  { key: 'users.view', description: 'View user accounts for the tenant' },
  { key: 'banking.manage', description: 'Create, update and delete banks, bank accounts and transactions' },
  { key: 'banking.view', description: 'View banks, bank accounts, transactions and banking reports' },
  { key: 'sms.manage', description: 'Send promotional/informational SMS campaigns to customers' },
];

const ROLE_PERMISSIONS = {
  super_admin: ['platform.manage', 'tenants.manage'],

  tenant_owner: [
    'branches.manage',
    'branches.view',
    'employees.manage',
    'employees.view',
    'customers.manage',
    'customers.view',
    'services.manage',
    'services.view',
    'bookings.manage',
    'bookings.create',
    'bookings.view',
    'payments.create',
    'payments.view',
    'cash_handovers.view',
    'cash_handovers.manage',
    'reports.view',
    'expenses.manage',
    'expenses.view',
    'banking.manage',
    'banking.view',
    'users.manage',
    'users.view',
    'sms.manage',
  ],

  manager: [
    'branches.view',
    'employees.manage',
    'employees.view',
    'customers.manage',
    'customers.view',
    'services.manage',
    'services.view',
    'bookings.manage',
    'bookings.create',
    'bookings.view',
    'payments.create',
    'payments.view',
    'cash_handovers.view',
    'cash_handovers.manage',
    'reports.view',
    'expenses.manage',
    'expenses.view',
    'banking.manage',
    'banking.view',
    'sms.manage',
  ],

  receptionist: [
    'branches.view',
    'employees.view',
    'customers.manage',
    'customers.view',
    'services.view',
    'bookings.create',
    'bookings.view',
    'payments.create',
    'payments.view',
  ],

  employee: ['bookings.view_own'],
};

const getPermissionsForRole = (roleName) => ROLE_PERMISSIONS[roleName] || [];

module.exports = { ROLES, TENANT_ASSIGNABLE_ROLES, PERMISSIONS, ROLE_PERMISSIONS, getPermissionsForRole };
