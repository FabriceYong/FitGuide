/**
 * Where uploaded files are kept.
 *  - local (default): files under UPLOADS_DIR, served by the API at /uploads.
 *  - s3: any S3-compatible bucket (AWS S3, Cloudflare R2, MinIO, ...), served
 *    from S3_PUBLIC_URL (a CDN or the bucket's public URL). Use this in
 *    production so uploads survive redeploys and multiple API instances.
 *
 * Private files (progress photos) are never public: they're kept under
 * PRIVATE_UPLOADS_DIR (local) or in S3_PRIVATE_BUCKET (a bucket without
 * public access; defaults to S3_BUCKET under private/), and the API sends
 * them only to their owner.
 */
const fs = require('fs');
const path = require('path');

const UPLOADS_ROOT = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(__dirname, '..', 'uploads');
// Beside the public uploads, never served as static files.
const PRIVATE_ROOT = () => (process.env.PRIVATE_UPLOADS_DIR ? path.resolve(process.env.PRIVATE_UPLOADS_DIR) : path.join(path.dirname(UPLOADS_ROOT), 'private-uploads'));
const PRIVATE_KEY = /^[a-z-]+\/[A-Za-z0-9._-]+$/;
const privatePath = (key) => {
  if (!PRIVATE_KEY.test(key) || key.includes('..')) throw new Error('Bad private file key');
  return path.join(PRIVATE_ROOT(), key);
};

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
    async putPrivate(key, buffer) {
      const file = privatePath(key);
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      await fs.promises.writeFile(file, buffer);
    },
    /** The file's bytes, or null if it's gone. */
    async readPrivate(key) {
      try {
        return await fs.promises.readFile(privatePath(key));
      } catch (err) {
        if (err.code === 'ENOENT') return null;
        throw err;
      }
    },
    async removePrivate(key) {
      await fs.promises.rm(privatePath(key), { force: true });
    },
  };
}

function s3Storage() {
  const required = ['S3_BUCKET', 'S3_PUBLIC_URL'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`STORAGE_DRIVER=s3 needs ${missing.join(', ')} (see .env.example).`);

  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    ...(process.env.S3_ACCESS_KEY_ID && {
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
    }),
  });
  const publicBase = process.env.S3_PUBLIC_URL.replace(/\/+$/, '');
  const privateBucket = process.env.S3_PRIVATE_BUCKET || process.env.S3_BUCKET;
  const privateKey = (key) => (process.env.S3_PRIVATE_BUCKET ? key : `private/${key}`);

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
    async putPrivate(key, buffer, contentType) {
      await client.send(new PutObjectCommand({ Bucket: privateBucket, Key: privateKey(key), Body: buffer, ContentType: contentType, CacheControl: 'private, no-store' }));
    },
    async readPrivate(key) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: privateBucket, Key: privateKey(key) }));
        return Buffer.from(await res.Body.transformToByteArray());
      } catch (err) {
        if (err.name === 'NoSuchKey') return null;
        throw err;
      }
    },
    async removePrivate(key) {
      await client.send(new DeleteObjectCommand({ Bucket: privateBucket, Key: privateKey(key) }));
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
