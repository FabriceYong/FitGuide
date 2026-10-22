# FitGuide backend ↔ client connectivity audit

**Date:** 2026-10-22
**Code audited:** branch `claude/exciting-elgamal-b3e8ba` at `4061a81`. That branch holds Phases 0–3, the Postgres/Prisma move and the TypeScript dashboard. `main` (and this worktree) is still at Phase 0, so it is not what ships.
**Scope:** how data in the API reaches the web app's pages and components, how data entered in the browser gets stored by the API, and whether each screen is wired to a real endpoint. It covers `fitguide_api` (Express + Prisma), `fitguide_nextjs` (Next.js app router), `packages/shared`, and the Flutter prototype in `lib/`.
**Method:** I read the code without running it. I did not run the API test suite or the Playwright suite, because both need a Postgres instance. Every path below is relative to the repository root on that branch.

---

## 1. How data moves today

```
Browser (Next.js client components)
  └─ src/services/*.ts ──► src/lib/api.js  apiRequest()
        credentials: 'include' (httpOnly cookies), one refresh-and-retry on 401
        ──► fitguide_api  /api/*   (Express)
              authMiddleware → req.user (re-read from DB every request)
              express-validator (request shape) → zod in stores (data rules)
              Prisma → Postgres
Next.js server components (SEO pages: /workouts, /programs, sitemap)
  └─ src/lib/server-api.js serverGet()  — anonymous, ISR cached 300 s
Next.js proxy (src/proxy.js) — checks the fitguide_session hint cookie for private pages
Shared contract: packages/shared (enums + numeric limits) used by both sides
Flutter (lib/) — no network layer at all
```

### Feature map

| Feature | Web screen(s) | Client module | Endpoint(s) | Stored in | Wired? |
|---|---|---|---|---|---|
| Sign in / up / out, session | `LoginPage`, `OnboardingWizard`/`ProfileStep`, `AuthContext` | `lib/api.js` | `/auth/login`, `/register`, `/refresh`, `/logout`, `/me` | `users`, `refresh_tokens` | ✅ |
| Profile, password, delete account | `ProfileTab` | direct `apiRequest` | `/auth/profile`, `/auth/password`, `/auth/account`, `/upload/avatar` | `users`, storage | ✅ |
| Workout catalog | `/workouts` (SSR), `ExploreTab`, `WorkoutContext` | `workoutService.ts`, `server-api.js` | `GET /workouts`, `/workouts/:slug`, `/:slug/like` | `workouts`, `workout_likes` | ✅ |
| Workout player + logging | `/workouts/[slug]/play`, `EnhancedWorkoutExecution`, `SessionSummary` | `trainingService.ts` | `POST /sessions` | `workout_sessions`, `set_logs` | ✅ (see F1, F5) |
| Programs + enrollments | `/programs`, `/programs/[slug]`, `ProgramDetail` | `trainingService.ts` | `/programs`, `/enrollments` | `programs`, `program_days`, `enrollments`, `enrollment_days` | ✅ (see F4, F6) |
| Personal plan + AI coach | `/plan`, `PlanView`, `PlanGenerator`, `CoachChat` | `planService.ts` | `/plan/*`, `/coach/*` | `programs` (ownerId), `coach_messages` | ✅ (see F3) |
| Progress, body metrics | `/progress`, `ProgressView`, `HomeTab` | `trainingService.ts` | `/progress/summary`, `/body-metrics`, `/sessions` | `body_metrics`, sessions | ✅ |
| Health + wearables | `HealthPanel` | `healthService.ts` | `/health-data/*`, `/integrations/*` | `daily_metrics`, `external_activities`, `connections` | ✅ |
| Nutrition | `/nutrition`, `NutritionView`, `FoodPicker` | `nutritionService.ts` | `/nutrition/log`, `/foods`, `/meal-plan`, `/history` | `foods`, `food_logs` | ✅ |
| Community | `/community`, `CommunityView` | `socialService.ts` | `/social/*` | `friendships`, `challenges`, `challenge_members` | ✅ |
| Favorites | `ExploreTab`, `FavoritesTab`, `WorkoutDetails` | `favoriteService.ts`, `useFavorites` | `/favorites/*` | `favorites` | ✅ |
| Reviews | `ReviewsTab`, `HomeTab`, `WorkoutReviews` | `contentService.ts` **and** `WorkoutReviews.js` | `/reviews/*` | `reviews`, `review_likes`, storage | ✅ (two clients, see F15) |
| PLUS billing | `/plus`, `PlusView`, `PlusGate` | direct `apiRequest` | `/billing/*`, Stripe webhook | `users` billing columns, `stripe_events` | ✅ (see F7) |
| Admin CMS / creator studio | `/admin`, `/studio` | `adminService.ts` | `/admin/*`, `/creator/*` | catalog tables | ✅ (partial, see §4) |
| Analytics | `PageViews`, `track()` | `lib/analytics.ts` | `POST /events` | `analytics_events` | ✅ |
| Articles feed | `HomeTab` | `contentService.ts` | `/articles` (rss2json proxy) | memory cache | ✅ |
| Flutter app | all screens | none | none | none | ❌ (see F19) |

### What already works well
- **One API client.** Every browser call goes through `apiRequest()`, which handles the base URL, cookies, the error shape, and one refresh-and-retry on a 401. Error messages from express-validator and zod both reach the UI as readable text.
- **Shared contract.** `packages/shared` defines the enums and limits once. The API's validators and most web forms import them.
- **The server is the source of truth for derived values.** Calories are computed from the workout's own rate, never taken from the client. The user is re-read from the database on every request, so role and plan changes apply right away. Billing state changes only through verified Stripe webhooks.
- **Per-user scoping.** The owned stores (`stores/records.js`) put `userId` in every query, so ids guessed from another account return 404.
- **Local dates.** Every calendar-dependent call sends `tzOffset`, and the API stores `YYYY-MM-DD` local dates.

---

## 2. Findings (most severe first)

Severity: **High** means user data is lost, corrupted or misattributed, or a core flow breaks. **Medium** means a flow breaks under realistic conditions. **Low** means inconsistency, waste or polish.

### F1 — High: the offline session queue isn't tied to an account and drops or duplicates sessions
`fitguide_nextjs/src/services/trainingService.ts:80` and `:128`, `src/components/OfflineSupport.tsx`, `src/contexts/AuthContext.js:37`

Sessions saved without a connection go into localStorage under `fitguide_pending_sessions`, with no user id. Sign-out (`clearSession`) and account deletion leave the queue in place, and `OfflineSupport` flushes it as soon as *any* account is signed in.
- **Wrong account:** user A finishes a workout offline and signs out, then user B signs in on the same device. A's session is saved to B's history, streaks and PRs.
- **Silent loss:** `flushQueuedSessions` keeps only status 0, 401 and 5xx responses. Anything else is thrown away without telling the user. That includes 400 (for example, the program was ended while offline, so `checkProgramDay` fails), 402 (PLUS lapsed), 404 (workout unpublished) and **429** (rate-limited).
- **Duplicates:** there is no idempotency key. If the POST succeeds but the response is lost, the request fails with status 0, the session is queued, and it is saved twice.

**Fix:** store the owning `user.id` with each queued item, and flush only for that user (drop or keep the rest on sign-out). Retry 429 responses. On a 400 with a program link, retry once without the program fields. Surface anything that is still dropped. Have the client generate an id (`clientId` UUID) and make `POST /sessions` idempotent on `(userId, clientId)`.

**Status: fixed.** Queued sessions are stored with their owner under a new key (`fitguide_pending_sessions_v2`) and flushed only for that user. Queue entries from older builds have no owner, so they are discarded rather than sent. Responses 401, 408, 429 and 5xx are retried later. A 400 on a program-linked session is resent once without the program link. Sessions still refused are dropped and reported in the banner. Every session carries a `clientId`, and `POST /sessions` returns the saved session (`200, duplicate: true`) when a clientId repeats, including two concurrent sends (new migration `20261022000000_session_client_id`). Deleting an account clears that user's queue. Tests: `fitguide_api/test/trainingSuite.js` and `fitguide_nextjs/e2e/training.spec.ts`.

### F2 — High (plausible): two tabs refreshing at once revoke the whole session
`fitguide_api/services/authTokens.js:39`, `fitguide_nextjs/src/lib/api.js:56`

Refresh tokens rotate on every use. If a token that was already used shows up again, the API revokes the whole token family. The client's one-refresh-at-a-time guard (`refreshing`) only covers a single tab. Suppose the access cookie has expired (15 minutes) and two tabs call `/auth/refresh` at nearly the same moment, for example when the browser restores tabs or the user returns to two open tabs. The second request carries the refresh cookie the first one just rotated. The API treats that as a replay and **signs the user out on every device**.

**Fix:** accept a just-rotated token during a short grace window (10–30 s) and hand back the same successor instead of revoking the family. Alternatively or in addition, coordinate refreshes across tabs with `BroadcastChannel` or the Web Locks API (`navigator.locks.request('fitguide-refresh', …)`).

### F3 — High: finishing a personal-plan workout lands on a 404
`fitguide_nextjs/src/app/workouts/[slug]/play/PlayWorkout.js:16`, `src/features/programs/ProgramDetail.js:20`, `fitguide_api/stores/records.js:47`

`PlanView` and `HomeTab` start plan days with `playHref(plan, day)`, which puts `program=plan-xxxx` in the URL. When the user exits or finishes, the player goes to `/programs/plan-xxxx`. That page is rendered on the server with an anonymous `serverGet`, and `visibleTo(undefined)` hides personal plans, so the API returns 404 and the page calls `notFound()`. `features/progress/format.ts:27` already maps `plan-*` slugs to `/plan`; the player doesn't use that mapping.

**Fix:** build `returnTo` with the same helper as `format.ts` (`plan-*` → `/plan`). Longer term, mark personal plans with an `isPersonal` flag in the URL or response rather than relying on the slug prefix.

**Status: fixed.** The player and the "You're currently following…" link on program pages both use `scheduleHref`. The player's exit button now has an accessible name ("Exit workout"). Test: `fitguide_nextjs/e2e/training.spec.ts`. The slug-prefix check is unchanged.

### F4 — High: deleting a session can reactivate a finished program and leave two programs active
`fitguide_api/services/enrollments.js:57`

`unmarkSession` sets a `completed` enrollment back to `active` every time one of its sessions is deleted, even when:
- the deleted session wasn't the one recorded in `completedDays` (for example, a second run of the same day), so nothing changes and every day is still done, and the enrollment stays "active" with no next day; or
- the user has started another program since, so there are now **two active enrollments**. `GET /enrollments` (`active: enrollments.find(...)`), `/plan` and the `HomeTab` each pick one arbitrarily.

**Fix:** reactivate only if a day was actually removed and no other enrollment is active. If another one is active, leave the old enrollment `completed` with one fewer day, or mark it `abandoned`.

**Status: fixed.** Deleting a session that didn't count for a day changes nothing. If another session logged the same day, the earliest remaining one takes its place. Otherwise the day opens again, and a completed program becomes active again only when no other program is active; if another is active, it stays `completed`. Tests: `fitguide_api/test/trainingSuite.js` ("deleting sessions of a finished program").

### F5 — High: the player makes up exercises when a workout has no steps, then logs them as real sets
`fitguide_nextjs/src/features/workout/EnhancedWorkoutExecution.js:78`, `fitguide_api/schemas/catalog.js:40`

If `workout.steps` is empty, the player builds about 100 hard-coded steps (squats, bench press, yoga poses…) from the category and title. The admin schema allows `steps: []` (the default), so any workout created in the CMS without steps plays content nobody wrote. When the user saves, `buildSessionDraft` sends those made-up names as `sets`. The API matches them against the exercise library, so they can **create personal records** for exercises the user never did.

**Fix:** require at least one step when publishing (zod `.min(1)` when `isPublished`). In the player, show a "this workout has no steps yet" state instead of generating steps.

### F6 — Medium: unpublishing a workout or program breaks enrollments that use it
`fitguide_api/routes/sessions.js:58`, `fitguide_api/stores/records.js:47`, `fitguide_api/routes/admin.js` (PATCH workouts/programs)

- If a workout in a program's schedule is unpublished, `POST /sessions` returns 404 for that day (`getManyBySlugs` filters to published workouts). The day can never be completed and the program never finishes. Favorites drop the workout silently.
- If a program with active enrollments is unpublished or rejected, `programStore.getBySlug` returns null. `describeEnrollment` then returns an empty schedule (`totalDays: 0`, the title falls back to the slug), and every program-day session fails `checkProgramDay`.

**Fix:** keep unpublished items readable for users who already reference them: resolve by slug without the `isPublished` filter for enrolled users, sessions and favorites, and filter only catalog listings. Alternatively, block unpublishing while active enrollments exist and say why.

### F7 — Medium: PLUS access can get stuck
`fitguide_nextjs/src/components/PlusGate.tsx:38`, `fitguide_api/middleware/authMiddleware.js:48`, `src/features/plus/PlusView.tsx`

- **Infinite spinner:** `PlusGate` decides `isPlus` from the user cached in localStorage. If the full-workout fetch fails, or comes back still `locked` (the subscription lapsed but the cache says `plus`), `unlocked` stays null or locked and the gate shows the loader forever.
- **Expired access token looks anonymous:** catalog calls don't set `auth: true`, and `optionalAuth` treats an expired or missing access cookie as a guest without returning a 401. So `apiRequest` never refreshes. After 15 idle minutes a PLUS member's Explore list shows premium workouts as locked. Because that call is unfiltered, `fetchWorkouts` also saves the locked catalog as the offline copy.
- **After checkout:** `/plus?checkout=success` reads `/billing` once. If the Stripe webhook hasn't arrived yet, the page shows "confirming" and never checks again, so the user stays on free until a reload.

**Fix:** in `PlusGate`, fall back to the upgrade card on error or when the response is still locked, and refresh `/auth/me` there. Have `optionalAuth` answer `401 TOKEN_EXPIRED` when an access token is present but expired, so the client refreshes and retries. Or call the catalog with a flag that permits a refresh. Poll `/billing` a few times after a successful checkout.

### F8 — Medium: private pages depend on a cookie the web server may never see
`fitguide_nextjs/src/proxy.js:12`, `fitguide_api/utils/jwt.js` (`SESSION_HINT_COOKIE`)

The proxy sends signed-out visitors away from `/progress`, `/plan`, `/nutrition`, `/community`, `/admin` and `/studio` by checking the `fitguide_session` cookie. The *API* sets that cookie on its own host. In development, both apps run on `localhost`, which shares cookies across ports, so it works. In production on two hosts, the app's server never sees the cookie unless `COOKIE_DOMAIN` is set to the parent domain, and on two different sites it can't be set at all. Signed-in users would then be redirected to `/` every time they open a private page. Separately, opening the web app on `127.0.0.1:3000` while `NEXT_PUBLIC_API_URL` points at `localhost:5001` makes the API cross-site, so SameSite=Lax cookies aren't sent and nothing authenticated works.

**Fix:** make this a hard requirement in the deployment docs and check it at startup: warn when `NODE_ENV=production`, no `COOKIE_DOMAIN` is set and `WEB_APP_URL`'s host differs from the API's. Better, have the web app set its own hint cookie, for example through a tiny Next.js route handler called after login and logout, so the proxy doesn't depend on the API's cookie domain.

### F9 — Medium: uploaded files are left behind in storage
`fitguide_api/routes/reviews.js:50`, `routes/upload.js`, `features/profile/components/ProfileTab.tsx` (`pickAvatar`)

- Review photos are stored *before* the rating, comment and duplicate checks run. A 400 or 409 response leaves the files in storage with nothing pointing to them.
- Avatars are uploaded as soon as a file is picked. If the user cancels the profile dialog, or the `PUT /auth/profile` after sign-up fails (`ProfileStep`), the file stays in storage. Replacing an avatar never deletes the old file.

**Fix:** validate before calling `store()`, or delete `req.files` when validation fails. In `PUT /auth/profile`, delete the previous `avatarUrl` file when it changes and no other row uses it. `accounts.stillUsed` already does this check.

### F10 — Medium: profile and custom-image URLs accept any URL
`fitguide_api/routes/auth.js:29`, `routes/customImages.js`

`avatarUrl` (and `customImageUrl`) can be any string up to 500 characters, so users can point them at any external host. The avatar is copied into every review (`userAvatar`) and shown in other users' browsers, which lets a third-party server log viewers' IP addresses. It is also the value `deleteAccount` later passes to `removeUrls`.

**Fix:** accept only URLs this API issued: the storage driver's public prefix, for example `/uploads/avatars/…` or `S3_PUBLIC_URL/avatars/…`.

### F11 — Low: weight has two sources of truth
`fitguide_api/routes/bodyMetrics.js`, `routes/auth.js` (profile)

Logging a weigh-in for the latest date updates `users.weight`, but editing the weight in the profile doesn't create a `body_metrics` entry. So the progress chart and the nutrition/plan inputs (which read `users.weight`) can disagree. Deleting the latest weigh-in doesn't roll the profile weight back.

**Fix:** treat body metrics as the source of truth. A profile weight edit writes today's metric, and the profile shows the latest metric.

### F12 — Low: server-rendered pages are up to 5 minutes stale, and `viewCount` isn't really views
`fitguide_nextjs/src/lib/server-api.js` (`revalidate: 300`), `fitguide_api/stores/workoutStore.js:75`

Admin edits, publish/unpublish, ratings and like counts reach `/workouts` and `/programs` up to 5 minutes late, because nothing triggers revalidation. `GET /workouts/:slug` increments `viewCount` on every call. Most calls come from the Next.js server during ISR revalidation (at most one every 5 minutes), so the counter measures cache refreshes, not views. The offline catalog in localStorage can also keep unpublished workouts until the next unfiltered fetch succeeds.

**Fix:** call `revalidatePath`/`revalidateTag` through a small authenticated Next.js route from the admin save handlers. Count views from the client (or with an `?view=1` flag), not from server-rendered fetches.

### F13 — Low: demo credentials are always shown
`fitguide_nextjs/src/features/auth/LoginPage.js:141`

The sign-in page always shows `demo@fitguide.com / demo123`. That account exists only if `npm run db:seed -- --demo` was run. In production the hint is either wrong, or it advertises a real shared account.

**Fix:** show it only when `NEXT_PUBLIC_SHOW_DEMO_LOGIN=true`.

### F14 — Low: onboarding duplicates the shared contract and loses state
`fitguide_nextjs/src/features/onboarding/components/*.js`, `WeightStep.js:8`

- The goal, diet, level, activity and gender options are hard-coded in each step instead of coming from `@fitguide/shared` (they match today, but nothing keeps them in sync). The slider ranges (height 120–220, weight 40–180, target 30–150) are narrower than the API's limits (50–250 and 30–250).
- `WeightStep` starts at 70 every time it mounts, so going Back and Forward shows 70 while the wizard keeps the earlier value.
- A guest who later signs up starts the wizard from the defaults, and their guest profile (including any local edits) isn't carried over.

**Fix:** import the shared lists and limits, pass `targetWeight` into `WeightStep`, and seed the wizard from the guest profile.

### F15 — Low: two different clients for reviews
`fitguide_nextjs/src/features/reviews/components/WorkoutReviews.js` vs `src/services/contentService.ts`

The review list on the workout page calls `/reviews` directly. It computes its own average rather than using the workout's `averageRating`, and it doesn't send `workoutRegiment`. `ReviewsTab` uses `contentService`. The two will drift apart.

**Fix:** use `contentService` from `WorkoutReviews`.

### F16 — Low: the public reviews endpoint is unbounded and exposes internal ids
`fitguide_api/routes/reviews.js` (`GET /`)

It returns every review, with no pagination, and includes each author's internal `userId`.

**Fix:** paginate with `limit` and `cursor`, and drop `userId` from the public shape (send `isMine` to signed-in viewers instead).

### F17 — Low: local data is left behind after sign-out or account deletion
`fitguide_nextjs/src/components/ParqModal.tsx:37` and the other localStorage keys

Sign-out and account deletion clear `fitguide_user` and `fitguide_session`, but leave the PAR-Q health questionnaire answers (`fitguide_parq_result`), the pending-session queue (F1), the GIF and Unsplash caches and the catalog copy. On a shared device the next person sees the previous person's PAR-Q state.

**Fix:** have one `clearLocalUserData()` that runs on logout and account deletion and removes every per-user key.

### F18 — Low: the admin user list shows only the first 50 users
`fitguide_api/routes/admin.js` (`GET /users` pages by 50), `src/services/adminService.ts` (`fetchUsers` never sends `page`)

The admin view shows "N members" but lists only the newest 50.

**Fix:** add paging controls, or "load more", using `page`.

### F19 — Info: the Flutter app has no connection to the backend
`lib/`, `pubspec.yaml`, `android/app/src/main/AndroidManifest.xml`

There is no HTTP package and no API client. Onboarding answers (goal, diet, weight) are thrown away when `_finishOnboarding` opens a `const DashboardScreen()`, and every screen shows hard-coded data. Release builds also lack the Android `INTERNET` permission and the macOS `network.client` entitlement. The API already supports mobile clients (`X-Auth-Transport: bearer` returns the access and refresh tokens in the response body). Per the 2026-10-19 decision the Flutter prototype stays untouched; this is recorded only so the gap is visible.

---

## 3. Contract checks (client types vs API responses)

| Area | Result |
|---|---|
| Profile enums and limits | API validators use `@fitguide/shared`. `ProfileTab` uses it; onboarding doesn't (F14). |
| `Workout` (`types/catalog.ts`) | Matches `workoutStore.toPublic` (`id` = slug, `averageRating`, `totalReviews`, `locked`). The type leaves out `restPeriod`, `sets`, `modifications` and `cautions`, which the JS player reads. Harmless, but the type is incomplete. |
| Reviews | API sends `workoutId` (= slug) and `verified`. The client type matches. Posting uses multipart `workoutId`, `rating`, `comment` and images. Matches. |
| Sessions | The client draft (`buildSessionDraft`) matches `sessionRules` and the zod `workoutSession`. Calories are computed by the server. |
| Enrollments / plan | `Plan` type matches `describeEnrollment`. `enrollInProgram` handles 409 `ACTIVE_ENROLLMENT` and `replace`. |
| Body metrics | Ranges come from `TRAINING.MEASUREMENT_RANGES` on both sides. Route errors are express-validator `errors[]`; store errors are zod `message`. `apiRequest` handles both. |
| Error shape | `{ success:false, message, code?, errors? }` everywhere except `/exercise-media`, which returns `{ error }`. `apiRequest` then falls back to "Request failed (HTTP n)". |
| Time zones | Every calendar call sends `tzOffset` and stores local `YYYY-MM-DD`. |

## 4. Endpoints with no client, and screens with no endpoint

The API serves these, but no web screen calls them:
- `GET/POST/DELETE /api/custom-images/*`: per-user workout images (also see F10)
- `GET /api/exercise-library`: the WorkoutX proxy
- `GET /api/exercise-media/search`
- `GET /api/workouts/categories/list` (the client hard-codes categories)
- `GET /api/exercises/:slug`, `GET /api/sessions/:id`, `GET /api/nutrition/targets` (targets also arrive inside `/nutrition/log`)
- `POST /api/nutrition/foods`: custom foods. Search shows `isCustom`, but no UI creates one.
- `PATCH /api/plan/days`: swapping a plan day's workout (no UI; the coach may use the service directly)
- `GET/POST/PUT /api/admin/exercises`: no exercise editor in the admin UI
- `user.favoriteWorkouts` in `/auth/me` (the client refetches `/favorites` instead)

Every web call maps to an existing route; I found no client call to an endpoint that doesn't exist.

---

## 5. Suggested order of work

1. **F1, F3 and F4.** Small, contained fixes that stop data being misattributed or lost and remove a 404 on a core flow.
2. **F2.** A refresh grace window on the API, plus a cross-tab lock on the client.
3. **F5 and F6.** Catalog-integrity rules: no publishing without steps, and keep referenced items readable after unpublishing.
4. **F7 and F8.** PLUS gating and the proxy cookie, before any production deploy.
5. **F9–F18** as cleanup. Treat §4 as a list of decisions: build the UI or remove the endpoint.
