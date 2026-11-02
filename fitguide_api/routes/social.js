const express = require('express');
const { body, query } = require('express-validator');
const social = require('../services/social');
const feed = require('../services/feed');
const { authMiddleware } = require('../middleware/authMiddleware');
const { rejectInvalid } = require('../utils/validate');
const { tzOffsetFrom, today, isValidYmd, daysBetween } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware);

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof social.SocialError) return res.status(err.status).json({ success: false, message: err.message });
    return next(err);
  }
};
const todayFor = (req) => today(tzOffsetFrom(req));

// ─── Friends ──────────────────────────────────────────────────────────────────

// GET /api/social/friends — my code, friends and pending requests
router.get('/friends', handle(async (req, res) => {
  const [code, lists] = await Promise.all([social.friendCode(req.user.id), social.friendships(req.user.id)]);
  res.json({ success: true, friendCode: code, ...lists });
}));

// POST /api/social/friends { code }
router.post('/friends', [body('code').isString().trim().isLength({ min: 4, max: 20 }).withMessage('Enter a friend code')], rejectInvalid, handle(async (req, res) => {
  const result = await social.addFriend(req.user.id, req.body.code);
  res.status(201).json({ success: true, result });
}));

// POST /api/social/friends/:id/accept
router.post('/friends/:id/accept', handle(async (req, res) => {
  await social.acceptFriend(req.user.id, req.params.id);
  res.json({ success: true });
}));

// DELETE /api/social/friends/:id — decline, cancel or unfriend
router.delete('/friends/:id', handle(async (req, res) => {
  await social.removeFriend(req.user.id, req.params.id);
  res.json({ success: true });
}));

// ─── Feed ─────────────────────────────────────────────────────────────────────

// GET /api/social/feed?before= — my and my friends' workouts from the last 30
// days, newest first, with records set and cheers. nextBefore pages back.
router.get('/feed', [query('before').optional().isISO8601()], rejectInvalid, handle(async (req, res) => {
  const [page, shareActivity] = await Promise.all([feed.feed(req.user.id, { before: req.query.before }), feed.sharing(req.user.id)]);
  res.json({ success: true, ...page, shareActivity });
}));

// PUT /api/social/sharing { shareActivity } — whether friends see my workouts
router.put('/sharing', [body('shareActivity').isBoolean().toBoolean()], rejectInvalid, handle(async (req, res) => {
  await feed.setSharing(req.user.id, req.body.shareActivity);
  res.json({ success: true, shareActivity: req.body.shareActivity });
}));

// POST / DELETE /api/social/feed/:sessionId/cheer — cheer a friend's workout, or take it back
router.post('/feed/:sessionId/cheer', handle(async (req, res) => {
  await feed.cheer(req.user, req.params.sessionId);
  res.json({ success: true });
}));
router.delete('/feed/:sessionId/cheer', handle(async (req, res) => {
  await feed.uncheer(req.user.id, req.params.sessionId);
  res.json({ success: true });
}));

// GET /api/social/leaderboard?metric=minutes — me and my friends, last 7 days
router.get('/leaderboard', [query('metric').optional().isIn(Object.keys(social.METRICS))], rejectInvalid, handle(async (req, res) => {
  res.json({ success: true, ...(await social.weeklyLeaderboard(req.user.id, todayFor(req), req.query.metric || 'minutes')) });
}));

// ─── Challenges ───────────────────────────────────────────────────────────────

router.get('/challenges', handle(async (req, res) => {
  res.json({ success: true, metrics: social.METRICS, challenges: await social.listChallenges(req.user.id, todayFor(req)) });
}));

router.post(
  '/challenges',
  [
    body('title').isString().trim().isLength({ min: 3, max: 100 }).withMessage('Give the challenge a title (3–100 characters)'),
    body('description').optional().isString().trim().isLength({ max: 500 }),
    body('metric').isIn(Object.keys(social.METRICS)).withMessage('Choose what to count'),
    body('target').optional({ values: 'null' }).isInt({ min: 1, max: 10000000 }).toInt(),
    body('startDate').custom(isValidYmd).withMessage('startDate must be a date (YYYY-MM-DD)'),
    body('endDate').custom(isValidYmd).withMessage('endDate must be a date (YYYY-MM-DD)'),
    // Public challenges are created by admins (see the admin API).
    body('visibility').isIn(['friends', 'private']).withMessage('visibility must be friends or private'),
  ],
  rejectInvalid,
  handle(async (req, res) => {
    if (daysBetween(req.body.startDate, req.body.endDate) > 92) {
      return res.status(400).json({ success: false, message: 'Challenges can last up to about three months.' });
    }
    res.status(201).json({ success: true, challenge: await social.createChallenge(req.user.id, req.body, todayFor(req)) });
  }),
);

// POST /api/social/challenges/join { code } — join any challenge by its code
router.post('/challenges/join', [body('code').isString().trim().isLength({ min: 4, max: 20 })], rejectInvalid, handle(async (req, res) => {
  res.json({ success: true, challenge: await social.joinChallenge(req.user.id, { code: req.body.code }, todayFor(req)) });
}));

router.get('/challenges/:id', handle(async (req, res) => {
  res.json({ success: true, challenge: await social.getChallenge(req.user.id, req.params.id, todayFor(req)) });
}));

router.post('/challenges/:id/join', handle(async (req, res) => {
  res.json({ success: true, challenge: await social.joinChallenge(req.user.id, { id: req.params.id }, todayFor(req)) });
}));

router.delete('/challenges/:id/membership', handle(async (req, res) => {
  await social.leaveChallenge(req.user.id, req.params.id);
  res.json({ success: true });
}));

router.delete('/challenges/:id', handle(async (req, res) => {
  await social.deleteChallenge(req.user.id, req.params.id);
  res.json({ success: true });
}));

module.exports = router;
