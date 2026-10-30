// Upload storage drivers and image signature checks (no database needed).
require('./helpers/setup');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { s3Storage, getStorage, removeUrls, UPLOADS_ROOT } = require('../utils/storage');
const { hasImageSignature, hasVideoSignature } = require('../utils/uploads');

describe('S3 storage', () => {
  it('needs a bucket and a public URL', () => {
    assert.throws(() => s3Storage(), /S3_BUCKET, S3_PUBLIC_URL/);
  });

  it('puts the object and returns its public URL', async () => {
    Object.assign(process.env, { S3_BUCKET: 'fitguide-test', S3_PUBLIC_URL: 'https://cdn.example.com/', S3_ENDPOINT: 'https://s3.example.com' });
    try {
      const storage = s3Storage();
      const sent = [];
      storage.client.send = async (command) => { sent.push(command.input); };
      const url = await storage.put('avatars/a.png', Buffer.from('x'), 'image/png');
      assert.equal(url, 'https://cdn.example.com/avatars/a.png');
      assert.equal(sent[0].Bucket, 'fitguide-test');
      assert.equal(sent[0].Key, 'avatars/a.png');
      assert.equal(sent[0].ContentType, 'image/png');
    } finally {
      for (const key of ['S3_BUCKET', 'S3_PUBLIC_URL', 'S3_ENDPOINT']) delete process.env[key];
    }
  });
});

describe('removing uploads', () => {
  it('deletes only files under its own URL prefix', async () => {
    const url = await getStorage().put('avatars/remove-me.png', Buffer.from('x'), 'image/png');
    const file = path.join(UPLOADS_ROOT, 'avatars', 'remove-me.png');
    assert.ok(fs.existsSync(file));
    const removed = await removeUrls(['https://elsewhere.example/a.png', '/uploads/../secret', '/uploads/avatars/../../x.png', url, url]);
    assert.equal(removed, 1);
    assert.ok(!fs.existsSync(file));
  });

  it('maps S3 public URLs back to keys', async () => {
    Object.assign(process.env, { S3_BUCKET: 'fitguide-test', S3_PUBLIC_URL: 'https://cdn.example.com' });
    try {
      const storage = s3Storage();
      const sent = [];
      storage.client.send = async (command) => { sent.push(command.input); };
      assert.equal(storage.keyFor('https://cdn.example.com/reviews/p.png'), 'reviews/p.png');
      assert.equal(storage.keyFor('https://other.example.com/reviews/p.png'), null);
      await storage.remove('reviews/p.png');
      assert.deepEqual(sent[0], { Bucket: 'fitguide-test', Key: 'reviews/p.png' });
    } finally {
      for (const key of ['S3_BUCKET', 'S3_PUBLIC_URL']) delete process.env[key];
    }
  });
});

describe('image signatures', () => {
  it('accepts real headers and rejects mismatches', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const webp = Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'latin1');
    assert.ok(hasImageSignature(png, 'image/png'));
    assert.ok(hasImageSignature(jpeg, 'image/jpeg'));
    assert.ok(hasImageSignature(Buffer.from('GIF89a...'), 'image/gif'));
    assert.ok(hasImageSignature(webp, 'image/webp'));
    assert.ok(!hasImageSignature(png, 'image/jpeg'));
    assert.ok(!hasImageSignature(Buffer.from('<svg/>'), 'image/png'));
  });
});

describe('video signatures', () => {
  it('accepts MP4, MOV and WebM headers and rejects others', () => {
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom', 'latin1')]);
    const mov = Buffer.concat([Buffer.from([0, 0, 0, 0x14]), Buffer.from('ftypqt  ', 'latin1')]);
    const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f]);
    assert.ok(hasVideoSignature(mp4, 'video/mp4'));
    assert.ok(hasVideoSignature(mov, 'video/quicktime'));
    assert.ok(hasVideoSignature(webm, 'video/webm'));
    assert.ok(!hasVideoSignature(webm, 'video/mp4'));
    assert.ok(!hasVideoSignature(mp4, 'video/webm'));
    assert.ok(!hasVideoSignature(Buffer.from('<html>'), 'video/mp4'));
    assert.ok(!hasVideoSignature(mp4, 'image/png'));
  });
});
