'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Copy, Crown, Dumbbell, Loader2, LogOut, MessageCircle, Send, Shield, UserMinus } from 'lucide-react';
import { fetchCrew, leaveCrew, removeCrewMember, sendCrewMessage, updateCrew, type Crew } from '../../services/crewService';
import { formatDateTime, formatSeconds } from '../progress/format';
import { GoalBar } from './Crews';

const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl p-5';

/** /community/crews/[id]: the crew's goal, members, this week's workouts and chat (the app's crew_screen.dart). */
export function CrewView({ id }: { id: string }) {
  const router = useRouter();
  const [crew, setCrew] = useState<Crew | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [goal, setGoal] = useState<number | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const load = useCallback(() => fetchCrew(id).then(setCrew).catch((err: Error) => setError(err.message)), [id]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [crew?.messages.length]);

  if (error && !crew) {
    return (
      <div className={`${card} space-y-3`}>
        <p role="alert" className="text-red-300">{error}</p>
        <Link href="/community" className="text-sm font-bold text-lime-light">← Back to Community</Link>
      </div>
    );
  }
  if (!crew) return <p className="flex items-center gap-2 text-white-70"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading the crew…</p>;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const message = await sendCrewMessage(crew.id, text.trim());
      setCrew({ ...crew, messages: [...crew.messages, message] });
      setText('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const act = async (task: () => Promise<unknown>) => {
    setError(null);
    try {
      await task();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(crew.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* the code is on screen to copy by hand */ }
  };

  const leave = () => {
    if (!window.confirm(`Leave ${crew.name}?`)) return;
    act(async () => {
      await leaveCrew(crew.id);
      router.push('/community');
    });
  };

  const reached = crew.thisWeek >= crew.weeklyGoal;
  return (
    <div className="space-y-6">
      <Link href="/community" className="text-xs font-bold uppercase tracking-wider text-white-70 hover:text-white">← Community</Link>
      <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3"><Shield className="w-8 h-8 text-lime-light" aria-hidden="true" /> {crew.name}</h1>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <section className={`${card} space-y-3`} aria-labelledby="crew-goal">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="crew-goal" className="font-extrabold">This week&apos;s goal</h2>
              <p className="text-sm"><strong className="text-lg">{crew.thisWeek}</strong> of {crew.weeklyGoal} workouts{reached && <span className="text-emerald-400 font-bold"> · reached!</span>}</p>
            </div>
            <GoalBar done={crew.thisWeek} goal={crew.weeklyGoal} label={`${crew.thisWeek} of ${crew.weeklyGoal} workouts this week`} />
            {crew.isOwner && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (goal) act(async () => setCrew(await updateCrew(crew.id, { weeklyGoal: goal })));
                }}
                className="flex items-end gap-2"
              >
                <label className="text-xs font-bold text-white-70">Change the goal
                  <input type="number" min={1} max={100} value={goal ?? crew.weeklyGoal} onChange={(e) => setGoal(Number(e.target.value))} className="mt-1 w-24 block bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white" />
                </label>
                <button type="submit" className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 font-bold text-sm">Save</button>
              </form>
            )}
          </section>

          <section className={`${card} space-y-3`} aria-labelledby="crew-activity">
            <h2 id="crew-activity" className="font-extrabold flex items-center gap-2"><Dumbbell className="w-5 h-5 text-lime-light" aria-hidden="true" /> Last 7 days</h2>
            {crew.activity.length === 0 ? <p className="text-sm text-white-70">No workouts yet this week. Be the first.</p> : (
              <ul className="space-y-2">
                {crew.activity.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 bg-noir-eclipse/60 rounded-xl px-4 py-3 text-sm">
                    <span><strong>{a.isYou ? 'You' : a.name}</strong> · {a.workoutTitle}</span>
                    <span className="text-xs text-white-70 shrink-0">{formatSeconds(a.durationSec)} · {formatDateTime(a.completedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${card} space-y-3`} aria-labelledby="crew-chat">
            <h2 id="crew-chat" className="font-extrabold flex items-center gap-2"><MessageCircle className="w-5 h-5 text-lime-light" aria-hidden="true" /> Chat</h2>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1" role="log" aria-label="Crew chat">
              {crew.messages.length === 0 && <p className="text-sm text-white-70">Say hello to your crew.</p>}
              {crew.messages.map((m) => (
                <div key={m.id} className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.isYou ? 'ml-auto bg-lime-light/15 border border-lime-light/30' : 'bg-white/5'}`}>
                  {!m.isYou && <p className="text-[11px] font-bold text-lime-light">{m.name}</p>}
                  <p className="whitespace-pre-line break-words">{m.text}</p>
                  <p className="text-[10px] text-white-70 mt-0.5">{formatDateTime(m.createdAt)}</p>
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <form onSubmit={send} className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Message your crew" aria-label="Message your crew" className="flex-1 bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white" />
              <button type="submit" disabled={sending || !text.trim()} aria-label="Send" className="w-11 h-10 rounded-xl bg-lime-light text-noir-eclipse flex items-center justify-center disabled:opacity-50">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
              </button>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <section className={`${card} space-y-3`} aria-labelledby="crew-members">
            <h2 id="crew-members" className="font-extrabold">Members</h2>
            <ul className="space-y-2">
              {crew.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 min-w-0 truncate">
                    {m.isYou ? 'You' : m.name}
                    {m.role === 'owner' && <Crown className="inline w-3.5 h-3.5 ml-1.5 text-amber-300" aria-label="owner" />}
                  </span>
                  <span className="text-xs text-white-70">{m.workoutsThisWeek} this week</span>
                  {crew.isOwner && !m.isYou && (
                    <button type="button" onClick={() => act(async () => { await removeCrewMember(crew.id, m.id); await load(); })} aria-label={`Remove ${m.name}`} className="p-1.5 rounded-lg text-white-70 hover:text-red-300 hover:bg-white/5">
                      <UserMinus className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="bg-noir-eclipse/60 rounded-xl p-3 space-y-1">
              <p className="text-xs text-white-70">Invite people with this code. Crew members see each other&apos;s workouts here.</p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold tracking-widest">{crew.inviteCode}</span>
                <button type="button" onClick={copy} aria-label="Copy the invite code" className="p-2 rounded-lg bg-white/10 hover:bg-white/15">
                  {copied ? <Check className="w-4 h-4 text-lime-light" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </section>
          <button type="button" onClick={leave} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-red-300 bg-white/5 hover:bg-white/10">
            <LogOut className="w-4 h-4" aria-hidden="true" /> Leave the crew
          </button>
        </aside>
      </div>
    </div>
  );
}
