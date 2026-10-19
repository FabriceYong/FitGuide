/**
 * Records that belong to one user (workout sessions, enrollments, body
 * metrics), with the same behaviour in MongoDB and mock mode. Every read and
 * write is scoped to a userId, so one user can never see or change another's
 * records, even with a guessed id.
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const mockDb = require('../models/mockDb');

const isMock = () => process.env.MOCK_DB === 'true';

function toPublic(raw) {
  if (!raw) return null;
  const obj = typeof raw.toObject === 'function' ? raw.toObject() : JSON.parse(JSON.stringify(raw));
  const { _id, __v, ...rest } = obj;
  return JSON.parse(JSON.stringify({ ...rest, id: String(_id || rest.id) })); // Dates → ISO strings
}

/**
 * @param {import('mongoose').Model} Model
 * @param {string} collection  Mock DB collection name
 */
function createOwnedStore(Model, collection) {
  /** Validate with the Mongoose schema in both modes, so mock mode enforces the same rules. */
  async function validated(fields) {
    const doc = new Model(fields);
    await doc.validate();
    return doc;
  }

  async function create(userId, fields) {
    const doc = await validated({ ...fields, userId: String(userId) });
    if (isMock()) {
      const now = new Date().toISOString();
      return toPublic(mockDb.insert(collection, { ...toPublic(doc), id: crypto.randomUUID(), createdAt: now, updatedAt: now }));
    }
    await doc.save();
    return toPublic(doc);
  }

  /**
   * The user's records, newest first by sortField.
   * @param {object} [where] Equality filters on top-level fields
   */
  async function list(userId, { where = {}, sortField = 'createdAt', limit } = {}) {
    if (isMock()) {
      const rows = mockDb.all(collection)
        .filter((r) => r.userId === String(userId) && Object.entries(where).every(([k, v]) => r[k] === v))
        .sort((a, b) => String(b[sortField]).localeCompare(String(a[sortField])));
      return (limit ? rows.slice(0, limit) : rows).map(toPublic);
    }
    let query = Model.find({ ...where, userId: String(userId) }).sort({ [sortField]: -1, _id: -1 });
    if (limit) query = query.limit(limit);
    return (await query).map(toPublic);
  }

  async function findOwned(userId, id) {
    if (isMock()) {
      return toPublic(mockDb.all(collection).find((r) => r.id === String(id) && r.userId === String(userId)));
    }
    if (!mongoose.isValidObjectId(id)) return null;
    return toPublic(await Model.findOne({ _id: id, userId: String(userId) }));
  }

  /**
   * Change a record with mutate(record), which edits it in place. The result is
   * re-validated against the schema before it is saved. Returns null if missing.
   */
  async function update(userId, id, mutate) {
    if (isMock()) {
      const existing = mockDb.all(collection).find((r) => r.id === String(id) && r.userId === String(userId));
      if (!existing) return null;
      const draft = JSON.parse(JSON.stringify(existing));
      mutate(draft);
      const { id: _ignored, createdAt, updatedAt, ...fields } = draft;
      const { id: _newId, ...clean } = toPublic(await validated(fields));
      return toPublic(mockDb.update(collection, existing.id, (r) => Object.assign(r, clean)));
    }
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await Model.findOne({ _id: id, userId: String(userId) });
    if (!doc) return null;
    mutate(doc);
    await doc.save();
    return toPublic(doc);
  }

  async function remove(userId, id) {
    if (isMock()) {
      const existing = mockDb.all(collection).find((r) => r.id === String(id) && r.userId === String(userId));
      return existing ? mockDb.remove(collection, existing.id) : false;
    }
    if (!mongoose.isValidObjectId(id)) return false;
    const { deletedCount } = await Model.deleteOne({ _id: id, userId: String(userId) });
    return deletedCount === 1;
  }

  return { create, list, findOwned, update, remove };
}

module.exports = { createOwnedStore };
