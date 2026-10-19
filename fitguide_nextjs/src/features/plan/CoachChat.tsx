'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Loader2, RotateCcw, Send } from 'lucide-react';
import { fetchCoach, resetCoach, sendCoachMessage, type CoachMessage } from '../../services/planService';

/** The user's message, shown right away while the coach answers. */
const pendingMessage = (text: string): CoachMessage => ({
  id: `pending-${Date.now()}`, role: 'user', text, createdAt: new Date().toISOString(),
});

const SUGGESTIONS = [
  'What should I focus on this week?',
  'My knees hurt on lunges. What can I do instead?',
  'Swap my next workout for something shorter.',
];

/** Chat with the AI coach. Calls onPlanChanged when the coach edits the plan. */
export function CoachChat({ onPlanChanged }: { onPlanChanged: () => void }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCoach()
      .then((data) => {
        setAvailable(data.available);
        setMessages(data.messages);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, sending]);

  const send = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    const pending = pendingMessage(trimmed);
    setMessages((m) => [...m, pending]);
    setText('');
    try {
      const { reply, changedPlan } = await sendCoachMessage(trimmed);
      setMessages((m) => [...m, reply]);
      if (changedPlan) onPlanChanged();
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== pending.id));
      setText(trimmed);
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    send(text);
  };

  const startOver = async () => {
    if (!window.confirm('Start a new conversation? The current one will be deleted.')) return;
    await resetCoach();
    setMessages([]);
  };

  return (
    <section aria-label="AI coach" className="bg-obsidian-wave border border-white-30/10 rounded-2xl flex flex-col h-[600px] max-h-[80vh]">
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white-30/10">
        <h2 className="font-extrabold flex items-center gap-2"><Bot className="w-5 h-5 text-lime-light" /> Coach</h2>
        {messages.length > 0 && (
          <button onClick={startOver} className="flex items-center gap-1.5 text-xs font-bold text-white-70 hover:text-white">
            <RotateCcw className="w-3.5 h-3.5" /> New chat
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" aria-live="polite">
        {available === false && (
          <p className="text-sm text-white-70">The coach isn&apos;t available on this server yet.</p>
        )}
        {available && messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-white-70">Ask about your plan, form, swaps or recovery. The coach sees your profile, plan and recent sessions.</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-left text-sm px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p className={`max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed rounded-2xl px-4 py-2.5 ${
              m.role === 'user' ? 'bg-lime-light text-noir-eclipse' : 'bg-noir-eclipse border border-white-30/10'
            }`}>
              <span className="sr-only">{m.role === 'user' ? 'You: ' : 'Coach: '}</span>{m.text}
            </p>
          </div>
        ))}
        {sending && <p className="flex items-center gap-2 text-sm text-white-70"><Loader2 className="w-4 h-4 animate-spin" /> Coach is thinking…</p>}
        <div ref={endRef} />
      </div>

      {error && <p role="alert" className="px-5 pb-2 text-sm text-red-300">{error}</p>}
      <form onSubmit={submit} className="flex gap-2 p-4 border-t border-white-30/10">
        <label htmlFor="coach-input" className="sr-only">Message the coach</label>
        <input
          id="coach-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          disabled={!available || sending}
          placeholder={available ? 'Ask your coach…' : 'Coach unavailable'}
          className="flex-1 bg-noir-eclipse border border-white-30/20 rounded-xl px-4 py-2.5 text-sm text-white disabled:opacity-60"
        />
        <button type="submit" disabled={!available || sending || !text.trim()} aria-label="Send" className="w-11 h-11 rounded-xl bg-lime-light text-noir-eclipse flex items-center justify-center disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </section>
  );
}
