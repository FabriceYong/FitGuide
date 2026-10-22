/**
 * User persistence. Every function returns plain public objects; password
 * hashes never leave this module except through findByEmailWithPassword.
 */
const bcrypt = require('bcryptjs');
const { prisma, isNotFound } = require('../db/prisma');

const BCRYPT_ROUNDS = 12;

const PROFILE_DEFAULTS = {
  gender: 'Prefer not to say',
  height: 170,
  weight: 70,
  targetWeight: 70,
  fitnessLevel: 'Beginner',
  activityStatus: 'Active',
  goal: 'Vitality',
  diet: 'Mediterranean Diet',
  avatarUrl: null,
  birthYear: null,
  showOnLeaderboards: true,
  // Training preferences: empty / null means not answered.
  focusAreas: [],
  equipment: [],
  limitations: [],
  workoutMinutes: null,
  daysPerWeek: null,
};

// Fields a user may change about themselves through the profile endpoint.
const EDITABLE_FIELDS = [
  'name', 'gender', 'height', 'weight', 'targetWeight', 'fitnessLevel', 'activityStatus', 'goal', 'diet', 'avatarUrl', 'birthYear', 'showOnLeaderboards',
  'focusAreas', 'equipment', 'limitations', 'workoutMinutes', 'daysPerWeek',
];
const NUMERIC_FIELDS = new Set(['height', 'weight', 'targetWeight', 'birthYear', 'workoutMinutes', 'daysPerWeek']);
const LIST_FIELDS = new Set(['focusAreas', 'equipment', 'limitations']);

const withFavorites = { favorites: { select: { workoutSlug: true }, orderBy: { createdAt: 'asc' } } };

function toPublicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    ...Object.fromEntries(Object.entries(PROFILE_DEFAULTS).map(([k, def]) => [k, u[k] ?? def])),
    favoriteWorkouts: (u.favorites || []).map((f) => f.workoutSlug),
    role: u.role || 'user',
    plan: u.plan || 'free',
    subscriptionStatus: u.subscriptionStatus || null,
    planRenewsAt: u.planRenewsAt || null,
    cancelAtPeriodEnd: Boolean(u.cancelAtPeriodEnd),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/** Keep only editable profile fields that were actually provided. */
function pickProfileUpdates(body) {
  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] === undefined || body[field] === '') continue;
    if (body[field] === null) updates[field] = LIST_FIELDS.has(field) ? [] : null; // clearing an optional field
    else if (LIST_FIELDS.has(field)) {
      const list = [...new Set(body[field])];
      // "No equipment" and a kit together means the kit.
      updates[field] = field === 'equipment' && list.length > 1 ? list.filter((k) => k !== 'none') : list;
    }
    else updates[field] = NUMERIC_FIELDS.has(field) ? Number(body[field]) : body[field];
  }
  return updates;
}

async function findById(id) {
  if (typeof id !== 'string') return null;
  return toPublicUser(await prisma.user.findUnique({ where: { id }, include: withFavorites }).catch(() => null));
}

/** Returns { user, passwordHash } for login checks, or null. */
async function findByEmailWithPassword(email) {
  const u = await prisma.user.findUnique({ where: { email }, include: withFavorites });
  return u ? { user: toPublicUser(u), passwordHash: u.passwordHash } : null;
}

/** Does this password match the user's? False for unknown users. */
async function checkPassword(id, password) {
  const u = await prisma.user.findUnique({ where: { id }, select: { passwordHash: true } });
  return Boolean(u && typeof password === 'string' && await bcrypt.compare(password, u.passwordHash));
}

async function setPassword(id, password) {
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) } });
}

async function emailExists(email) {
  return (await prisma.user.count({ where: { email } })) > 0;
}

async function create({ name, email, password, ...profile }) {
  const user = await prisma.user.create({
    data: {
      ...PROFILE_DEFAULTS,
      ...pickProfileUpdates(profile),
      name,
      email,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    },
    include: withFavorites,
  });
  return toPublicUser(user);
}

async function updateProfile(id, body) {
  try {
    const user = await prisma.user.update({ where: { id }, data: pickProfileUpdates(body), include: withFavorites });
    return toPublicUser(user);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

// ─── Favorites (workout slugs, oldest first) ─────────────────────────────────

async function getFavorites(userId) {
  const rows = await prisma.favorite.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  return rows.map((r) => r.workoutSlug);
}

async function addFavorite(userId, workoutSlug) {
  await prisma.favorite.upsert({
    where: { userId_workoutSlug: { userId, workoutSlug } },
    create: { userId, workoutSlug },
    update: {},
  });
  return getFavorites(userId);
}

async function removeFavorite(userId, workoutSlug) {
  await prisma.favorite.deleteMany({ where: { userId, workoutSlug } });
  return getFavorites(userId);
}

// ─── Custom workout images ───────────────────────────────────────────────────

async function getCustomImages(userId) {
  const rows = await prisma.customWorkoutImage.findMany({ where: { userId }, orderBy: { updatedAt: 'asc' } });
  return rows.map((r) => ({ workoutId: r.workoutSlug, customImageUrl: r.customImageUrl }));
}

async function setCustomImage(userId, workoutSlug, customImageUrl) {
  await prisma.customWorkoutImage.upsert({
    where: { userId_workoutSlug: { userId, workoutSlug } },
    create: { userId, workoutSlug, customImageUrl },
    update: { customImageUrl },
  });
}

async function removeCustomImage(userId, workoutSlug) {
  await prisma.customWorkoutImage.deleteMany({ where: { userId, workoutSlug } });
}

module.exports = {
  toPublicUser,
  findById,
  findByEmailWithPassword,
  checkPassword,
  setPassword,
  emailExists,
  create,
  updateProfile,
  getFavorites,
  addFavorite,
  removeFavorite,
  getCustomImages,
  setCustomImage,
  removeCustomImage,
};
