'use client';

import { useEffect, useState } from 'react';
import { Check, MessageSquare } from 'lucide-react';
import { fetchCoachNotes, markCoachNoteRead, type CoachNote } from '../../../services/trainingService';
import { formatDateTime } from '../../progress/format';

/**
 * Unread notes from the coaches of programs the member shares their progress
 * with, on the home page until they mark them read (the app's coach_notes.dart).
 */
export function CoachNotes() {
  const [notes, setNotes] = useState<CoachNote[]>([]);

  useEffect(() => {
    fetchCoachNotes().then(setNotes).catch(() => setNotes([]));
  }, []);

  const read = (note: CoachNote) => {
    setNotes((list) => list.filter((n) => n.id !== note.id));
    markCoachNoteRead(note.id).catch(() => {});
  };

  if (!notes.length) return null;
  return (
    <div className="space-y-3">
      {notes.map((n) => (
        <section key={n.id} aria-label={`A note from ${n.coachName}`} className="bg-obsidian-wave border border-lime-light/30 rounded-2xl p-5 flex flex-wrap items-start gap-4">
          <span className="w-10 h-10 rounded-xl bg-lime-light/15 text-lime-light flex items-center justify-center shrink-0"><MessageSquare className="w-5 h-5" aria-hidden="true" /></span>
          <div className="flex-1 min-w-[12rem]">
            <h2 className="font-extrabold">A note from {n.coachName}</h2>
            <p className="text-xs text-white-70 mt-0.5">{n.programTitle} · {formatDateTime(n.createdAt)}</p>
            <p className="text-sm mt-2 whitespace-pre-line">{n.text}</p>
          </div>
          <button type="button" onClick={() => read(n)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold shrink-0">
            <Check className="w-4 h-4" aria-hidden="true" /> Got it
          </button>
        </section>
      ))}
    </div>
  );
}
