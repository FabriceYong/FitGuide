'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { AlertCircle, AlertTriangle, Check, Loader2, MessageSquare, Users } from 'lucide-react';
import { fetchClients, sendClientNote, type CoachClient } from '../../services/adminService';

const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl p-5';
// The API allows one note a day per client (services/coachClients.js).
const NOTE_GAP_MS = 20 * 60 * 60 * 1000;

const lastWorkout = (c: CoachClient) => (c.daysSinceWorkout === null
  ? 'No workout logged yet'
  : c.daysSinceWorkout === 0 ? 'Trained today' : c.daysSinceWorkout === 1 ? 'Trained yesterday' : `Last workout ${c.daysSinceWorkout} days ago`);

type Row = CoachClient & { noteToday: boolean };

function NoteForm({ client, onSent }: { client: Row; onSent: () => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = client.name.split(' ')[0];

  if (client.noteToday) return <p className="flex items-center gap-1.5 text-xs text-white-70"><Check className="w-3.5 h-3.5 text-lime-light" aria-hidden="true" /> Note sent today</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold">
        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Send {first} a note
      </button>
    );
  }
  const send = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendClientNote(client.enrollmentId, text.trim());
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the note.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={send} className="space-y-2 w-full">
      <label htmlFor={id} className="block text-xs font-bold text-white-70">Note to {first}</label>
      <textarea
        id={id} required maxLength={500} rows={3} value={text} onChange={(e) => setText(e.target.value)}
        placeholder="A word of encouragement, or a suggestion for this week"
        className="w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white"
      />
      {error && <p role="alert" className="flex items-center gap-2 text-xs text-red-300"><AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> {error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !text.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-lime-light text-noir-eclipse text-xs font-bold disabled:opacity-60">
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />} Send note
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg bg-white/10 text-xs font-bold">Cancel</button>
      </div>
    </form>
  );
}

/**
 * The coach's clients: members following their programs who chose to share
 * their progress. Who is slipping and why comes first, with a way to send
 * them a short note.
 */
export function StudioClients() {
  const [clients, setClients] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlySlipping, setOnlySlipping] = useState(false);

  useEffect(() => {
    fetchClients()
      .then((list) => {
        const now = Date.now();
        setClients(list.map((c) => ({ ...c, noteToday: Boolean(c.lastNoteAt) && now - new Date(c.lastNoteAt!).getTime() < NOTE_GAP_MS })));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const noteSent = (enrollmentId: string) =>
    setClients((list) => (list || []).map((c) => (c.enrollmentId === enrollmentId ? { ...c, noteToday: true } : c)));

  if (error) return <p role="alert" className="flex items-center gap-2 text-sm text-red-300"><AlertCircle className="w-4 h-4" aria-hidden="true" /> {error}</p>;
  if (!clients) return <p className="flex items-center gap-2 text-sm text-white-70"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading your clients…</p>;
  if (!clients.length) {
    return (
      <div className={`${card} flex items-start gap-3 text-sm text-white-70`}>
        <Users className="w-5 h-5 text-lime-light shrink-0" aria-hidden="true" />
        <p>No clients yet. Members following your programs can choose to share their progress with you on the program page, and they&apos;ll appear here.</p>
      </div>
    );
  }

  const slipping = clients.filter((c) => c.slipping).length;
  const shown = onlySlipping ? clients.filter((c) => c.slipping) : clients;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <strong>{clients.length}</strong> {clients.length === 1 ? 'client' : 'clients'} sharing their progress
          {slipping > 0 && <> · <strong className="text-red-300">{slipping} slipping</strong></>}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlySlipping} onChange={(e) => setOnlySlipping(e.target.checked)} className="accent-lime-light" /> Only who&apos;s slipping
        </label>
      </div>
      <ul className="space-y-3" aria-label="Clients">
        {shown.map((c) => (
          <li key={c.enrollmentId} aria-label={c.name} className={`${card} space-y-3 ${c.slipping ? 'border-red-500/30' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-extrabold">{c.name}</p>
                <p className="text-xs text-white-70 mt-0.5">{c.programTitle} · week {c.currentWeek}{c.weeks ? ` of ${c.weeks}` : ''} · {c.completedCount} of {c.totalDays} sessions</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold">{c.adherencePct === null ? 'Not started' : `${c.adherencePct}% on schedule`}</p>
                <p className="text-white-70 mt-0.5">{lastWorkout(c)}</p>
              </div>
            </div>
            {c.slipping && (
              <ul className="flex flex-wrap gap-1.5" aria-label={`Why ${c.name.split(' ')[0]} is slipping`}>
                {c.reasons.map((r) => (
                  <li key={r} className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/30">
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" /> {r}
                  </li>
                ))}
              </ul>
            )}
            <NoteForm client={c} onSent={() => noteSent(c.enrollmentId)} />
          </li>
        ))}
      </ul>
      {onlySlipping && !shown.length && <p className="text-sm text-white-70">Nobody is slipping right now.</p>}
    </div>
  );
}
