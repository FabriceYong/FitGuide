# FitGuide commands

Every command for running, managing and testing FitGuide, with what it does.
They work in Windows Command Prompt (cmd), PowerShell and macOS/Linux
terminals unless a note says otherwise. Run them from the folder named in
each section.

Replace `you@example.com` with the email of an account that already exists
(sign up on the website or in the app first).

## Docker: the whole stack

Run from the project folder (where `docker-compose.yml` is). Needs Docker Desktop.

| Command | What it does |
|---|---|
| `docker compose up -d --build` | Build and start everything: database, API, website and Flutter app. The first build takes several minutes. Run it again after pulling changes; it also applies new database migrations. |
| `docker compose up -d` | Start everything again without rebuilding. |
| `docker compose down` | Stop everything. Your data is kept. |
| `docker compose down -v` | Stop everything and **delete all data** (database and uploads). |
| `docker compose ps` | List the running parts and whether they are healthy. |
| `docker compose logs -f api` | Follow the API's logs (use `web`, `app` or `db` for the others). Press Ctrl+C to stop following. |
| `docker compose up -d --build api` | Rebuild and restart only the API after changing it (use `web` or `app` for the others). |
| `docker compose up -d db` | Start only the database, for when you run the API on your own computer. |
| `docker compose restart api` | Restart the API without rebuilding it. |

Addresses once it is running:

| Part | Address |
|---|---|
| Website | http://localhost:3000 |
| Mobile app (Flutter web build) | http://localhost:8080 |
| API | http://localhost:5001/api |
| Database | `postgresql://fitguide:fitguide@localhost:5432/fitguide` |

## Accounts and data (with Docker)

| Command | What it does |
|---|---|
| `docker compose exec api npm run make-admin -- you@example.com` | Make an account an **admin**. Reload the website afterwards; the Admin button appears next to your profile. |
| `docker compose exec api npm run make-admin -- you@example.com --role creator` | Make an account a **coach** directly (members normally apply from their profile and an admin approves them). |
| `docker compose exec api npm run make-admin -- you@example.com --role user` | Turn an account back into a normal member. |
| `docker compose exec api npm run db:seed` | Reload the catalog (workouts, exercises, programs, foods) from `fitguide_api/seed/`. |
| `docker compose exec api npm run db:seed -- --demo` | Same, and also create the demo account demo@fitguide.com / demo123. |
| `docker compose exec api npm run db:deploy` | Apply any database migrations that haven't run yet (the API also does this when it starts). |
| `docker compose exec db psql -U fitguide fitguide` | Open a SQL prompt on the database. Type `\q` to leave. |

## API without Docker

Run from `fitguide_api/`. Needs Node.js 22 or newer.

| Command | What it does |
|---|---|
| `npm ci` | Install the API's packages (once, and after packages change). |
| `copy .env.example .env` | Create the API's settings file (cmd). In PowerShell, macOS or Linux use `cp .env.example .env`. Then set `JWT_SECRET` in it. |
| `npm run db:dev` | Run a local PostgreSQL database from `node_modules`, keeping data in `fitguide_api/.devdb`. Leave it running in its own window. |
| `npm run dev` | Start the API with automatic restart when files change (http://localhost:5001). |
| `npm start` | Start the API without automatic restart. |
| `npm run make-admin -- you@example.com` | Make an account an admin (`--role creator` for a coach, `--role user` for a member). |
| `npm run db:seed` | Reload the catalog from `seed/` (`-- --demo` adds demo@fitguide.com / demo123). |
| `npm run db:migrate -- --name <change>` | After editing `prisma/schema.prisma`, create a new migration and apply it to your database. |
| `npm run db:deploy` | Apply migrations that haven't run yet (production, or after pulling changes). |
| `npm run assign-gifs` | Add the few hand-checked ExerciseDB GIFs to matching workout steps. Optional: other steps get their free demo automatically. |
| `npm test` | Run the API tests on a throwaway database (a few minutes). |
| `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` | Print a random value to use as `JWT_SECRET`. |

## Website without Docker

Run from `fitguide_nextjs/`. Start the API first.

| Command | What it does |
|---|---|
| `npm ci` | Install the website's packages. |
| `npm run dev` | Start the website with live reload (http://localhost:3000). Open it on `localhost`, not `127.0.0.1`, so sign-in works. |
| `npm run build` | Build the production version (also checks for build errors). |
| `npm start` | Serve the production build made by `npm run build`. |
| `npm run lint` | Check the code for problems. |
| `npm run typecheck` | Check the TypeScript types. |
| `npm run test:e2e` | Run the browser tests. They start their own API (port 5055) and website (port 3055), so stop `npm run dev` first. |
| `npx playwright install chromium` | Download the browser the browser tests use (once). |
| `node scripts/make-icons.js` | Recreate the app icons in `public/icons`. |

## Mobile app (Flutter)

Run from the project folder. Needs Flutter 3.35 or newer and the API running.

| Command | What it does |
|---|---|
| `flutter pub get` | Install the app's packages. |
| `flutter run` | Run the app on a connected phone, emulator or desktop, using the local API. |
| `flutter run --dart-define=API_URL=http://localhost:5001/api --dart-define=WEB_URL=http://localhost:3000` | Run the app against a specific API and website. On a real phone, use your computer's LAN address instead of `localhost`. |
| `flutter run -d chrome` | Run the app in Chrome. Add its address to `CORS_ORIGINS` in `fitguide_api/.env` first. |
| `flutter devices` | List the phones, emulators and browsers the app can run on. |
| `flutter analyze` | Check the app's code for problems. |
| `flutter test` | Run the app's tests. |
| `flutter build apk --release` | Build an Android install file (in `build/app/outputs/flutter-apk/`). |
| `flutter build web --release` | Build the web version of the app (in `build/web/`). |
| `flutter clean` | Delete build files; use it when a build behaves strangely, then run `flutter pub get`. |

## Ports

The Docker stack and the local setup both use :3000 (website), :5001 (API)
and :5432 (database), so run only one of them at a time. To change the
Docker ports, copy `.env.example` to `.env` next to `docker-compose.yml`
and set `WEB_PORT`, `APP_PORT`, `API_PORT` or `DB_PORT`, then run
`docker compose up -d --build`.
