/**
 * "Forgot password": email a one-time link to the website's
 * /reset-password page, then set the new password from it.
 *
 * Only a hash of each link's token is stored. A link works once, expires
 * after an hour, and asking again replaces the previous link. Setting a new
 * password signs out every device.
 */
const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const userStore = require('../stores/userStore');
const authTokens = require('./authTokens');
const mailer = require('./mailer');

const LINK_TTL_MS = 60 * 60 * 1000;
// A second request this soon after the last one sends nothing, so the form
// can't be used to flood someone's inbox.
const RESEND_AFTER_MS = 60 * 1000;

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

class ResetError extends Error {
  constructor(message, status = 400, code = 'RESET_LINK_INVALID') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const resetEmail = (name, link) => mailer.actionEmail({
  name,
  subject: 'Reset your FitGuide password',
  intro: 'Someone (hopefully you) asked to reset the password for your FitGuide account.',
  button: 'Choose a new password',
  link,
  note: "The link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email: your password won't change.",
});

/**
 * Email a reset link if an account uses this address. Does nothing (and
 * says nothing) otherwise, so the form can't reveal who has an account.
 */
async function requestReset(email) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!user) return;
  const recent = await prisma.passwordReset.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESEND_AFTER_MS) } },
    select: { id: true },
  });
  if (recent) return;

  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.$transaction([
    prisma.passwordReset.deleteMany({ where: { userId: user.id } }),
    prisma.passwordReset.create({ data: { userId: user.id, tokenHash: hash(token), expiresAt: new Date(Date.now() + LINK_TTL_MS) } }),
  ]);
  const link = `${mailer.webBase()}/reset-password?token=${encodeURIComponent(token)}`;
  await mailer.send({ to: user.email, ...resetEmail(user.name, link) });
}

/**
 * Use a reset link: set the new password and sign out every device.
 * @returns {Promise<object>} the user, to start a session for
 * @throws {ResetError} if the link is unknown, used or expired
 */
async function resetPassword(token, password) {
  const row = typeof token === 'string' && token
    ? await prisma.passwordReset.findUnique({ where: { tokenHash: hash(token) } })
    : null;
  if (!row || row.expiresAt <= new Date()) {
    throw new ResetError('This reset link has expired or was already used. Ask for a new one.');
  }
  // Claim the link atomically, so it can't be used twice at once.
  const { count } = await prisma.passwordReset.deleteMany({ where: { id: row.id } });
  if (!count) throw new ResetError('This reset link has expired or was already used. Ask for a new one.');

  await userStore.setPassword(row.userId, password);
  // The link reached their inbox, so the email is confirmed too.
  await prisma.user.updateMany({ where: { id: row.userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
  await Promise.all([cancelLinks(row.userId), authTokens.revokeAll(row.userId)]);
  return userStore.findById(row.userId);
}

/** Void the user's outstanding links (their password changed another way). */
async function cancelLinks(userId) {
  await prisma.passwordReset.deleteMany({ where: { userId } });
}

module.exports = { ResetError, requestReset, resetPassword, cancelLinks, LINK_TTL_MS };
