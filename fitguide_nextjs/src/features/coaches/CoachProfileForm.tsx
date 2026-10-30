'use client';

import { useState, type FormEvent } from 'react';
import type { CoachProfileInput } from '../../services/adminService';

const field = 'w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white';

export const emptyCoachProfile = (): CoachProfileInput => ({ bio: '', specialties: [], contactEmail: '', phone: '', location: '' });

/**
 * A coach's public profile: bio, specialties and the contact details
 * signed-in members see to request a spot. Used to apply and, once
 * approved, in the studio.
 */
export function CoachProfileForm({ initial, submitLabel, onSubmit }: {
  initial: CoachProfileInput;
  submitLabel: string;
  onSubmit: (input: CoachProfileInput) => Promise<unknown>;
}) {
  const [p, setP] = useState<CoachProfileInput>(initial);
  const [specialties, setSpecialties] = useState(initial.specialties.join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ ...p, specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean) });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
      <label className="sm:col-span-2 text-xs font-bold text-white-70">About you
        <textarea required minLength={20} maxLength={1000} rows={4} value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })}
          placeholder="Your experience, qualifications and how you coach" className={`${field} mt-1`} />
      </label>
      <label className="sm:col-span-2 text-xs font-bold text-white-70">Specialties (comma separated)
        <input value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="e.g. Strength, Running, Pre-natal" className={`${field} mt-1`} />
      </label>
      <label className="text-xs font-bold text-white-70">Contact email
        <input type="email" maxLength={200} value={p.contactEmail || ''} onChange={(e) => setP({ ...p, contactEmail: e.target.value })} className={`${field} mt-1`} />
      </label>
      <label className="text-xs font-bold text-white-70">Phone / WhatsApp
        <input type="tel" maxLength={40} value={p.phone || ''} onChange={(e) => setP({ ...p, phone: e.target.value })} placeholder="+44 7700 900123" className={`${field} mt-1`} />
      </label>
      <label className="sm:col-span-2 text-xs font-bold text-white-70">Where you train people
        <input maxLength={120} value={p.location || ''} onChange={(e) => setP({ ...p, location: e.target.value })} placeholder="e.g. Riverside Gym, Leeds" className={`${field} mt-1`} />
      </label>
      <p className="sm:col-span-2 text-xs text-white-70">Add an email or a phone number. Signed-in members see these on your profile and programs so they can ask you for a spot.</p>
      {error && <p role="alert" className="sm:col-span-2 text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={busy} className="sm:col-span-2 justify-self-start px-5 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-50">
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
