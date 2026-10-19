/**
 * A real PostgreSQL server run from node_modules (embedded-postgres), for
 * local development (`npm run db:dev`) and the test suite. Production uses a
 * normal managed Postgres via DATABASE_URL.
 */
const fs = require('fs');
const net = require('net');
const path = require('path');
const { execFileSync } = require('child_process');

const USER = 'postgres';
const PASSWORD = 'postgres';

/** An unused local TCP port. */
function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/**
 * Start Postgres in `dir` (initialising it on first use) and make sure
 * `database` exists. Returns { url, stop }.
 */
async function startEmbeddedPostgres({ dir, port, database = 'fitguide', persistent = true, onLog = () => {} }) {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: USER,
    password: PASSWORD,
    port,
    persistent,
    onLog,
    onError: onLog,
  });
  if (!fs.existsSync(path.join(dir, 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase(database);
  } catch (err) {
    if (!/already exists/.test(String(err.message))) throw err;
  }
  return {
    url: `postgresql://${USER}:${PASSWORD}@127.0.0.1:${port}/${database}?schema=public`,
    stop: () => stopCluster(dir, { persistent }),
  };
}

/** Path of pg_ctl from the platform package embedded-postgres installed. */
async function pgCtlPath() {
  const os = process.platform === 'win32' ? 'windows' : process.platform;
  const binaries = await import(`@embedded-postgres/${os}-${process.arch}`);
  return binaries.pg_ctl || binaries.default.pg_ctl;
}

/**
 * Shut the cluster down with `pg_ctl stop -m fast`, which stops the server
 * and all its worker processes and waits for them. (embedded-postgres's own
 * stop() force-kills the process tree on Windows and can wait forever when a
 * worker survives.)
 */
async function stopCluster(dir, { persistent }) {
  try {
    execFileSync(await pgCtlPath(), ['stop', '-D', dir, '-m', 'fast', '-w', '-t', '30'], { stdio: 'pipe' });
  } catch (err) {
    // Already stopped is fine; anything else is worth knowing about.
    if (!/not running|no server running|PID file .* does not exist/i.test(`${err.stderr || ''}${err.message}`)) throw err;
  }
  if (!persistent) {
    await fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
  }
}

/** Apply prisma/migrations to the database at `url`. */
function migrateDeploy(url) {
  const prismaCli = require.resolve('prisma/build/index.js');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}

module.exports = { freePort, startEmbeddedPostgres, migrateDeploy, stopCluster };
