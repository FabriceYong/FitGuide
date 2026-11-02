/**
 * Invites: a week of PLUS for both once the invited member finishes their
 * first workout. Runs inside defineApiSuite against the test Postgres.
 */
const { it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { prisma } = require('../db/prisma');

const minutesAgo = (m) => new Date(Date.now() - m * 60e3).toISOString();
const workout = { workoutSlug: 'core-power-blast', startedAt: minutesAgo(30), completedAt: minutesAgo(5), durationSec: 1500 };
const days = (date) => (new Date(date) - Date.now()) / 864e5;

/** Sign up with an invite code, confirm the email and sign in. */
async function signUpInvited(app, name, inviteCode) {
  const creds = { name, email: `invited-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`, password: 'invited-password-123', inviteCode };
  await request(app).post('/api/auth/register').send(creds).expect(201);
  await prisma.user.update({ where: { email: creds.email }, data: { emailVerifiedAt: new Date() } });
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: creds.email, password: creds.password }).expect(200);
  return { agent, user: res.body.user };
}

function defineReferralSuite(ctx) {
  it('gives both a week of PLUS when the invited friend finishes a first workout', async () => {
    const { app } = ctx();
    await request(app).get('/api/referrals').expect(401);
    const inviter = await ctx().signUp('Ivo Inviter');
    const { referrals } = (await inviter.agent.get('/api/referrals').expect(200)).body;
    assert.match(referrals.code, /^[A-Z2-9]{8}$/);
    assert.deepEqual([referrals.invited, referrals.rewarded, referrals.rewardDays, referrals.plusUntil], [0, 0, 7, null]);

    const friend = await signUpInvited(app, 'Fia Friend', referrals.code.toLowerCase());
    assert.equal(friend.user.plan, 'free');
    // They're friends straight away.
    assert.ok((await friend.agent.get('/api/social/friends').expect(200)).body.friends.some((f) => f.name === 'Ivo I.'));
    assert.equal((await inviter.agent.get('/api/referrals').expect(200)).body.referrals.invited, 1);

    const first = await friend.agent.post('/api/sessions').send(workout).expect(201);
    assert.deepEqual([first.body.inviteRewarded, first.body.plusDays], [true, 7]);
    const second = await friend.agent.post('/api/sessions').send({ ...workout, clientId: 'again' }).expect(201);
    assert.equal(second.body.inviteRewarded, undefined, 'only the first workout');

    for (const agent of [friend.agent, inviter.agent]) {
      const me = (await agent.get('/api/auth/me').expect(200)).body.user;
      assert.equal(me.plan, 'plus');
      assert.ok(Math.abs(days(me.plusUntil) - 7) < 0.01);
    }
    const after = (await inviter.agent.get('/api/referrals').expect(200)).body.referrals;
    assert.deepEqual([after.rewarded, after.rewardsLeft], [1, 11]);
    // PLUS from invites doesn't count as a subscription.
    assert.equal((await inviter.agent.get('/api/billing').expect(200)).body.subscriptionStatus, null);
  });

  it('adds weeks on top of each other, and ignores unknown codes', async () => {
    const { app } = ctx();
    const inviter = await ctx().signUp('Two Invites');
    const { code } = (await inviter.agent.get('/api/referrals').expect(200)).body.referrals;
    for (const name of ['One Friend', 'Two Friend']) {
      const friend = await signUpInvited(app, name, code);
      await friend.agent.post('/api/sessions').send(workout).expect(201);
    }
    const me = (await inviter.agent.get('/api/auth/me').expect(200)).body.user;
    assert.ok(Math.abs(days(me.plusUntil) - 14) < 0.01);

    const stray = await signUpInvited(app, 'No Inviter', 'NOPE2345');
    assert.equal((await stray.agent.post('/api/sessions').send(workout).expect(201)).body.inviteRewarded, undefined);
  });

  it('runs out when the invite week is over', async () => {
    const member = await ctx().signUp('Lapsed Plus');
    await prisma.user.update({ where: { id: member.user.id }, data: { plusUntil: new Date(Date.now() - 60e3) } });
    assert.equal((await member.agent.get('/api/auth/me').expect(200)).body.user.plan, 'free');
  });
}

module.exports = { defineReferralSuite };
