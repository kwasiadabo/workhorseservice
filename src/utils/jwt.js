const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signAccessToken = (payload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });

const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);

// Refresh tokens are random opaque strings, not JWTs: the raw value is sent
// to the client as an httpOnly cookie, while only its SHA-256 hash is stored
// in the RefreshTokens table (so a leaked DB row cannot be used as a token).
const generateRefreshToken = () => crypto.randomBytes(64).toString('hex');

const hashRefreshToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const refreshTokenMaxAgeMs = () => parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN);

const refreshExpiryDate = () => new Date(Date.now() + refreshTokenMaxAgeMs());

// Minimal duration parser supporting the common JWT-style suffixes
// used by JWT_REFRESH_EXPIRES_IN (e.g. "7d", "15m", "12h", "30s").
function parseDurationToMs(duration) {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(String(duration).trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default: 7 days

  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * unitMs[unit];
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
  refreshTokenMaxAgeMs,
};
