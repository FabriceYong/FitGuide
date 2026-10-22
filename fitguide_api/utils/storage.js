/**
 * Where uploaded files are kept.
 *  - local (default): files under UPLOADS_DIR, served by the API at /uploads.
 *  - s3: any S3-compatible bucket (AWS S3, Cloudflare R2, MinIO, ...), served
 *    from S3_PUBLIC_URL (a CDN or the bucket's public URL). Use this in
 *    production so uploads survive redeploys and multiple API instances.
 */
const fs = require('fs');
const path = require('path');

const UPLOADS_ROOT = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(__dirname, '..', 'uploads');

// Keys we create look like "avatars/avatar-avatar-1700000000000-abc123.png".
const KEY_PATTERN = /^[a-z]+\/[A-Za-z0-9._-]+$/;

/** The storage key behind one of our public URLs, or null for any other URL. */
const keyAfter = (base, url) => {
  if (typeof url !== 'string' || !url.startsWith(`${base}/`)) return null;
  const key = url.slice(base.length + 1);
  return KEY_PATTERN.test(key) && !key.includes('..') ? key : null;
};

function localStorage() {
  return {
    name: 'local',
    async put(key, buffer) {
      const file = path.join(UPLOADS_ROOT, key);
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      await fs.promises.writeFile(file, buffer);
      return `/uploads/${key}`;
    },
    keyFor: (url) => keyAfter('/uploads', url),
    async remove(key) {
      await fs.promises.rm(path.join(UPLOADS_ROOT, key), { force: true });
    },
  };
}

function s3Storage() {
  const required = ['S3_BUCKET', 'S3_PUBLIC_URL'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`STORAGE_DRIVER=s3 needs ${missing.join(', ')} (see .env.example).`);

  const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    ...(process.env.S3_ACCESS_KEY_ID && {
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
    }),
  });
  const publicBase = process.env.S3_PUBLIC_URL.replace(/\/+$/, '');

  return {
    name: 's3',
    client,
    async put(key, buffer, contentType) {
      await client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // Keys are unique per upload, so the object never changes.
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      return `${publicBase}/${key}`;
    },
    keyFor: (url) => keyAfter(publicBase, url),
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    },
  };
}

let storage = null;

/** The configured storage driver (created on first use). */
function getStorage() {
  storage ??= process.env.STORAGE_DRIVER === 's3' ? s3Storage() : localStorage();
  return storage;
}

/** Replace the driver (tests). Pass null to go back to the configured one. */
function setStorage(driver) {
  storage = driver;
}

/**
 * Delete files we stored, given their public URLs. URLs that point anywhere
 * else (another site, a catalog image) are skipped. Failures are logged, not
 * thrown: a leftover file is better than a half-finished caller.
 * @returns {Promise<number>} how many files were removed
 */
async function removeUrls(urls) {
  const driver = getStorage();
  const keys = [...new Set(urls.map((url) => driver.keyFor(url)).filter(Boolean))];
  let removed = 0;
  for (const key of keys) {
    try {
      await driver.remove(key);
      removed += 1;
    } catch (err) {
      console.error(`[storage] could not remove ${key}:`, err.message);
    }
  }
  return removed;
}

module.exports = { UPLOADS_ROOT, getStorage, setStorage, s3Storage, removeUrls };
