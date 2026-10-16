/**
 * User persistence that works the same in MongoDB mode and in the local
 * mock-DB mode, so routes don't need two code paths.
 * Every function returns plain objects; password hashes never leave this
 * module except through findByEmailWithPassword.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const mockDb = require('../models/mockDb');

const isMock = () => process.env.MOCK_DB === 'true';

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
};

// Fields a user may change about themselves through the profile endpoint.
const EDITABLE_FIELDS = ['name', 'gender', 'height', 'weight', 'targetWeight', 'fitnessLevel', 'activityStatus', 'goal', 'diet', 'avatarUrl'];
const NUMERIC_FIELDS = new Set(['height', 'weight', 'targetWeight']);

function toPublicUser(raw) {
  if (!raw) return null;
  const u = typeof raw.toObject === 'function' ? raw.toObject() : raw;
  return {
    id: String(u._id || u.id),
    name: u.name,
    email: u.email,
    ...Object.fromEntries(Object.entries(PROFILE_DEFAULTS).map(([k, def]) => [k, u[k] ?? def])),
    favoriteWorkouts: (u.favoriteWorkouts || []).map(String),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/** Keep only editable profile fields that were actually provided. */
function pickProfileUpdates(body) {
  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] === undefined || body[field] === '') continue;
    updates[field] = NUMERIC_FIELDS.has(field) ? Number(body[field]) : body[field];
  }
  return updates;
}

async function findById(id) {
  if (isMock()) return toPublicUser(mockDb.findUserById(id));
  if (!mongoose.isValidObjectId(id)) return null;
  return toPublicUser(await User.findById(id));
}

/** Returns { user, passwordHash } for login checks, or null. */
async function findByEmailWithPassword(email) {
  if (isMock()) {
    const u = mockDb.findUserByEmail(email);
    return u ? { user: toPublicUser(u), passwordHash: u.password } : null;
  }
  const u = await User.findOne({ email }).select('+password');
  return u ? { user: toPublicUser(u), passwordHash: u.password } : null;
}

async function emailExists(email) {
  if (isMock()) return Boolean(mockDb.findUserByEmail(email));
  return Boolean(await User.exists({ email }));
}

async function create({ name, email, password, ...profile }) {
  const fields = { ...PROFILE_DEFAULTS, ...pickProfileUpdates(profile), name, email };
  if (isMock()) {
    const user = {
      ...fields,
      id: `mock-user-${crypto.randomUUID()}`,
      password: await bcrypt.hash(password, 12),
      favoriteWorkouts: [],
      customWorkoutImages: [],
      createdAt: new Date().toISOString(),
    };
    mockDb.addUser(user);
    return toPublicUser(user);
  }
  const user = new User({ ...fields, password }); // hashed by the model's pre-save hook
  await user.save();
  return toPublicUser(user);
}

async function updateProfile(id, body) {
  const updates = pickProfileUpdates(body);
  if (isMock()) return toPublicUser(mockDb.updateUser(id, updates));
  const user = await User.findById(id);
  if (!user) return null;
  Object.assign(user, updates);
  await user.save(); // runs schema validators (enums, min/max)
  return toPublicUser(user);
}

/** Read a raw array field (favoriteWorkouts / customWorkoutImages). */
async function getField(id, field) {
  if (isMock()) return mockDb.findUserById(id)?.[field] || [];
  const user = await User.findById(id).select(field).lean();
  return user?.[field] || [];
}

async function setField(id, field, value) {
  if (isMock()) {
    mockDb.updateUser(id, { [field]: value });
    return value;
  }
  await User.updateOne({ _id: id }, { $set: { [field]: value } });
  return value;
}

module.exports = {
  toPublicUser,
  findById,
  findByEmailWithPassword,
  emailExists,
  create,
  updateProfile,
  getField,
  setField,
};
