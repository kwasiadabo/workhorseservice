'use strict';

const https = require('https');
const http = require('http');
const env = require('../config/env');

const TIMEOUT_MS = 10_000;

/**
 * Send an SMS via Nalo Solutions.
 * Falls back to console.info when NALO_API_KEY / NALO_API_URL are not set.
 *
 * @param {string} to   E.164 phone number, e.g. "+233201234567"
 * @param {string} body Message text
 * @returns {Promise<{messageId?: string}>}
 */
const sendSms = async (to, body) => {
  if (!env.NALO_API_KEY || !env.NALO_API_URL) {
    console.info(`[sms] Nalo not configured — would send to ${to}:\n${body}`);
    return {};
  }

  // Nalo expects bare digits without '+': 233XXXXXXXXX
  const msisdn = to.startsWith('+') ? to.slice(1) : to;

  const payload = JSON.stringify({
    key: env.NALO_API_KEY,
    msisdn,
    message: body,
    sender_id: env.NALO_SENDER_ID,
  });

  return new Promise((resolve, reject) => {
    const url = new URL(env.NALO_API_URL);
    const transport = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Nalo SMS request failed with status ${res.statusCode}: ${data.slice(0, 200)}`));
        }
        try {
          const parsed = JSON.parse(data);
          resolve({ messageId: parsed?.msgid ?? parsed?.message_id ?? parsed?.id ?? null });
        } catch {
          // Non-JSON 2xx response (e.g. plain "1000 OK") — treat as success
          resolve({ messageId: null });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('Nalo SMS request timed out')));
    req.write(payload);
    req.end();
  });
};

/**
 * Normalise a Ghanaian phone number to E.164 (+233...).
 * Handles: 0XX, 233XX, +233XX, and bare 9-digit numbers.
 */
const normalisePhone = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('233') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+233${digits.slice(1)}`;
  if (digits.length === 9) return `+233${digits}`;
  return phone;
};

module.exports = { sendSms, normalisePhone };
