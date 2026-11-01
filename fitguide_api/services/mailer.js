/**
 * Sending email (confirm-your-email and password reset links) over SMTP.
 *
 * Set SMTP_URL (e.g. smtps://user:pass@smtp.example.com:465) and MAIL_FROM.
 * Any SMTP service works: Resend, Postmark, SendGrid, Mailgun, Amazon SES...
 * Without SMTP_URL, development servers print each email to the console
 * instead, so the links can still be followed; production logs a warning
 * and sends nothing.
 */
const nodemailer = require('nodemailer');
const { getCorsOrigins } = require('../utils/config');

let transport = null;

const isConfigured = () => Boolean(transport || process.env.SMTP_URL);
const from = () => process.env.MAIL_FROM || 'FitGuide <no-reply@fitguide.app>';

/** Where links in emails point: the website (WEB_APP_URL, else the first CORS origin). */
const webBase = () => (process.env.WEB_APP_URL || getCorsOrigins()[0] || 'http://localhost:3000').replace(/\/+$/, '');

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * An email built around one button: a greeting, why it was sent, the
 * button (and its link, to paste), then a note. Text and HTML versions.
 * @param {{ name?: string, subject: string, intro: string, button: string, link: string, note: string }} parts
 */
function actionEmail({ name, subject, intro, button, link, note }) {
  const firstName = String(name || '').trim().split(/\s+/)[0] || 'there';
  const text = [`Hi ${firstName},`, '', intro, '', `${button}: ${link}`, '', note, '', 'FitGuide'].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">
<p>Hi ${escapeHtml(firstName)},</p>
<p>${escapeHtml(intro)}</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#00C4B4;color:#0b0b0f;font-weight:bold;text-decoration:none">${escapeHtml(button)}</a></p>
<p style="color:#555;font-size:13px">Or paste this link into your browser:<br>${escapeHtml(link)}</p>
<p style="color:#555;font-size:13px">${escapeHtml(note)}</p>
</div>`;
  return { subject, text, html };
}

/** Replace the transport (tests). Pass null to reset. */
const setTransport = (t) => { transport = t; };

/**
 * Send a plain-text email (with an optional HTML version).
 * @param {{ to: string, subject: string, text: string, html?: string }} message
 */
async function send({ to, subject, text, html }) {
  if (!isConfigured()) {
    if (process.env.NODE_ENV === 'test') return; // tests set a transport when they read the emails
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

module.exports = { send, setTransport, isConfigured, actionEmail, webBase };
