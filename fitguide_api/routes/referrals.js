/** Invites: the member's invite code and how their invites have gone (services/referrals.js). */
const express = require('express');
const referrals = require('../services/referrals');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// ─── GET /api/referrals ───────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, referrals: await referrals.info(req.user.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
