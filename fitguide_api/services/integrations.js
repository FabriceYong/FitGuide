/**
 * Wearable and fitness-service connections over OAuth 2.0.
 *
 *  - Strava: activities (runs, rides, ...) become ExternalActivity rows.
 *  - Fitbit: daily steps, resting heart rate, active calories and sleep
 *    become DailyMetric rows.
 *
 * A provider is available when its client id and secret are set. The OAuth
 * state and PKCE verifier are kept server-side (OAuthState); tokens are
 * stored encrypted and refreshed when they expire.
 *
 * Apple Health has no web API (data stays on the iPhone) and Google Fit's
 * REST API is being shut down, so those users import a CSV instead
 * (services/healthData.js).
 */
const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const { encrypt, decrypt } = require('../utils/crypto');
const { getCorsOrigins } = require('../utils/config');
const { localDate, addDays } = require('../utils/dates');

const STATE_TTL_MS = 10 * 60 * 1000;
const SYNC_DAYS = 14;

// Replaceable for tests.
let http = (...args) => fetch(...args);
const setHttp = (fn) => { http = fn || ((...args) => fetch(...args)); };

class IntegrationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const apiBase = () => (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5001}`).replace(/\/+$/, '');
const webBase = () => (process.env.WEB_APP_URL || getCorsOrigins()[0] || 'http://localhost:3000').replace(/\/+$/, '');
const redirectUri = (provider) => `${apiBase()}/api/integrations/${provider}/callback`;

async function json(res, what) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new IntegrationError(`${what} failed (HTTP ${res.status}).`, res.status === 401 ? 401 : 502);
    err.body = body;
    throw err;
  }
  return body;
}

const form = (fields) => new URLSearchParams(Object.entries(fields).filter(([, v]) => v != null));

// ─── Providers ───────────────────────────────────────────────────────────────

const PROVIDERS = {
  strava: {
    name: 'Strava',
    description: 'Runs, rides and other activities',
    env: ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET'],
    authorizeUrl: 'https://www.strava.com/oauth/authorize',
    scope: 'read,activity:read_all',
    pkce: false,
    authorizeParams: { approval_prompt: 'auto' },

    async exchange({ code, refreshToken }) {
      const res = await http('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          ...(code ? { grant_type: 'authorization_code', code } : { grant_type: 'refresh_token', refresh_token: refreshToken }),
        }),
      });
      const t = await json(res, 'Strava sign-in');
      return {
        accessToken: t.access_token,
        refreshToken: t.refresh_token,
        expiresAt: t.expires_at ? new Date(t.expires_at * 1000) : null,
        externalUserId: t.athlete?.id != null ? String(t.athlete.id) : undefined,
      };
    },

    async sync({ userId, accessToken, since }) {
      const url = `https://www.strava.com/api/v3/athlete/activities?per_page=100&after=${Math.floor(since.getTime() / 1000)}`;
      const activities = await json(await http(url, { headers: { Authorization: `Bearer ${accessToken}` } }), 'Strava activities');
      let saved = 0;
      for (const a of activities || []) {
        const data = {
          type: String(a.sport_type || a.type || 'workout').toLowerCase(),
          name: String(a.name || 'Strava activity').slice(0, 200),
          startedAt: new Date(a.start_date),
          durationSec: Math.round(a.moving_time || a.elapsed_time || 0),
          distanceM: a.distance ?? null,
          // Summary activities report kilojoules for rides; ~1 kJ of work ≈ 1 kcal burned.
          calories: a.calories != null ? Math.round(a.calories) : a.kilojoules != null ? Math.round(a.kilojoules) : null,
          avgHr: a.average_heartrate != null ? Math.round(a.average_heartrate) : null,
        };
        await prisma.externalActivity.upsert({
          where: { provider_externalId: { provider: 'strava', externalId: String(a.id) } },
          create: { ...data, userId, provider: 'strava', externalId: String(a.id) },
          update: data,
        });
        saved += 1;
      }
      return { activities: saved };
    },
  },

  fitbit: {
    name: 'Fitbit',
    description: 'Steps, resting heart rate, active calories and sleep',
    env: ['FITBIT_CLIENT_ID', 'FITBIT_CLIENT_SECRET'],
    authorizeUrl: 'https://www.fitbit.com/oauth2/authorize',
    scope: 'activity heartrate sleep',
    pkce: true,
    authorizeParams: {},

    async exchange({ code, codeVerifier, refreshToken }) {
      const basic = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64');
      const res = await http('https://api.fitbit.com/oauth2/token', {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form(code
          ? { grant_type: 'authorization_code', code, code_verifier: codeVerifier, redirect_uri: redirectUri('fitbit'), client_id: process.env.FITBIT_CLIENT_ID }
          : { grant_type: 'refresh_token', refresh_token: refreshToken }),
      });
      const t = await json(res, 'Fitbit sign-in');
      return {
        accessToken: t.access_token,
        refreshToken: t.refresh_token,
        expiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null,
        externalUserId: t.user_id,
        scopes: t.scope,
      };
    },

    async sync({ userId, accessToken, since }) {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const start = localDate(since, 0);
      const today = localDate(Date.now(), 0);
      let days = 0;
      for (let date = start; date <= today; date = addDays(date, 1)) {
        const activity = await json(await http(`https://api.fitbit.com/1/user/-/activities/date/${date}.json`, { headers }), 'Fitbit activity');
        const sleep = await json(await http(`https://api.fitbit.com/1.2/user/-/sleep/date/${date}.json`, { headers }), 'Fitbit sleep');
        const s = activity?.summary || {};
        const data = {
          steps: Number.isFinite(s.steps) ? s.steps : null,
          restingHr: Number.isFinite(s.restingHeartRate) ? s.restingHeartRate : null,
          activeCalories: Number.isFinite(s.activityCalories) ? s.activityCalories : null,
          sleepMinutes: Number.isFinite(sleep?.summary?.totalMinutesAsleep) && sleep.summary.totalMinutesAsleep > 0 ? sleep.summary.totalMinutesAsleep : null,
        };
        await prisma.dailyMetric.upsert({
          where: { userId_date_source: { userId, date, source: 'fitbit' } },
          create: { ...data, userId, date, source: 'fitbit' },
          update: data,
        });
        days += 1;
      }
      return { days };
    },
  },
};

const isConfigured = (provider) => PROVIDERS[provider].env.every((name) => process.env[name]);

function providerOrThrow(id) {
  const provider = PROVIDERS[id];
  if (!provider) throw new IntegrationError('Unknown service.', 404);
  if (!isConfigured(id)) throw new IntegrationError(`${provider.name} isn't set up on this server.`, 503);
  return provider;
}

// ─── Flow ────────────────────────────────────────────────────────────────────

async function list(userId) {
  const connections = await prisma.connection.findMany({ where: { userId } });
  return Object.entries(PROVIDERS).map(([id, p]) => {
    const c = connections.find((x) => x.provider === id);
    return {
      id,
      name: p.name,
      description: p.description,
      available: isConfigured(id),
      connected: Boolean(c),
      lastSyncAt: c?.lastSyncAt || null,
      lastError: c?.lastError || null,
    };
  });
}

/** The provider's sign-in URL for this user. */
async function authorizeUrl(userId, id) {
  const provider = providerOrThrow(id);
  const state = crypto.randomBytes(24).toString('base64url');
  const codeVerifier = crypto.randomBytes(48).toString('base64url');
  await prisma.oAuthState.deleteMany({ where: { OR: [{ userId, provider: id }, { expiresAt: { lt: new Date() } }] } });
  await prisma.oAuthState.create({ data: { id: state, userId, provider: id, codeVerifier, expiresAt: new Date(Date.now() + STATE_TTL_MS) } });

  const url = new URL(provider.authorizeUrl);
  const params = {
    client_id: process.env[provider.env[0]],
    response_type: 'code',
    redirect_uri: redirectUri(id),
    scope: provider.scope,
    state,
    ...provider.authorizeParams,
    ...(provider.pkce && {
      code_challenge: crypto.createHash('sha256').update(codeVerifier).digest('base64url'),
      code_challenge_method: 'S256',
    }),
  };
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

/**
 * Finish sign-in: check the state, swap the code for tokens, save the
 * connection and run a first sync. Returns where to send the browser.
 */
async function handleCallback(id, { code, state, error }) {
  const back = (result) => `${webBase()}/progress?${new URLSearchParams({ integration: id, result })}`;
  if (!PROVIDERS[id]) return back('error');
  const pending = state ? await prisma.oAuthState.findUnique({ where: { id: String(state) } }) : null;
  if (pending) await prisma.oAuthState.delete({ where: { id: pending.id } });
  if (!pending || pending.provider !== id || pending.expiresAt < new Date()) return back('expired');
  if (error || !code) return back('denied');

  try {
    const provider = providerOrThrow(id);
    const tokens = await provider.exchange({ code: String(code), codeVerifier: pending.codeVerifier });
    const data = {
      accessToken: encrypt(tokens.accessToken),
      refreshToken: encrypt(tokens.refreshToken),
      expiresAt: tokens.expiresAt,
      externalUserId: tokens.externalUserId,
      scopes: tokens.scopes,
      lastError: null,
    };
    await prisma.connection.upsert({
      where: { userId_provider: { userId: pending.userId, provider: id } },
      create: { ...data, userId: pending.userId, provider: id },
      update: data,
    });
    await sync(pending.userId, id).catch(() => {}); // first sync is best effort; errors are recorded
    return back('connected');
  } catch (err) {
    console.error(`[integrations] ${id} callback failed:`, err.message);
    return back('error');
  }
}

/** A valid access token, refreshing it first if it has (nearly) expired. */
async function accessTokenFor(connection, provider) {
  const soon = new Date(Date.now() + 60 * 1000);
  if (!connection.expiresAt || connection.expiresAt > soon) return decrypt(connection.accessToken);
  if (!connection.refreshToken) throw new IntegrationError('Please reconnect this service.', 401);
  const tokens = await provider.exchange({ refreshToken: decrypt(connection.refreshToken) });
  await prisma.connection.update({
    where: { id: connection.id },
    data: {
      accessToken: encrypt(tokens.accessToken),
      refreshToken: encrypt(tokens.refreshToken || decrypt(connection.refreshToken)),
      expiresAt: tokens.expiresAt,
    },
  });
  return tokens.accessToken;
}

/** Pull the last SYNC_DAYS days (or since the last sync) from the provider. */
async function sync(userId, id) {
  const provider = providerOrThrow(id);
  const connection = await prisma.connection.findUnique({ where: { userId_provider: { userId, provider: id } } });
  if (!connection) throw new IntegrationError(`${provider.name} isn't connected.`, 404);
  const earliest = new Date(Date.now() - SYNC_DAYS * 24 * 60 * 60 * 1000);
  // Re-read the last two days too: late uploads from a device are common.
  const since = connection.lastSyncAt && connection.lastSyncAt > earliest
    ? new Date(connection.lastSyncAt.getTime() - 2 * 24 * 60 * 60 * 1000)
    : earliest;
  try {
    const accessToken = await accessTokenFor(connection, provider);
    const result = await provider.sync({ userId, accessToken, since });
    await prisma.connection.update({ where: { id: connection.id }, data: { lastSyncAt: new Date(), lastError: null } });
    return result;
  } catch (err) {
    await prisma.connection.update({ where: { id: connection.id }, data: { lastError: err.message.slice(0, 300) } });
    throw err;
  }
}

async function disconnect(userId, id) {
  if (!PROVIDERS[id]) throw new IntegrationError('Unknown service.', 404);
  const { count } = await prisma.connection.deleteMany({ where: { userId, provider: id } });
  if (!count) throw new IntegrationError('Not connected.', 404);
}

module.exports = { PROVIDERS, IntegrationError, setHttp, list, authorizeUrl, handleCallback, sync, disconnect };
