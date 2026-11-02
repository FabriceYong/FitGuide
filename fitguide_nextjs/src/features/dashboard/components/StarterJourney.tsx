'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Rocket, X } from 'lucide-react';
import { apiRequest } from '../../../lib/api';

interface Starter {
  show: boolean;
  daysLeft: number;
  done: number;
  total: number;
  steps: { id: string; title: string; done: boolean; href: string | null }[];
}

/**
 * The first-week starter journey on the home page: seven small first steps,
 * ticked off from what the member has done, for an account's first two
 * weeks (the app's starter_journey.dart).
 */
export function StarterJourney() {
  const [starter, setStarter] = useState<Starter | null>(null);

  useEffect(() => {
    apiRequest('/progress/starter', { auth: true }).then((d) => setStarter(d.starter)).catch(() => setStarter(null));
  }, []);

  if (!starter?.show) return null;
  const hide = () => {
    setStarter(null);
    apiRequest('/progress/starter/hide', { method: 'POST', auth: true }).catch(() => {});
  };
  const complete = starter.done === starter.total;
  const pct = Math.round((starter.done / starter.total) * 100);

  return (
    <section aria-labelledby="starter-heading" className="bg-obsidian-wave border border-lime-light/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="starter-heading" className="font-extrabold flex items-center gap-2"><Rocket className="w-5 h-5 text-lime-light" aria-hidden="true" /> {complete ? 'You’re all set up' : 'Your first week'}</h2>
          <p className="text-sm text-white-70 mt-0.5">{complete ? 'Every first step done. Great start!' : `${starter.done} of ${starter.total} first steps done`}</p>
        </div>
        <button type="button" onClick={hide} aria-label="Hide your first week steps" className="p-2 -m-2 text-white-70 hover:text-white"><X className="w-4 h-4" aria-hidden="true" /></button>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden" role="progressbar" aria-valuenow={starter.done} aria-valuemin={0} aria-valuemax={starter.total} aria-label="First week steps done">
        <div className="h-full rounded-full bg-lime-light" style={{ width: `${pct}%` }} />
      </div>
      <ol className="grid sm:grid-cols-2 gap-2">
        {starter.steps.map((s) => {
          const body = (
            <>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${s.done ? 'bg-lime-light text-noir-eclipse' : 'border border-white-30/40'}`} aria-hidden="true">
                {s.done && <Check className="w-3.5 h-3.5" />}
              </span>
              <span className={`flex-1 text-sm ${s.done ? 'text-white-70 line-through' : ''}`}>{s.title}</span>
              {!s.done && s.href && <ChevronRight className="w-4 h-4 text-white-70" aria-hidden="true" />}
              <span className="sr-only">{s.done ? '(done)' : '(to do)'}</span>
            </>
          );
          const cls = 'flex items-center gap-3 bg-noir-eclipse/60 rounded-xl px-3 py-2.5';
          return (
            <li key={s.id}>
              {!s.done && s.href ? <Link href={s.href} className={`${cls} hover:ring-1 hover:ring-lime-light/50`}>{body}</Link> : <div className={cls}>{body}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
