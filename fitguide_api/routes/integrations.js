const express = require('express');
const integrations = require('../services/integrations');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof integrations.IntegrationError) return res.status(err.status).json({ success: false, message: err.message });
    return next(err);
  }
};

// ─── GET /api/integrations/:provider/callback ────────────────────────────────
// Where the provider sends the browser after sign-in. No session needed: the
// one-time state identifies the user. Redirects back to the web app.
router.get('/:provider/callback', handle(async (req, res) => {
  const { code, state, error } = req.query;
  res.redirect(302, await integrations.handleCallback(req.params.provider, { code, state, error }));
}));

router.use(authMiddleware);

// ─── GET /api/integrations ────────────────────────────────────────────────────
// Every supported service, whether it's available here and connected.
router.get('/', handle(async (req, res) => {
  res.json({ success: true, integrations: await integrations.list(req.user.id) });
}));

// ─── POST /api/integrations/:provider/connect ────────────────────────────────
// Returns the provider's sign-in URL for the browser to open.
router.post('/:provider/connect', handle(async (req, res) => {
  res.json({ success: true, url: await integrations.authorizeUrl(req.user.id, req.params.provider) });
}));

// ─── POST /api/integrations/:provider/sync ───────────────────────────────────
router.post('/:provider/sync', handle(async (req, res) => {
  res.json({ success: true, result: await integrations.sync(req.user.id, req.params.provider) });
}));

// ─── DELETE /api/integrations/:provider ──────────────────────────────────────
router.delete('/:provider', handle(async (req, res) => {
  await integrations.disconnect(req.user.id, req.params.provider);
  res.json({ success: true });
}));

module.exports = router;
