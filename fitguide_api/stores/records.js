/**
 * Stores for training data.
 *  - Catalog (read-only, by slug): exercises, programs.
 *  - Per-user records: workout sessions, program enrollments, body metrics.
 *
 * Per-user stores scope every read and write to a userId, so one user can
 * never see or change another's records, even with a guessed id. Records are
 * returned as plain JSON-ready objects (dates as ISO strings) with their child
 * rows (session sets, completed program days) inlined as arrays.
 */
const { prisma } = require('../db/prisma');
const { schemas, validate } = require('../schemas/records');

/** Dates → ISO strings, like the JSON the API sends. */
const plain = (value) => JSON.parse(JSON.stringify(value));
const withoutNulls = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null));

// ─── Catalog ─────────────────────────────────────────────────────────────────

const catalogPublic = ({ id: _uuid, ...rest }) => plain({ id: rest.slug, ...rest });

const exerciseCatalog = {
  async all() {
    return (await prisma.exercise.findMany({ orderBy: [{ createdAt: 'asc' }, { slug: 'asc' }] })).map(catalogPublic);
  },
  async getBySlug(slug) {
    const exercise = await prisma.exercise.findUnique({ where: { slug: String(slug) } });
    return exercise ? catalogPublic(exercise) : null;
  },
};

const programInclude = { days: { orderBy: [{ week: 'asc' }, { day: 'asc' }] } };
const programPublic = ({ days, ownerId, generatedFrom, ...program }) => ({
  ...catalogPublic(program),
  isPersonal: Boolean(ownerId),
  ...(generatedFrom && { generatedFrom }),
  days: days.map(({ id: _id, programId: _p, notes, ...d }) => (notes ? { ...d, notes } : d)),
});

/**
 * Published catalog programs, plus the user's own personal plans when a
 * userId is given. Personal plans are never visible to anyone else.
 */
const visibleTo = (userId) => (userId
  ? { OR: [{ isPublished: true, ownerId: null }, { ownerId: String(userId) }] }
  : { isPublished: true, ownerId: null });

const programStore = {
  async all({ userId } = {}) {
    const programs = await prisma.program.findMany({
      where: visibleTo(userId),
      include: programInclude,
      orderBy: [{ createdAt: 'asc' }, { slug: 'asc' }],
    });
    return programs.map(programPublic);
  },
  async getBySlug(slug, { userId } = {}) {
    const program = await prisma.program.findFirst({ where: { ...visibleTo(userId), slug: String(slug) }, include: programInclude });
    return program ? programPublic(program) : null;
  },
};

/** Lowercase words only: "Child's Pose" → "child s pose", "Push-Ups" → "push ups". */
const normalizeName = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Find the library exercise a free-text name refers to: an exact name/alias
 * match first, otherwise the longest name/alias that starts a word in it
 * ("Barbell Back Squats — Set 2 of 4" → back-squat).
 */
function matchExercise(name, exercises) {
  const text = normalizeName(name);
  if (!text) return null;
  let best = null;
  for (const exercise of exercises) {
    for (const candidate of [exercise.slug.replace(/-/g, ' '), normalizeName(exercise.name), ...(exercise.aliases || []).map(normalizeName)]) {
      if (!candidate) continue;
      if (candidate === text) return exercise;
      const at = ` ${text} `.indexOf(` ${candidate}`);
      if (at !== -1 && (!best || candidate.length > best.length)) best = { exercise, length: candidate.length };
    }
  }
  return best ? best.exercise : null;
}

const exerciseStore = { ...exerciseCatalog, normalizeName, matchExercise };

// ─── Per-user records ────────────────────────────────────────────────────────

/**
 * @param {object} config
 * @param {string} config.model   Prisma model delegate name
 * @param {import('zod').ZodObject} config.schema  Validates the record's fields (without userId)
 * @param {object} [config.child] An array field stored as child rows
 * @param {string} config.child.field     Field name in the public record (and the Prisma relation)
 * @param {string} config.child.model     Prisma delegate for the child rows
 * @param {string} config.child.parentKey Foreign key column on the child
 * @param {object} config.child.orderBy
 * @param {(item: object, index: number) => object} config.child.toRow
 * @param {(row: object) => object} config.child.fromRow
 */
function createOwnedStore({ model, schema, child }) {
  const delegate = () => prisma[model];
  const include = child ? { [child.field]: { orderBy: child.orderBy } } : undefined;

  const toPublic = (row) => {
    if (!row) return null;
    if (!child) return plain(row);
    return plain({ ...row, [child.field]: row[child.field].map(child.fromRow) });
  };

  /** Validate, then split into scalar columns and child rows. */
  const prepare = (fields) => {
    const data = validate(schema, fields);
    if (!child) return { scalars: data, children: null };
    const { [child.field]: items, ...scalars } = data;
    return { scalars, children: items.map(child.toRow) };
  };

  async function create(userId, fields) {
    const { scalars, children } = prepare(fields);
    const row = await delegate().create({
      data: { ...scalars, userId: String(userId), ...(child && { [child.field]: { create: children } }) },
      include,
    });
    return toPublic(row);
  }

  /**
   * The user's records, newest first by sortField.
   * @param {object} [where] Equality filters on columns
   */
  async function list(userId, { where = {}, sortField = 'createdAt', limit } = {}) {
    const rows = await delegate().findMany({
      where: { ...where, userId: String(userId) },
      orderBy: [{ [sortField]: 'desc' }, { createdAt: 'desc' }],
      ...(limit && { take: limit }),
      include,
    });
    return rows.map(toPublic);
  }

  async function findOwned(userId, id) {
    if (typeof id !== 'string') return null;
    return toPublic(await delegate().findFirst({ where: { id, userId: String(userId) }, include }));
  }

  /**
   * Change a record with mutate(record), which edits a copy in place. The
   * result is re-validated before it is saved. Returns null if missing.
   */
  async function update(userId, id, mutate) {
    const existing = await findOwned(userId, id);
    if (!existing) return null;
    const draft = plain(existing);
    mutate(draft);
    const { id: _id, userId: _u, createdAt: _c, updatedAt: _up, ...fields } = draft;
    const { scalars, children } = prepare(fields);
    await prisma.$transaction(async (tx) => {
      await tx[model].update({ where: { id: existing.id }, data: scalars });
      if (child) {
        await tx[child.model].deleteMany({ where: { [child.parentKey]: existing.id } });
        if (children.length) {
          await tx[child.model].createMany({ data: children.map((c) => ({ ...c, [child.parentKey]: existing.id })) });
        }
      }
    });
    return findOwned(userId, existing.id);
  }

  async function remove(userId, id) {
    if (typeof id !== 'string') return false;
    const { count } = await delegate().deleteMany({ where: { id, userId: String(userId) } });
    return count === 1;
  }

  return { create, list, findOwned, update, remove };
}

const sessionStore = createOwnedStore({
  model: 'workoutSession',
  schema: schemas.workoutSession,
  child: {
    field: 'sets',
    model: 'setLog',
    parentKey: 'sessionId',
    orderBy: { position: 'asc' },
    toRow: (set, position) => ({ ...set, position }),
    // Sets only carry the measurements that were logged; exerciseSlug is
    // always present (null when the name matched nothing in the library).
    fromRow: ({ id: _id, sessionId: _s, position: _p, exerciseSlug, ...set }) => ({ exerciseSlug, ...withoutNulls(set) }),
  },
});

const enrollmentStore = createOwnedStore({
  model: 'enrollment',
  schema: schemas.enrollment,
  child: {
    field: 'completedDays',
    model: 'enrollmentDay',
    parentKey: 'enrollmentId',
    orderBy: { completedAt: 'asc' },
    toRow: (d) => d,
    fromRow: ({ enrollmentId: _e, ...d }) => d,
  },
});

const bodyMetricStore = createOwnedStore({ model: 'bodyMetric', schema: schemas.bodyMetric });

module.exports = { exerciseStore, programStore, sessionStore, enrollmentStore, bodyMetricStore };
