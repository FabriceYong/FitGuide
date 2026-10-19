/**
 * The one Prisma client for the process. It is created on first use, so
 * DATABASE_URL is read then rather than when this module loads (tests point
 * it at their own database after requiring the app).
 */
const { PrismaClient } = require('@prisma/client');

let client = null;
const getClient = () => {
  client ??= new PrismaClient({
    log: process.env.PRISMA_LOG ? process.env.PRISMA_LOG.split(',') : ['warn', 'error'],
  });
  return client;
};

const prisma = new Proxy({}, {
  get(_target, prop) {
    const c = getClient();
    const value = c[prop];
    return typeof value === 'function' ? value.bind(c) : value;
  },
});

/** Prisma's "record not found" for update/delete with a where clause. */
const isNotFound = (err) => err?.code === 'P2025';

/** Prisma's unique-constraint violation. */
const isUniqueViolation = (err) => err?.code === 'P2002';

module.exports = { prisma, isNotFound, isUniqueViolation };
