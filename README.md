# FitGuide

FitGuide is a fitness app: guided workouts, multi-week programs, personal
plans with an AI coach, nutrition tracking, progress and wearable data,
friends and challenges, and a PLUS subscription.

| Folder | What it is |
|---|---|
| `fitguide_api/` | Express API on PostgreSQL (Prisma) |
| `fitguide_nextjs/` | Next.js 16 web app (React 19, Tailwind 4; new code in TypeScript), installable as a PWA |
| `packages/shared/` | Enums and limits both apps validate against (`@fitguide/shared`) |
| `lib/`, `android/`, `ios/`, … | The original Flutter prototype. Not connected to the API and not maintained here |
| `docs/archive/` | Old status notes and one-time scripts, kept for history |

## Quick start (local)

Needs Node.js 22 or newer. No Docker needed: the API can run a real
PostgreSQL from `node_modules`.

```bash
# 1. Install
cd fitguide_api && npm ci
cd ../fitguide_nextjs && npm ci

# 2. Configure the API
cd ../fitguide_api
cp .env.example .env          # then set JWT_SECRET (instructions inside)

# 3. Database (leave running; data is kept in fitguide_api/.devdb)
npm run db:dev

# 4. API, in another terminal
npm run dev                   # http://localhost:5001

# 5. Web app, in another terminal
cd ../fitguide_nextjs && npm run dev    # http://localhost:3000
```

Prefer Docker? `docker compose up -d db` at the repo root and use the
`DATABASE_URL` from `docker-compose.yml`.

Open the web app on `localhost` (not `127.0.0.1`), the same host as the API,
so the session cookies are shared.

Useful commands in `fitguide_api/`:

| Command | What it does |
|---|---|
| `npm run db:seed` | Reload workouts, exercises, programs and foods from `seed/` (`-- --demo` adds demo@fitguide.com / demo123) |
| `npm run make-admin -- you@example.com` | Make an account an admin (`--role creator` for a creator) |
| `npm run db:migrate -- --name <change>` | Create a migration after editing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply migrations (production) |

## Tests

```bash
cd fitguide_api && npm test             # ~180 API tests on a throwaway embedded Postgres
cd fitguide_nextjs && npm run test:e2e  # Playwright: real browser flows + axe accessibility checks
cd fitguide_nextjs && npm run lint && npm run typecheck && npm run build
```

The end-to-end tests start their own API (port 5055) and web app (port
3055) with a fresh database, so stop `next dev` in `fitguide_nextjs` first.
The first run downloads a browser: `npx playwright install chromium`.

## Features and where they live

| Feature | API | Web |
|---|---|---|
| Accounts: httpOnly cookie sessions, 15-minute access tokens with rotating refresh tokens, CSRF origin checks, rate limits | `routes/auth.js`, `services/authTokens.js` | `lib/api.js`, `src/proxy.js` |
| Workout catalog, exercise library, programs | `routes/workouts.js`, `exercises.js`, `programs.js` | `/workouts`, `/programs` (server-rendered) |
| Dashboard: home, explore (workouts and exercise library), programs, favorites, progress, reviews, calculators, profile | the routes above, `favorites.js`, `reviews.js`, `articles.js` | `/` (`components/Dashboard.tsx`, `features/dashboard/`) |
| Sessions, program enrollments, body metrics, progress | `routes/sessions.js`, `enrollments.js`, `bodyMetrics.js`, `progress.js` | player, `/progress` |
| Personal plan generator and rules-based adaptation | `services/planGenerator.js`, `routes/plan.js` | `/plan` |
| AI coach (Claude) with plan tools | `services/coach.js`, `routes/coach.js` | `/plan` |
| Nutrition: targets, food log, meal plans | `services/nutrition.js`, `routes/nutrition.js` | `/nutrition` |
| Health data and wearables (Strava, Fitbit, CSV) | `services/integrations.js`, `healthData.js` | `/progress` |
| Friends, challenges, leaderboards, verified reviews | `services/social.js`, `routes/social.js` | `/community` |
| Admin CMS and creator marketplace | `routes/admin.js`, `creator.js` | `/admin`, `/studio` |
| PLUS subscriptions (Stripe) | `services/billing.js`, `routes/billing.js` | `/plus` |
| Analytics (first-party, cookie-free) | `routes/events.js` | `lib/analytics.ts`, admin Analytics tab |
| Offline player, install to home screen | | `public/sw.js`, `app/manifest.ts` |
| Translations (English, Spanish) | | `src/i18n/` |

## Configuration

Every setting is documented in `fitguide_api/.env.example` and
`fitguide_nextjs/.env.example`. Optional services switch on when their
keys are set, and show as unavailable otherwise:

- **AI coach:** `ANTHROPIC_API_KEY` (model `claude-opus-5-5` by default).
- **Strava / Fitbit:** client id and secret per service; register
  `<API_PUBLIC_URL>/api/integrations/<service>/callback` with them.
  Set `TOKEN_ENCRYPTION_KEY` in production.
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and the price
  ids; point a webhook at `/api/billing/webhook`.
- **Uploads:** `STORAGE_DRIVER=s3` with an S3-compatible bucket (S3, R2,
  MinIO) in production.

## Production notes

- Run `npm run db:deploy` on each release; the API loads the catalog into
  an empty database on first start.
- Serve the web app and API on the same site (for example `app.` and
  `api.` subdomains) and set `COOKIE_DOMAIN`, `CORS_ORIGINS`,
  `WEB_APP_URL`, `API_PUBLIC_URL` and `NEXT_PUBLIC_API_URL` to match.
- Exercise GIFs from ExerciseDB/AscendAPI are licensed for non-commercial
  use. They switch off automatically while Stripe billing is on, until
  you set `EXERCISE_GIFS_LICENSED=true` for licensed or your own media.
- Secrets that were committed in early history (the rss2json key, a
  MongoDB connection string, Unsplash and WorkoutX keys) must be rotated
  with each provider.

## Known gaps

- Only the site header, offline screens and the PLUS page are translated;
  the rest of the interface is English-only so far.
- Still JavaScript: sign-in and onboarding, the workout and program detail
  pages, the workout player, and shared plumbing (API client, auth context,
  site header). Some have lint warnings under React's newer rules. The
  dashboard and all newer pages are TypeScript and held to the strict rules.
- There is no in-app password change or account deletion yet.
- Apple Health has no web API and Google Fit's REST API is being retired,
  so those users import a CSV instead of connecting directly.
