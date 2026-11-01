'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Check, Copy, Loader2, Medal, Plus, Trophy, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../../components/EmptyState';
import { localToday } from '../../services/trainingService';
import {
  acceptFriend, addFriend, createChallenge, deleteChallenge, fetchChallenge, fetchChallenges, fetchFriends, fetchLeaderboard,
  joinChallenge, joinChallengeByCode, leaveChallenge, removeFriend,
  type Challenge, type Friends, type LeaderboardRow, type Metric, type NewChallenge,
} from '../../services/socialService';
import { track } from '../../lib/analytics';
import { useUnits, weightIn, weightUnit } from '../../lib/units';

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'minutes', label: 'Active minutes' },
  { value: 'sessions', label: 'Workouts' },
  { value: 'activeDays', label: 'Active days' },
  { value: 'steps', label: 'Steps' },
  { value: 'volume', label: 'Weight lifted' },
  { value: 'foodDays', label: 'Days with food logged' },
];
const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl p-5';
const field = 'w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white [color-scheme:dark]';

function Board({ rows, unit }: { rows: LeaderboardRow[]; unit: string }) {
  // Weight lifted is scored in kg; shown in the viewer's units.
  const units = useUnits();
  if (!rows.length) return <p className="text-sm text-white-70">No scores yet.</p>;
  const score = (value: number) => (unit === 'kg' ? Math.round(weightIn(value, units)) : value).toLocaleString();
  return (
    <ol className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.isYou ? 'bg-lime-light/10 border border-lime-light/30' : 'bg-noir-eclipse/60'}`}>
          <span className="w-6 text-center font-extrabold text-sm">{r.rank <= 3 ? <Medal className={`w-4 h-4 inline ${['text-yellow-300', 'text-gray-300', 'text-amber-600'][r.rank - 1]}`} aria-label={`Rank ${r.rank}`} /> : r.rank}</span>
          <span className="flex-1 text-sm font-semibold">{r.name}{r.isYou && <span className="text-white-70 font-normal"> (you)</span>}</span>
          <span className="text-sm font-bold">{score(r.score)} <span className="text-white-70 font-normal">{unit === 'kg' ? weightUnit(units) : unit}</span></span>
        </li>
      ))}
    </ol>
  );
}

/** /community: friends, the weekly friends leaderboard and challenges. */
export function CommunityView() {
  const { ready, hasAccount } = useAuth();
  const [friends, setFriends] = useState<Friends | null>(null);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [open, setOpen] = useState<Challenge | null>(null);
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<NewChallenge>({ title: '', metric: 'minutes', startDate: '', endDate: '', visibility: 'friends' });
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => Promise.all([fetchFriends(), fetchLeaderboard('minutes'), fetchChallenges()]), []);
  const show = useCallback(([f, b, c]: Awaited<ReturnType<typeof load>>) => {
    setFriends(f);
    setBoard(b.rows);
    setChallenges(c);
  }, []);
  const refresh = () => load().then(show).catch((err: Error) => setMessage(err.message));

  useEffect(() => {
    if (!ready || !hasAccount) return;
    load().then(show).catch((err: Error) => setMessage(err.message));
  }, [ready, hasAccount, load, show]);

  const act = async (task: () => Promise<unknown>, done?: string) => {
    setMessage(null);
    try {
      await task();
      if (done) setMessage(done);
      await refresh();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const openChallenge = async (c: Challenge) => {
    if (open?.id === c.id) return setOpen(null);
    try {
      setOpen(await fetchChallenge(c.id));
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const submitFriend = (e: FormEvent) => {
    e.preventDefault();
    act(async () => {
      const { result } = await addFriend(code);
      setCode('');
      setMessage(result === 'accepted' ? "You're now friends." : 'Friend request sent.');
    });
  };

  const submitJoin = (e: FormEvent) => {
    e.preventDefault();
    act(async () => {
      const c = await joinChallengeByCode(joinCode);
      setJoinCode('');
      setOpen(c);
      setMessage(`You joined ${c.title}.`);
    });
  };

  const startCreate = () => {
    const start = localToday();
    const end = new Date(`${start}T12:00:00`);
    end.setDate(end.getDate() + 13);
    setDraft({ title: '', metric: 'minutes', startDate: start, endDate: end.toISOString().slice(0, 10), visibility: 'friends' });
    setCreating(true);
  };

  const submitChallenge = (e: FormEvent) => {
    e.preventDefault();
    act(async () => {
      const c = await createChallenge(draft);
      setCreating(false);
      setOpen(await fetchChallenge(c.id));
    }, 'Challenge created.');
  };

  const copyCode = async () => {
    if (!friends) return;
    await navigator.clipboard?.writeText(friends.friendCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!ready) return <p className="flex items-center gap-2 text-white-70"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>;
  if (!hasAccount) {
    return (
      <div className={`${card} text-center space-y-4`}>
        <p className="text-white-70">Sign in to add friends and join challenges.</p>
        <Link href="/?next=/community" className="inline-block px-6 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Sign in</Link>
      </div>
    );
  }
  if (!friends) return <p className="flex items-center gap-2 text-white-70"><Loader2 className="w-4 h-4 animate-spin" /> Loading your community…</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3"><Users className="w-8 h-8 text-lime-light" /> Community</h1>
      {message && <p role="status" className="text-sm bg-white/5 border border-white-30/10 rounded-xl px-4 py-3">{message}</p>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
        <div className="space-y-6 min-w-0">
          <section className={`${card} space-y-4`} aria-labelledby="challenges-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="challenges-heading" className="text-xl font-extrabold flex items-center gap-2"><Trophy className="w-5 h-5 text-lime-light" /> Challenges</h2>
              <button onClick={startCreate} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-lime-light text-noir-eclipse"><Plus className="w-3.5 h-3.5" /> New challenge</button>
            </div>

            {creating && (
              <form onSubmit={submitChallenge} className="bg-noir-eclipse/60 rounded-xl p-4 grid sm:grid-cols-2 gap-3">
                <label className="sm:col-span-2 text-xs font-bold text-white-70">Title
                  <input required minLength={3} maxLength={100} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={`${field} mt-1`} />
                </label>
                <label className="text-xs font-bold text-white-70">Count
                  <select value={draft.metric} onChange={(e) => setDraft({ ...draft, metric: e.target.value as Metric })} className={`${field} mt-1`}>
                    {METRIC_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-white-70">Who can join
                  <select value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value as NewChallenge['visibility'] })} className={`${field} mt-1`}>
                    <option value="friends">My friends</option>
                    <option value="private">Only people with the code</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-white-70">Starts
                  <input type="date" required value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className={`${field} mt-1`} />
                </label>
                <label className="text-xs font-bold text-white-70">Ends
                  <input type="date" required value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className={`${field} mt-1`} />
                </label>
                <div className="sm:col-span-2 flex gap-2">
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Create</button>
                  <button type="button" onClick={() => setCreating(false)} className="px-5 py-2.5 rounded-xl bg-white/10 font-bold text-sm">Cancel</button>
                </div>
              </form>
            )}

            {challenges.length === 0 ? (
              <EmptyState
                icon={Trophy}
                color="#FBBF24"
                title="No challenges yet"
                text="Pick a goal like most active minutes in two weeks, invite friends with a code, and see who's ahead."
                action={!creating && <button type="button" onClick={startCreate} className="mt-1 px-4 py-2 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Start a challenge</button>}
              />
            ) : (
              <ul className="space-y-3">
                {challenges.map((c) => (
                  <li key={c.id} className="bg-noir-eclipse/60 rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button onClick={() => openChallenge(c)} aria-expanded={open?.id === c.id} className="text-left">
                        <p className="font-bold">{c.title}</p>
                        <p className="text-xs text-white-70">
                          {c.metricLabel} · {c.startDate} → {c.endDate} · {c.memberCount} {c.memberCount === 1 ? 'member' : 'members'} · <span className="capitalize">{c.status}</span>
                          {c.visibility === 'public' && ' · Official'}
                        </p>
                      </button>
                      <div className="flex gap-2">
                        {c.joined ? (
                          !c.isCreator && <button onClick={() => act(() => leaveChallenge(c.id), `You left ${c.title}.`)} className="text-xs font-bold px-3 py-2 rounded-lg bg-white/10">Leave</button>
                        ) : (
                          c.status !== 'finished' && <button onClick={() => act(async () => { setOpen(await joinChallenge(c.id)); track('challenge_joined'); }, `You joined ${c.title}.`)} className="text-xs font-bold px-3 py-2 rounded-lg bg-lime-light text-noir-eclipse">Join</button>
                        )}
                        {c.isCreator && <button onClick={() => window.confirm(`Delete ${c.title}?`) && act(() => deleteChallenge(c.id), 'Challenge deleted.')} className="text-xs font-bold px-3 py-2 rounded-lg bg-white/10 text-red-300">Delete</button>}
                      </div>
                    </div>
                    {c.isCreator && c.joinCode && <p className="text-xs text-white-70">Invite code: <span className="font-mono font-bold text-white">{c.joinCode}</span></p>}
                    {open?.id === c.id && open.leaderboard && <Board rows={open.leaderboard} unit={open.unit} />}
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={submitJoin} className="flex gap-2">
              <label htmlFor="join-code" className="sr-only">Challenge code</label>
              <input id="join-code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Have a challenge code?" className={field} />
              <button type="submit" disabled={!joinCode.trim()} className="px-4 rounded-xl bg-white/10 font-bold text-sm disabled:opacity-50">Join</button>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className={`${card} space-y-3`} aria-labelledby="week-heading">
            <h2 id="week-heading" className="font-extrabold">This week with friends</h2>
            <p className="text-xs text-white-70">Active minutes over the last 7 days, including connected services.</p>
            <Board rows={board} unit="min" />
          </section>

          <section className={`${card} space-y-4`} aria-labelledby="friends-heading">
            <h2 id="friends-heading" className="font-extrabold flex items-center gap-2"><UserPlus className="w-4 h-4 text-lime-light" /> Friends</h2>
            <div className="flex items-center justify-between gap-3 bg-noir-eclipse/60 rounded-xl px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white-70">Your friend code</p>
                <p className="font-mono font-bold text-lg tracking-widest">{friends.friendCode}</p>
              </div>
              <button onClick={copyCode} aria-label="Copy friend code" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center">
                {copied ? <Check className="w-4 h-4 text-lime-light" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <form onSubmit={submitFriend} className="flex gap-2">
              <label htmlFor="friend-code" className="sr-only">Friend&apos;s code</label>
              <input id="friend-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter a friend's code" className={field} />
              <button type="submit" disabled={!code.trim()} className="px-4 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-50">Add</button>
            </form>

            {friends.incoming.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white-70">Requests</h3>
                {friends.incoming.map((f) => (
                  <div key={f.friendshipId} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{f.name}</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => act(() => acceptFriend(f.friendshipId), `You're now friends with ${f.name}.`)} aria-label={`Accept ${f.name}`} className="w-8 h-8 rounded-lg bg-lime-light text-noir-eclipse flex items-center justify-center"><Check className="w-4 h-4" /></button>
                      <button onClick={() => act(() => removeFriend(f.friendshipId))} aria-label={`Decline ${f.name}`} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white-70">Friends ({friends.friends.length})</h3>
              {friends.friends.length === 0 && (
                <EmptyState compact icon={Users} color="#F472B6" title="Train with friends" text="Send someone your friend code above, or enter theirs, to compare weeks and join challenges together." />
              )}
              {friends.friends.map((f) => (
                <div key={f.friendshipId} className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{f.name}</span>
                  <button onClick={() => window.confirm(`Remove ${f.name} from your friends?`) && act(() => removeFriend(f.friendshipId))} className="text-xs text-white-70 hover:text-red-300">Remove</button>
                </div>
              ))}
              {friends.outgoing.map((f) => (
                <div key={f.friendshipId} className="flex items-center justify-between gap-2 text-white-70">
                  <span className="text-sm">{f.name} · pending</span>
                  <button onClick={() => act(() => removeFriend(f.friendshipId))} className="text-xs hover:text-white">Cancel</button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
