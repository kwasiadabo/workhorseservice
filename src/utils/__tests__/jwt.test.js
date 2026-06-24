const {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenMaxAgeMs,
  refreshExpiryDate,
} = require('../jwt');

describe('access tokens', () => {
  it('round-trips a payload through sign/verify', () => {
    const token = signAccessToken({ sub: 'user-1', tenantId: 'tenant-1', role: 'tenant_owner' });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.tenantId).toBe('tenant-1');
    expect(decoded.role).toBe('tenant_owner');
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken({ sub: 'user-1' });
    const tampered = `${token.slice(0, -1)}${token.slice(-1) === 'a' ? 'b' : 'a'}`;
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe('refresh tokens', () => {
  it('generates a 64-byte (128 hex char) opaque token, different every call', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).toHaveLength(128);
    expect(a).not.toBe(b);
  });

  it('hashes deterministically — same input always produces the same hash', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it('the stored hash never equals the raw token — a leaked DB row alone is not a usable token', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).not.toBe(token);
  });
});

describe('refresh token expiry duration parsing', () => {
  it('refreshTokenMaxAgeMs / refreshExpiryDate agree with each other within a tolerance', () => {
    const maxAgeMs = refreshTokenMaxAgeMs();
    const expiry = refreshExpiryDate();
    const expectedExpiry = Date.now() + maxAgeMs;
    expect(Math.abs(expiry.getTime() - expectedExpiry)).toBeLessThan(1000);
  });
});
