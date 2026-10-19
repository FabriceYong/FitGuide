// Upload storage drivers and image signature checks (no database needed).
require('./helpers/setup');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { s3Storage } = require('../utils/storage');
const { hasImageSignature } = require('../utils/uploads');

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
