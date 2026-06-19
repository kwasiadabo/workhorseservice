const ApiError = require('./ApiError');

// Merge a tenantId into a Sequelize `where` clause. Every service-layer
// query against a tenant-scoped model MUST go through this helper so that
// tenant isolation is enforced consistently in one place.
const withTenantScope = (tenantId, where = {}) => {
  if (!tenantId) {
    throw ApiError.forbidden('Missing tenant context');
  }
  return { ...where, tenantId };
};

// `findByPk` cannot easily be scoped via `where`, so after fetching a record
// by primary key, services must verify it belongs to the current tenant.
const assertTenantOwnership = (record, tenantId) => {
  if (!record || record.tenantId !== tenantId) {
    throw ApiError.notFound('Resource not found');
  }
  return record;
};

module.exports = { withTenantScope, assertTenantOwnership };
