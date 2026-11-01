/**
 * Confirming the email of a new account. Registering emails a link to the
 * website's /verify-email page; the account can't sign in until it's used.
 *
 * Only a hash of each link's token is stored. A link works once and expires
 * after a day; sending a new one replaces it.
 */
const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const userStore = require('../stores/userStore');
const mailer = require('./mailer');

const LINK_TTL_MS = 24 * 60 * 60 * 1000;
// A second email this soon after the last one isn't sent, so "Resend" can't
// be used to flood someone's inbox.
const RESEND_AFTER_MS = 60 * 1000;

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

class VerificationError extends Error {
  constructor(message, status = 400, code = 'VERIFY_LINK_INVALID') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const verifyEmail = (name, link) => mailer.actionEmail({
  name,
  subject: 'Confirm your email for FitGuide',
  intro: 'Thanks for joining FitGuide. Confirm this is your email address to start using your account.',
  button: 'Confirm my email',
  link,
  note: "The link works once and expires in 24 hours. If you didn't create a FitGuide account, you can ignore this email.",
});

/**
 * Email a confirmation link to a user whose email isn't confirmed yet.
 * Sends nothing if it's confirmed, or if a link went out under a minute ago.
 * @param {{ id: string, name: string, email: string }} user
 */
async function sendLink(user) {
  const recent = await prisma.emailVerification.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESEND_AFTER_MS) } },
    select: { id: true },
  });
  if (recent) return;

  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.$transaction([
    prisma.emailVerification.deleteMany({ where: { userId: user.id } }),
    prisma.emailVerification.create({ data: { userId: user.id, tokenHash: hash(token), expiresAt: new Date(Date.now() + LINK_TTL_MS) } }),
  ]);
  const link = `${mailer.webBase()}/verify-email?token=${encodeURIComponent(token)}`;
  await mailer.send({ to: user.email, ...verifyEmail(user.name, link) });
}

/**
 * Send the link again for this address, if it belongs to an account that
 * isn't confirmed. Says nothing either way, so it can't reveal who has an account.
 */
async function resend(email) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, emailVerifiedAt: true } });
  if (user && !user.emailVerifiedAt) await sendLink(user);
}

/**
 * Use a confirmation link: mark the email confirmed.
 * @returns {Promise<object>} the user, to start a session for
 * @throws {VerificationError} if the link is unknown, used or expired
 */
async function confirm(token) {
  const row = typeof token === 'string' && token
    ? await prisma.emailVerification.findUnique({ where: { tokenHash: hash(token) } })
    : null;
  if (!row || row.expiresAt <= new Date()) {
    throw new VerificationError('This link has expired or was already used. Sign in to get a new one.');
  }
  // Claim the link atomically, so it can't be used twice at once.
  const { count } = await prisma.emailVerification.deleteMany({ where: { id: row.id } });
  if (!count) throw new VerificationError('This link has expired or was already used. Sign in to get a new one.');

  await prisma.user.updateMany({ where: { id: row.userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
  await prisma.emailVerification.deleteMany({ where: { userId: row.userId } });
  return userStore.findById(row.userId);
}

module.exports = { VerificationError, sendLink, resend, confirm, LINK_TTL_MS };
