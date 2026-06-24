const { withTenantScope, assertTenantOwnership } = require('../tenantScope');
const ApiError = require('../ApiError');

describe('withTenantScope', () => {
  it('merges tenantId into an empty where clause', () => {
    expect(withTenantScope('tenant-1')).toEqual({ tenantId: 'tenant-1' });
  });

  it('merges tenantId into an existing where clause without dropping other filters', () => {
    expect(withTenantScope('tenant-1', { status: 'active' })).toEqual({
      status: 'active',
      tenantId: 'tenant-1',
    });
  });

  it('throws a 403 ApiError when tenantId is missing — a query must never run unscoped', () => {
    expect(() => withTenantScope(undefined, { status: 'active' })).toThrow(ApiError);
    try {
      withTenantScope(null, {});
    } catch (err) {
      expect(err.statusCode).toBe(403);
    }
  });
});

describe('assertTenantOwnership', () => {
  it('returns the record when it belongs to the given tenant', () => {
    const record = { id: '1', tenantId: 'tenant-1' };
    expect(assertTenantOwnership(record, 'tenant-1')).toBe(record);
  });

  it('throws a 404 (not 403) when the record belongs to a different tenant', () => {
    // 404 rather than 403 is the point — cross-tenant probing can't tell
    // "doesn't exist" from "exists, belongs to someone else".
    const record = { id: '1', tenantId: 'tenant-2' };
    expect(() => assertTenantOwnership(record, 'tenant-1')).toThrow(ApiError);
    try {
      assertTenantOwnership(record, 'tenant-1');
    } catch (err) {
      expect(err.statusCode).toBe(404);
    }
  });

  it('throws a 404 when the record does not exist', () => {
    expect(() => assertTenantOwnership(null, 'tenant-1')).toThrow(ApiError);
    try {
      assertTenantOwnership(undefined, 'tenant-1');
    } catch (err) {
      expect(err.statusCode).toBe(404);
    }
  });
});
