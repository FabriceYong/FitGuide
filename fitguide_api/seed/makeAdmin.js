/**
 * npm run make-admin -- someone@example.com [--role creator]
 * Give an existing account the admin (or creator) role.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { prisma } = require('../db/prisma');

async function main() {
  const [email] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const roleFlag = process.argv.indexOf('--role');
  const role = roleFlag !== -1 ? process.argv[roleFlag + 1] : 'admin';
  if (!email || !['admin', 'creator', 'user'].includes(role)) {
    console.error('Usage: npm run make-admin -- <email> [--role admin|creator|user]');
    process.exitCode = 1;
    return;
  }
  const { count } = await prisma.user.updateMany({ where: { email: email.toLowerCase() }, data: { role } });
  if (!count) {
    console.error(`No account with the email ${email}. Sign up first.`);
    process.exitCode = 1;
    return;
  }
  console.log(`${email} is now ${role === 'admin' ? 'an admin' : `a ${role}`}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
