'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchCoach, type CoachProgram, type PublicCoach } from '../../services/coachService';
import { CoachContact } from './CoachContactCard';
import { CoachAvatar } from './ProgramCoach';

const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl p-6';

/** /coaches/[id]: a coach's bio, contact details and published programs. */
export function CoachProfileView({ id }: { id: string }) {
  const { ready, hasAccount } = useAuth();
  const [data, setData] = useState<{ coach: PublicCoach; programs: CoachProgram[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready) fetchCoach(id).then(setData).catch((err: Error) => setError(err.message));
  }, [ready, hasAccount, id]);

  if (error) return <p role="alert" className="text-white-70">{error}</p>;
  if (!data) return <Loader2 className="w-5 h-5 animate-spin" />;
  const { coach, programs } = data;
  return (
    <div className="space-y-6">
      <Link href="/programs" className="text-xs font-bold uppercase tracking-wider text-white-70 hover:text-white">← All programs</Link>
      <header className="flex items-center gap-4">
        <CoachAvatar coach={coach} size="w-20 h-20" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-lime-light">FitGuide coach</p>
          <h1 className="text-3xl font-extrabold">{coach.name}</h1>
          {coach.specialties.length > 0 && <p className="text-sm text-white-70">{coach.specialties.join(' · ')}</p>}
        </div>
      </header>
      <p className="text-white-70 max-w-3xl leading-relaxed whitespace-pre-line">{coach.bio}</p>
      <section aria-labelledby="coach-contact" className={`${card} space-y-3`}>
        <h2 id="coach-contact" className="font-extrabold">Contact</h2>
        <CoachContact coach={coach} />
      </section>
      <section aria-labelledby="coach-programs" className="space-y-3">
        <h2 id="coach-programs" className="font-extrabold text-xl">Programs</h2>
        {programs.length === 0 ? <p className="text-sm text-white-70">No published programs yet.</p> : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {programs.map((p) => (
              <li key={p.slug}>
                <Link href={`/programs/${p.slug}`} className={`${card} block hover:border-lime-light/50 space-y-1`}>
                  <p className="font-bold">{p.title}</p>
                  <p className="text-xs text-white-70">{p.level} · {p.weeks} weeks · {p.totalDays} sessions</p>
                  {p.inPerson && <p className="flex items-center gap-1.5 text-xs font-bold text-lime-light"><Users className="w-3.5 h-3.5" aria-hidden="true" /> In person</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
