# FitGuide

FitGuide is a fitness app: guided workouts, multi-week programs, personal
plans with an AI coach, nutrition tracking, progress and wearable data,
friends and challenges, a map of gyms near you, and a PLUS subscription.

| Folder | What it is |
|---|---|
| `fitguide_api/` | Express API on PostgreSQL (Prisma) |
| `fitguide_nextjs/` | Next.js 16 web app (React 19, Tailwind 4; new code in TypeScript), installable as a PWA |
| `packages/shared/` | Enums and limits both apps validate against (`@fitguide/shared`) |
| `lib/`, `android/`, `ios/`, `test/` | The mobile app (Flutter): the same pages, features and look as the website, on the same API |
| `docs/archive/` | Old status notes and one-time scripts, kept for history |

## Quick start (Docker)

Needs Docker Desktop. From this folder:

```bash
docker compose up -d --build
```

That builds and starts all four parts. The first build downloads the
Flutter SDK and takes several minutes; later starts are quick.

| Part | Address |
|---|---|
| Website | http://localhost:3000 |
| Mobile app (Flutter web build) | http://localhost:8080 |
| API | http://localhost:5001/api |
| Database | `postgresql://fitguide:fitguide@localhost:5432/fitguide` |

```bash
docker compose down                                      # stop (data is kept)
docker compose logs -f api                               # follow one part's logs
docker compose up -d --build web                         # rebuild one part after changing it
docker compose exec api npm run db:seed -- --demo        # add demo@fitguide.com / demo123
docker compose exec api npm run make-admin -- you@example.com
docker compose down -v                                   # stop and delete all data
```

To make yourself an admin without a command, sign up, add
`ADMIN_EMAILS=you@example.com` to `fitguide_api/.env` and restart the API
(`docker compose up -d --force-recreate api`). After that, admins change
roles in Admin → Users. [COMMANDS.md](COMMANDS.md) lists every command,
including fallbacks.

Ports and the Unsplash key are set in a `.env` file next to
`docker-compose.yml` (copy `.env.example`). Optional API keys (AI coach,
Stripe, wearables) go in `fitguide_api/.env`, which the API container also
reads. The images run the production builds; for hot reload while you edit,
use the local setup below.

The gym map (/gyms on the website, "Find a gym near you" in the app) needs no
key: gyms and place search come from OpenStreetMap through Photon, proxied and
cached by the API, and the map uses the standard OpenStreetMap tiles. Both are
free shared services meant for light use; for real traffic point `PHOTON_URL`
(API) at your own Photon server and the tiles at a tile provider with
`NEXT_PUBLIC_MAP_TILES_URL` (website) and `--dart-define=MAP_TILES_URL=...` (app).

## Quick start (local, without Docker)

Needs Node.js 22 or newer. The API can run a real PostgreSQL from
`node_modules`.

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

To use Docker for the database only: `docker compose up -d db`, then set
`DATABASE_URL=postgresql://fitguide:fitguide@localhost:5432/fitguide?schema=public`
in `fitguide_api/.env` and skip step 3.

Open the web app on `localhost` (not `127.0.0.1`), the same host as the API,
so the session cookies are shared.

### Mobile app

Needs Flutter 3.35 or newer (Dart 3.9). With the API running (step 4 above):

```bash
flutter pub get
flutter run --dart-define=API_URL=http://localhost:5001/api --dart-define=WEB_URL=http://localhost:3000
```

Without `API_URL`, debug builds use the local API (`10.0.2.2` from the
Android emulator, `localhost` elsewhere). On a real phone, use your
computer's LAN address. `WEB_URL` is where the admin and coach studio
links open. The app signs in with bearer tokens (`X-Auth-Transport: bearer`)
kept in the platform's secure storage, so it needs no cookies.

To try it in a browser, add the Flutter dev server's origin to
`CORS_ORIGINS` in `fitguide_api/.env`.

Useful commands in `fitguide_api/`:

| Command | What it does |
|---|---|
| `npm run db:seed` | Reload workouts, exercises, programs and foods from `seed/` (`-- --demo` adds demo@fitguide.com / demo123) |
| `npm run make-admin -- you@example.com` | Make an account an admin (`--role creator` for a coach, though members normally apply from their profile) |
| `npm run db:migrate -- --name <change>` | Create a migration after editing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply migrations (production) |

## Tests

```bash
cd fitguide_api && npm test             # ~180 API tests on a throwaway embedded Postgres
cd fitguide_nextjs && npm run test:e2e  # Playwright: real browser flows + axe accessibility checks
cd fitguide_nextjs && npm run lint && npm run typecheck && npm run build
flutter analyze && flutter test          # mobile app: recommendation rules, screens, accessibility, 200% text
```

The end-to-end tests start their own API (port 5055) and web app (port
3055) with a fresh database, so stop `next dev` in `fitguide_nextjs` first.
The first run downloads a browser: `npx playwright install chromium`.

## Features and where they live

| Feature | API | Web |
|---|---|---|
| Accounts: httpOnly cookie sessions, 15-minute access tokens with rotating refresh tokens, CSRF origin checks, rate limits | `routes/auth.js`, `services/authTokens.js` | `lib/api.js`, `src/proxy.js` |
| Password change and account deletion (cancels PLUS, removes data and uploads) | `routes/auth.js`, `services/accounts.js` | Profile tab (`features/profile/`) |
| Workout catalog, exercise library, programs | `routes/workouts.js`, `exercises.js`, `programs.js` | `/workouts`, `/programs` (server-rendered) |
| Dashboard: home, explore (workouts and exercise library), programs, favorites, progress, reviews, calculators, profile | the routes above, `favorites.js`, `reviews.js`, `articles.js` | `/` (`components/Dashboard.tsx`, `features/dashboard/`) |
| Sessions, program enrollments, body metrics, progress | `routes/sessions.js`, `enrollments.js`, `bodyMetrics.js`, `progress.js` | player, `/progress` |
| Personal plan generator and rules-based adaptation | `services/planGenerator.js`, `routes/plan.js` | `/plan` |
| AI coach (Claude) with plan tools | `services/coach.js`, `routes/coach.js` | `/plan` |
| Nutrition: targets, food log, meal plans | `services/nutrition.js`, `routes/nutrition.js` | `/nutrition` |
| Health data: steps, active calories, sleep, resting heart rate, blood pressure; Apple Health / Health Connect (synced by the mobile app), Strava, Fitbit, CSV | `services/integrations.js`, `healthData.js` | `/progress`; app: `services/phone_health.dart`, `state/phone_health_controller.dart` |
| Friends, challenges, leaderboards, verified reviews | `services/social.js`, `routes/social.js` | `/community` |
| Admin CMS, coach applications and the coach studio (dashboard, workouts, programs, review) | `routes/admin.js`, `creator.js`, `coaches.js` | `/admin`, `/studio`, `/coaches/[id]` |
| Articles by coaches and admins (written in the studio and the CMS, reviewed, shown on the home page), built-in guides, health news previews | `services/articles.js`, `routes/articles.js` | `/articles/[slug]`, home tab; app: `features/dashboard/article_screen.dart` |
| Videos inside articles (uploaded MP4/WebM/MOV up to 100 MB, or a link to a video file; start muted as the reader scrolls to them, with a transcript) | `POST /api/creator/articles/video`, `utils/uploads.js` | `features/articles/ArticleVideo.tsx`; app: `features/dashboard/article_video.dart` |
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
- Workout step demos use free pictures picked by hand for each movement
  (`fitguide_api/data/exerciseDemos.json`): Free Exercise DB (public
  domain, served from jsDelivr) and wger (CC BY-SA, served through the API
  and credited on screen). Movements without one get the app's drawn
  demo. The names and patterns in that file must match
  `lib/src/features/workout/exercise_demos.dart`; a Flutter test checks.
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
- Apple Health and Health Connect have no web API: the mobile app reads
  them (read-only) when it opens and uploads the last 14 days to
  `/api/health-data/sync`, so the website shows the same numbers. Web-only
  users can import a CSV. The Android side (Health Connect permissions,
  `FlutterFragmentActivity`, minSdk 26) is set up; the iPhone side needs a
  Mac: open `ios/` in Xcode and check the HealthKit capability is on for
  the Runner target (the entitlements file is already there) before
  building.
- Workout calories come from the watch's heart rate (Keytel 2005
  equations) when the phone's health store has readings for the workout;
  otherwise from the workout's MET-based estimate scaled to the user's
  body. Blood pressure needs a cuff; phones and watches can't measure it.
- Mobile app: the admin CMS and coach studio stay on the website (the app
  links to them); members apply to coach and contact coaches in the app. PLUS checkout and wearable sign-in open in the browser;
  App Store and Play rules may require in-app purchases before a store
  release. Release builds are still signed with the debug key and use the
  default launcher icons. Screen-reader labels and touch sizes are checked
  by tests, but the app hasn't been tried with TalkBack or VoiceOver on a
  phone yet.
