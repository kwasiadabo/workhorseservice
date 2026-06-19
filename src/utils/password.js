const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const hashPassword = async (plainPassword) => bcrypt.hash(plainPassword, env.BCRYPT_SALT_ROUNDS);

const comparePassword = async (plainPassword, passwordHash) => bcrypt.compare(plainPassword, passwordHash);

// Characters chosen to avoid visually ambiguous glyphs (0/O, 1/l/I) when an
// admin reads a temporary password aloud or copies it to share with a user.
const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';

// Generates a one-time temporary password for admin-initiated resets. The
// caller must hash it before storing and the user must change it
// (`mustChangePassword: true`) before using the account further.
const generateTemporaryPassword = (length = 12) =>
  Array.from(crypto.randomBytes(length), (byte) => TEMP_PASSWORD_CHARS[byte % TEMP_PASSWORD_CHARS.length]).join('');

module.exports = { hashPassword, comparePassword, generateTemporaryPassword };
