/**
 * Articles written by coaches and admins: drafts, review, publishing to the
 * home page, cover uploads and who can see what. Runs inside defineApiSuite
 * against the test Postgres.
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { prisma } = require('../db/prisma');
const { readMinutes } = require('../services/articles');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

const draft = (overrides = {}) => ({
  title: 'Warm up properly: five minutes that save your session',
  description: 'A short, specific warm-up makes the first working set feel better and lowers the risk of a tweak.',
  category: 'TRAINING',
  coverImageUrl: 'https://images.example.com/warmup.jpg',
  takeaways: ['Raise your temperature first.', 'Rehearse the movement you are about to load.'],
  sections: [
    { heading: 'Get warm', paragraphs: ['Two or three minutes of easy cardio is enough.'], tip: 'A brisk walk to the gym counts.' },
    { heading: 'Rehearse', paragraphs: ['Do a few light sets of your first exercise.', 'Add weight each set until you reach your working weight.'] },
  ],
  ...overrides,
});

function defineArticleSuite(ctx) {
  let admin;
  let kim;
  let member;
  let visitor;
  before(async () => {
    const { app } = ctx();
    admin = await ctx().signUp('Ada Editor');
    kim = await ctx().signUp('Kim Writer');
    member = await ctx().signUp('Mo Reader');
    visitor = request(app);
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: 'admin' } });
    await prisma.user.update({ where: { id: kim.user.id }, data: { role: 'creator' } });
    await prisma.coachProfile.create({ data: { userId: kim.user.id, status: 'approved', bio: 'Strength coach for beginners and returners.', contactEmail: 'kim@example.com' } });
  });

  const published = async () => (await visitor.get('/api/articles/posts').expect(200)).body.articles;

  it('works out the reading time from the words', () => {
    const words = (n) => Array(n).fill('word').join(' ');
    assert.equal(readMinutes({ description: 'Short.', takeaways: [], sections: [{ heading: 'A', paragraphs: ['Tiny.'] }] }), 1);
    assert.equal(readMinutes({ description: words(100), takeaways: [], sections: [{ heading: 'A', paragraphs: [words(1000)] }] }), 5);
  });

  it('lets a coach write a draft that stays private, then send it for review', async () => {
    await member.agent.post('/api/creator/articles').send(draft()).expect(403);
    await kim.agent.post('/api/creator/articles').send(draft({ sections: [] })).expect(400);
    await kim.agent.post('/api/creator/articles').send(draft({ category: 'GOSSIP' })).expect(400);
    await kim.agent.post('/api/creator/articles').send(draft({ coverImageUrl: 'javascript:alert(1)' })).expect(400);

    const res = await kim.agent.post('/api/creator/articles').send(draft()).expect(201);
    const { article } = res.body;
    assert.equal(article.status, 'draft');
    assert.equal(article.readMinutes, 1);
    assert.match(article.slug, /^warm-up-properly/);
    assert.deepEqual(await published(), []);
    await visitor.get(`/api/articles/posts/${article.slug}`).expect(404);
    // Admins don't see other people's drafts either.
    assert.ok(!(await admin.agent.get('/api/admin/articles').expect(200)).body.articles.some((a) => a.slug === article.slug));

    await kim.agent.put(`/api/creator/articles/${article.slug}`).send(draft({ title: 'Warm up properly: five minutes well spent' })).expect(200);
    await kim.agent.post(`/api/creator/articles/${article.slug}/submit`).expect(200);
    await kim.agent.put(`/api/creator/articles/${article.slug}`).send(draft()).expect(409);
    await kim.agent.post(`/api/creator/articles/${article.slug}/submit`).expect(409);

    const stats = (await admin.agent.get('/api/admin/stats').expect(200)).body.stats;
    assert.equal(stats.pendingArticles, 1);
    const pending = (await admin.agent.get('/api/admin/articles').query({ status: 'pending' }).expect(200)).body.articles;
    assert.equal(pending[0].title, 'Warm up properly: five minutes well spent');
    assert.equal(pending[0].author.fullName, 'Kim Writer');
  });

  it('sends an article back with a note, and publishes it after changes', async () => {
    const [{ slug }] = (await kim.agent.get('/api/creator/articles').expect(200)).body.articles;
    await member.agent.patch(`/api/admin/articles/${slug}`).send({ status: 'published' }).expect(403);
    await admin.agent.patch(`/api/admin/articles/${slug}`).send({ status: 'rejected' }).expect(400);
    await admin.agent.patch(`/api/admin/articles/${slug}`).send({ status: 'rejected', reviewNote: 'Add a cool-down section.' }).expect(200);

    const [sentBack] = (await kim.agent.get('/api/creator/articles').expect(200)).body.articles;
    assert.deepEqual([sentBack.status, sentBack.reviewNote], ['rejected', 'Add a cool-down section.']);
    const edited = draft({ sections: [...draft().sections, { heading: 'Cool down', paragraphs: ['Walk for a few minutes and breathe.'] }] });
    const back = (await kim.agent.put(`/api/creator/articles/${slug}`).send(edited).expect(200)).body.article;
    assert.equal(back.status, 'draft');
    await kim.agent.post(`/api/creator/articles/${slug}/submit`).expect(200);
    await admin.agent.patch(`/api/admin/articles/${slug}`).send({ status: 'published' }).expect(200);

    const list = await published();
    assert.equal(list.length, 1);
    assert.equal(list[0].author.name, 'Kim W.');
    assert.equal(list[0].author.coachId, kim.user.id);
    assert.ok(list[0].publishedAt);
    assert.equal(list[0].status, undefined, 'readers don’t see review fields');
    const one = (await visitor.get(`/api/articles/posts/${slug}`).expect(200)).body.article;
    assert.equal(one.sections.length, 3);
    assert.equal(one.sections[2].tip, undefined);

    // Published articles can't be changed or deleted by the coach.
    await kim.agent.put(`/api/creator/articles/${slug}`).send(draft()).expect(409);
    await kim.agent.delete(`/api/creator/articles/${slug}`).expect(409);
  });

  it('lets admins publish their own articles straight away, fix and take down any', async () => {
    const own = (await admin.agent.post('/api/admin/articles').send(draft({ title: 'Protein timing', category: 'NUTRITION', coverImageUrl: null })).expect(201)).body.article;
    assert.equal(own.status, 'published');
    // A title matching a built-in guide gets its own address.
    assert.notEqual(own.slug, 'protein-timing');
    const saved = (await admin.agent.post('/api/admin/articles').send({ ...draft({ title: 'An admin draft' }), publish: false }).expect(201)).body.article;
    assert.equal(saved.status, 'draft');
    // Kim's article went back to its first title when it was revised.
    assert.deepEqual((await published()).map((a) => a.title), ['Protein timing', draft().title]);

    const [kims] = (await kim.agent.get('/api/creator/articles').expect(200)).body.articles;
    await admin.agent.put(`/api/admin/articles/${kims.slug}`).send(draft({ description: 'Fixed a typo in the summary of this article.' })).expect(200);
    assert.equal((await visitor.get(`/api/articles/posts/${kims.slug}`).expect(200)).body.article.description, 'Fixed a typo in the summary of this article.');

    await admin.agent.patch(`/api/admin/articles/${own.slug}`).send({ status: 'draft' }).expect(200);
    assert.deepEqual((await published()).map((a) => a.title), [draft().title]);
    await admin.agent.delete(`/api/admin/articles/${own.slug}`).expect(200);
    await admin.agent.delete(`/api/admin/articles/${own.slug}`).expect(404);
  });

  it('uploads a cover picture', async () => {
    const res = await kim.agent.post('/api/creator/articles/cover').attach('cover', PNG, { filename: 'c.png', contentType: 'image/png' }).expect(201);
    assert.match(res.body.url, /\/uploads\/articles\/cover-cover-.*\.png$/);
    const article = (await kim.agent.post('/api/creator/articles').send(draft({ title: 'With an uploaded cover', coverImageUrl: res.body.url.replace(/^https?:\/\/[^/]+/, '') })).expect(201)).body.article;
    assert.match(article.coverImageUrl, /^\/uploads\/articles\//);
    await kim.agent.post('/api/creator/articles/cover').attach('cover', Buffer.from('not an image'), { filename: 'c.png', contentType: 'image/png' }).expect(400);
    await member.agent.post('/api/creator/articles/cover').attach('cover', PNG, { filename: 'c.png', contentType: 'image/png' }).expect(403);
    await kim.agent.delete(`/api/creator/articles/${article.slug}`).expect(200);
  });

  it('keeps published articles when the author deletes their account, and drops their drafts', async () => {
    const leaver = await ctx().signUp('Lee Leaving');
    await prisma.user.update({ where: { id: leaver.user.id }, data: { role: 'creator' } });
    const kept = (await leaver.agent.post('/api/creator/articles').send(draft({ title: 'Stays after I go' })).expect(201)).body.article;
    await leaver.agent.post('/api/creator/articles').send(draft({ title: 'Goes with me' })).expect(201);
    await leaver.agent.post(`/api/creator/articles/${kept.slug}/submit`).expect(200);
    await admin.agent.patch(`/api/admin/articles/${kept.slug}`).send({ status: 'published' }).expect(200);

    await leaver.agent.delete('/api/auth/account').send({ password: leaver.creds.password }).expect(200);
    const one = (await visitor.get(`/api/articles/posts/${kept.slug}`).expect(200)).body.article;
    assert.deepEqual(one.author, { name: 'FitGuide', coachId: null });
    assert.equal(await prisma.article.count({ where: { title: 'Goes with me' } }), 0);
  });
}

module.exports = { defineArticleSuite };
