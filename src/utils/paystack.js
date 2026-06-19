const https = require('https');
const env = require('../config/env');

const BASE_HOST = 'api.paystack.co';
const TIMEOUT_MS = 10_000;

function paystackRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: BASE_HOST,
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.status) {
            return reject(new Error(parsed.message || 'Paystack request failed'));
          }
          resolve(parsed.data);
        } catch {
          reject(new Error('Invalid JSON response from Paystack'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error('Paystack request timed out'));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

const initializeTransaction = ({ email, amountInPesewas, reference, callbackUrl, metadata }) =>
  paystackRequest('POST', '/transaction/initialize', {
    email,
    amount: String(amountInPesewas),
    reference,
    callback_url: callbackUrl,
    metadata,
  });

const verifyTransaction = (reference) =>
  paystackRequest('GET', `/transaction/verify/${encodeURIComponent(reference)}`);

const createCustomer = async ({ email, firstName, lastName }) => {
  try {
    return await paystackRequest('POST', '/customer', {
      email,
      first_name: firstName,
      last_name: lastName,
    });
  } catch {
    return null;
  }
};

const generateReference = (tenantId) =>
  `WH-${tenantId.slice(0, 8)}-${Date.now()}`;

module.exports = { initializeTransaction, verifyTransaction, createCustomer, generateReference };
