/**
 * Encryption for secrets stored in the database (third-party OAuth tokens).
 * AES-256-GCM with a random IV; output is "v1:<iv>:<tag>:<ciphertext>" in base64url.
 *
 * Key: TOKEN_ENCRYPTION_KEY (32 bytes, as 64 hex chars or base64). Outside
 * production, a key is derived from JWT_SECRET if it isn't set; changing
 * either then makes stored tokens unreadable and users reconnect.
 */
const crypto = require('crypto');
const { getSecret } = require('./jwt');

function getKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (raw) {
    const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
    if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64).');
    return key;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('TOKEN_ENCRYPTION_KEY must be set in production to store third-party tokens.');
  }
  return Buffer.from(crypto.hkdfSync('sha256', getSecret(), 'fitguide', 'token-encryption', 32));
}

const b64 = (buf) => buf.toString('base64url');

function encrypt(plaintext) {
  if (plaintext == null) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const data = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return `v1:${b64(iv)}:${b64(cipher.getAuthTag())}:${b64(data)}`;
}

function decrypt(value) {
  if (value == null) return null;
  const [version, iv, tag, data] = String(value).split(':');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unrecognised encrypted value.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
