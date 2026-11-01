/**
 * Sending email (password reset links) over SMTP.
 *
 * Set SMTP_URL (e.g. smtps://user:pass@smtp.example.com:465) and MAIL_FROM.
 * Any SMTP service works: Resend, Postmark, SendGrid, Mailgun, Amazon SES...
 * Without SMTP_URL, development servers print each email to the console
 * instead, so the links can still be followed; production logs a warning
 * and sends nothing.
 */
const nodemailer = require('nodemailer');

let transport = null;

const isConfigured = () => Boolean(transport || process.env.SMTP_URL);
const from = () => process.env.MAIL_FROM || 'FitGuide <no-reply@fitguide.app>';

/** Replace the transport (tests). Pass null to reset. */
const setTransport = (t) => { transport = t; };

/**
 * Send a plain-text email (with an optional HTML version).
 * @param {{ to: string, subject: string, text: string, html?: string }} message
 */
async function send({ to, subject, text, html }) {
  if (!isConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[mail] SMTP_URL is not set, so the email "${subject}" was not sent.`);
    } else {
      console.log(`[mail] SMTP_URL is not set; this email would have been sent:\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
    }
    return;
  }
  transport ??= nodemailer.createTransport(process.env.SMTP_URL);
  await transport.sendMail({ from: from(), to, subject, text, html });
}

module.exports = { send, setTransport, isConfigured };
