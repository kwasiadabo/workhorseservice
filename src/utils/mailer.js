const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

const getTransporter = () => {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
};

// Sends an email via SMTP when configured. In environments without SMTP
// (e.g. local dev), logs the message to the console instead so links like
// password resets remain usable.
const sendMail = async ({ to, subject, text, html }) => {
  const client = getTransporter();

  if (!client) {
    console.info(`[mailer] SMTP not configured — logging email instead of sending.\nTo: ${to}\nSubject: ${subject}\n\n${text}`);
    return;
  }

  await client.sendMail({ from: env.MAIL_FROM, to, subject, text, html });
};

module.exports = { sendMail };
