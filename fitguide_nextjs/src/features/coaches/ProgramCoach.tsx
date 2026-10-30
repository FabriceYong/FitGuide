'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { assetUrl } from '../../lib/api';
import { fetchCoach, type PublicCoach } from '../../services/coachService';
import { CoachContact } from './CoachContactCard';

export function CoachAvatar({ coach, size = 'w-12 h-12' }: { coach: PublicCoach; size?: string }) {
  return (
    <span className={`${size} rounded-full bg-gradient-to-br from-lime-light/20 to-royal-nebula/30 border border-white-30/30 flex items-center justify-center overflow-hidden shrink-0`}>
      {coach.avatarUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={assetUrl(coach.avatarUrl) || ''} alt="" className="w-full h-full object-cover" />
        : <User className="w-5 h-5 text-white" aria-hidden="true" />}
    </span>
  );
}

/** The coach behind a program, with their contact details for members. */
export function ProgramCoach({ coachId, programTitle, inPerson }: { coachId: string; programTitle: string; inPerson: boolean }) {
  const { ready, hasAccount } = useAuth();
  const [coach, setCoach] = useState<PublicCoach | null>(null);

  useEffect(() => {
    // Load once auth is known, so signed-in members get the contact details.
    if (ready) fetchCoach(coachId).then((data) => setCoach(data.coach)).catch(() => setCoach(null));
  }, [ready, hasAccount, coachId]);

  if (!coach) return null;
  return (
    <section aria-labelledby="program-coach" className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 space-y-4">
      {inPerson && (
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-lime-light">
          <Users className="w-4 h-4" aria-hidden="true" /> Trained in person: contact the coach to request a spot
        </p>
      )}
      <div className="flex items-start gap-3">
        <CoachAvatar coach={coach} />
        <div className="min-w-0">
          <h2 id="program-coach" className="font-extrabold">Your coach: <Link href={`/coaches/${coach.id}`} className="underline">{coach.name}</Link></h2>
          {coach.specialties.length > 0 && <p className="text-xs text-white-70">{coach.specialties.join(' · ')}</p>}
          <p className="text-sm text-white-70 mt-1 line-clamp-3">{coach.bio}</p>
        </div>
      </div>
      <CoachContact coach={coach} programTitle={programTitle} inPerson={inPerson} />
    </section>
  );
}
