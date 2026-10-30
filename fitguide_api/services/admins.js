/**
 * ADMIN_EMAILS: accounts that should be admins, so the first admin needs no
 * command. Applied when the API starts, to accounts that already exist only:
 * someone who signs up later with a listed email isn't promoted until the
 * next start, so create your own account before listing it.
 */
const { prisma } = require('../db/prisma');

/** The emails in ADMIN_EMAILS, lowercased (comma or space separated). */
const adminEmails = () => [...new Set((process.env.ADMIN_EMAILS || '')
  .split(/[\s,]+/)
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean))];

/**
 * Make the listed accounts admins. Never removes a role.
 * @returns {Promise<{ promoted: string[], missing: string[] }>}
 */
async function promoteConfiguredAdmins() {
  const emails = adminEmails();
  if (!emails.length) return { promoted: [], missing: [] };
  const found = await prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true, role: true } });
  const promoted = found.filter((u) => u.role !== 'admin').map((u) => u.email);
  if (promoted.length) await prisma.user.updateMany({ where: { email: { in: promoted } }, data: { role: 'admin' } });
  return { promoted, missing: emails.filter((email) => !found.some((u) => u.email === email)) };
}

module.exports = { adminEmails, promoteConfiguredAdmins };
