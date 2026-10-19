/**
 * Writing catalog programs, shared by the admin CMS and the creator studio.
 */
const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const { schemas } = require('../schemas/catalog');
const { validate } = require('../schemas/records');

class CatalogError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const slugify = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'program';

/** Validate a program and check every day points at a published workout. */
async function checkProgram(input) {
  const program = validate(schemas.program, input);
  const slugs = [...new Set(program.days.map((d) => d.workoutSlug))];
  const found = await prisma.workout.findMany({ where: { slug: { in: slugs }, isPublished: true }, select: { slug: true } });
  const missing = slugs.filter((s) => !found.some((w) => w.slug === s));
  if (missing.length) throw new CatalogError(`Unknown workouts: ${missing.join(', ')}`);
  return program;
}

const include = { days: { orderBy: [{ week: 'asc' }, { day: 'asc' }] }, creator: { select: { id: true, name: true } } };

function toPublic({ id: _id, ownerId: _o, generatedFrom: _g, days, creator, ...p }) {
  return {
    ...p,
    creator: creator ? { id: creator.id, name: creator.name } : null,
    days: days.map(({ id: _d, programId: _p, ...d }) => d),
  };
}

async function createProgram(input, { creatorId = null, status }) {
  const { days, ...fields } = await checkProgram(input);
  const created = await prisma.program.create({
    data: {
      ...fields,
      slug: `${slugify(fields.title)}-${crypto.randomBytes(3).toString('hex')}`,
      creatorId,
      status,
      isPublished: status === 'published',
      days: { create: days },
    },
    include,
  });
  return toPublic(created);
}

/** Replace a program's details and schedule. */
async function updateProgram(slug, input, extra = {}) {
  const { days, ...fields } = await checkProgram(input);
  const program = await prisma.program.findUnique({ where: { slug } });
  if (!program) throw new CatalogError('Program not found.', 404);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.programDay.deleteMany({ where: { programId: program.id } });
    return tx.program.update({
      where: { id: program.id },
      data: { ...fields, ...extra, days: { create: days } },
      include,
    });
  });
  return toPublic(updated);
}

module.exports = { CatalogError, checkProgram, createProgram, updateProgram, toPublic, include };
