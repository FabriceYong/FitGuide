'use client';

import Link from 'next/link';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { contactLinks, type PublicCoach } from '../../services/coachService';

const button = 'flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm';

/**
 * A coach's contact details with buttons to request a spot (or just get in
 * touch). Signed-out visitors are asked to sign in instead.
 */
export function CoachContact({ coach, programTitle, inPerson = false }: { coach: PublicCoach; programTitle?: string; inPerson?: boolean }) {
  if (!coach.contact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white-70">Sign in to see how to contact {coach.name}{inPerson ? ' and request a spot' : ''}.</p>
        <Link href="/" className={`${button} bg-lime-light text-noir-eclipse`}>Sign in</Link>
      </div>
    );
  }
  const { contact } = coach;
  const links = contactLinks(contact, programTitle);
  const primary = `${button} bg-lime-light text-noir-eclipse`;
  const secondary = `${button} bg-white/10 text-white`;
  return (
    <div className="space-y-3">
      <ul className="space-y-1.5 text-sm">
        {contact.location && <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-lime-light shrink-0" aria-hidden="true" /> {contact.location}</li>}
        {contact.email && <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-lime-light shrink-0" aria-hidden="true" /> <a href={`mailto:${contact.email}`} className="underline break-all py-1">{contact.email}</a></li>}
        {contact.phone && <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-lime-light shrink-0" aria-hidden="true" /> <a href={links.call || undefined} className="underline">{contact.phone}</a></li>}
      </ul>
      <div className="flex flex-wrap gap-2">
        {links.email && <a href={links.email} className={primary}><Mail className="w-4 h-4" aria-hidden="true" /> {inPerson ? 'Request a spot' : 'Email'}</a>}
        {links.whatsapp && <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={links.email ? secondary : primary}><MessageCircle className="w-4 h-4" aria-hidden="true" /> WhatsApp</a>}
        {links.call && <a href={links.call} className={links.email || links.whatsapp ? secondary : primary}><Phone className="w-4 h-4" aria-hidden="true" /> Call</a>}
      </div>
    </div>
  );
}
