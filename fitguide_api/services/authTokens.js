/**
 * Refresh tokens. Each sign-in starts a token "family"; every refresh swaps
 * the presented token for a new one in the same family. Only a hash is
 * stored. If an already-used token is presented again (it was stolen, or
 * replayed), the whole family is revoked, which signs out both the thief and
 * the real user.
 */
const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const { refreshTtlMs } = require('../utils/jwt');

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(48).toString('base64url');

async function insert(tx, userId, family) {
  const token = newToken();
  const row = await tx.refreshToken.create({
    data: { userId, family, tokenHash: hash(token), expiresAt: new Date(Date.now() + refreshTtlMs()) },
  });
  return { token, row };
}

/** Start a new family for a fresh sign-in. Returns the raw refresh token. */
async function issue(userId) {
  const { token } = await insert(prisma, userId, crypto.randomUUID());
  return token;
}

/**
 * Exchange a refresh token for a new one.
 * @returns {Promise<{ ok: true, userId: string, token: string } | { ok: false, reason: 'unknown' | 'expired' | 'reused' }>}
 */
async function rotate(rawToken) {
  if (typeof rawToken !== 'string' || !rawToken) return { ok: false, reason: 'unknown' };
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const current = await tx.refreshToken.findUnique({ where: { tokenHash: hash(rawToken) } });
    if (!current) return { ok: false, reason: 'unknown' };
    if (current.revokedAt) {
      await tx.refreshToken.updateMany({ where: { family: current.family, revokedAt: null }, data: { revokedAt: now } });
      return { ok: false, reason: 'reused' };
    }
    if (current.expiresAt <= now) return { ok: false, reason: 'expired' };

    // Claim the token atomically, so two concurrent refreshes can't both win.
    const { count } = await tx.refreshToken.updateMany({ where: { id: current.id, revokedAt: null }, data: { revokedAt: now } });
    if (!count) return { ok: false, reason: 'reused' };
    const next = await insert(tx, current.userId, current.family);
    await tx.refreshToken.update({ where: { id: current.id }, data: { replacedBy: next.row.id } });
    return { ok: true, userId: current.userId, token: next.token };
  });
}

/** Revoke the family a token belongs to (sign-out). */
async function revoke(rawToken) {
  if (typeof rawToken !== 'string' || !rawToken) return;
  const current = await prisma.refreshToken.findUnique({ where: { tokenHash: hash(rawToken) } });
  if (!current) return;
  await prisma.refreshToken.updateMany({ where: { family: current.family, revokedAt: null }, data: { revokedAt: new Date() } });
}

/** Revoke every family the user has (password change, account deletion): signs out all their devices. */
async function revokeAll(userId) {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

module.exports = { issue, rotate, revoke, revokeAll };
