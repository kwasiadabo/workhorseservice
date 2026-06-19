const crypto = require('crypto');
const env = require('../config/env');

const verifyPaystackSignature = (req, res, next) => {
  const signature = req.headers['x-paystack-signature'];
  if (!signature) {
    return res.status(401).json({ success: false, message: 'Missing webhook signature' });
  }

  const hash = crypto
    .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest('hex');

  let signaturesMatch = false;
  try {
    signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    // Buffer lengths differ — signature is definitely invalid
    signaturesMatch = false;
  }

  if (!signaturesMatch) {
    return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
  }

  // Parse the raw buffer into JSON for downstream handlers
  try {
    req.body = JSON.parse(req.body.toString());
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }

  return next();
};

module.exports = { verifyPaystackSignature };
