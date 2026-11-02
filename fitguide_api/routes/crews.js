/**
 * Crews: small invite-only groups with a shared weekly goal, their
 * members' workouts and a chat (services/crews.js).
 */
const express = require('express');
const { body } = require('express-validator');
const crews = require('../services/crews');
const { authMiddleware } = require('../middleware/authMiddleware');
const { rejectInvalid } = require('../utils/validate');
const { tzOffsetFrom, today } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware);

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof crews.CrewError) return res.status(err.status).json({ success: false, message: err.message });
    return next(err);
  }
};
const show = async (req, res, id, status = 200) => {
  const tzOffset = tzOffsetFrom(req);
  res.status(status).json({ success: true, crew: await crews.get(req.user.id, id, today(tzOffset), tzOffset) });
};

const name = body('name').isString().trim().isLength({ min: 2, max: 50 }).withMessage('Name the crew (2–50 characters)');
const goal = body('weeklyGoal').isInt({ min: 1, max: 100 }).withMessage('The weekly goal must be 1–100 workouts').toInt();

// ─── GET /api/crews?tzOffset= ─────────────────────────────────────────────────
// My crews, with this week's workouts against the goal.
router.get('/', handle(async (req, res) => {
  const tzOffset = tzOffsetFrom(req);
  res.json({ success: true, crews: await crews.list(req.user.id, today(tzOffset), tzOffset), limits: { members: crews.MAX_MEMBERS, crews: crews.MAX_CREWS } });
}));

// ─── POST /api/crews { name, weeklyGoal } ─────────────────────────────────────
router.post('/', [name, goal], rejectInvalid, handle(async (req, res) => {
  await show(req, res, await crews.create(req.user.id, req.body), 201);
}));

// ─── POST /api/crews/join { code } ────────────────────────────────────────────
router.post('/join', [body('code').isString().trim().isLength({ min: 4, max: 20 }).withMessage('Enter an invite code')], rejectInvalid, handle(async (req, res) => {
  await show(req, res, await crews.join(req.user.id, req.body.code));
}));

// ─── GET /api/crews/:id?tzOffset= ─────────────────────────────────────────────
router.get('/:id', handle(async (req, res) => {
  await show(req, res, req.params.id);
}));

// ─── PATCH /api/crews/:id { name?, weeklyGoal? } (owner) ─────────────────────
router.patch('/:id', [name.optional(), goal.optional()], rejectInvalid, handle(async (req, res) => {
  await crews.update(req.user.id, req.params.id, req.body);
  await show(req, res, req.params.id);
}));

// ─── POST /api/crews/:id/messages { text } ────────────────────────────────────
router.post(
  '/:id/messages',
  [body('text').isString().trim().isLength({ min: 1, max: 500 }).withMessage('Write a message of up to 500 characters')],
  rejectInvalid,
  handle(async (req, res) => {
    res.status(201).json({ success: true, message: await crews.say(req.user, req.params.id, req.body.text) });
  }),
);

// ─── DELETE /api/crews/:id/membership — leave ────────────────────────────────
router.delete('/:id/membership', handle(async (req, res) => {
  await crews.leave(req.user.id, req.params.id);
  res.json({ success: true });
}));

// ─── DELETE /api/crews/:id/members/:userId — the owner removes someone ───────
router.delete('/:id/members/:userId', handle(async (req, res) => {
  await crews.remove(req.user.id, req.params.id, req.params.userId);
  res.json({ success: true });
}));

module.exports = router;
