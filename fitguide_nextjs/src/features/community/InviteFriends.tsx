'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Gift, Share2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { inviteLink } from '../../lib/invite';
import { formatDay } from '../progress/format';

interface Referrals {
  code: string;
  invited: number;
  rewarded: number;
  rewardDays: number;
  rewardsLeft: number;
  plusUntil: string | null;
}

/**
 * Invite a friend on /community: both get a week of PLUS once they finish
 * their first workout (the app's invite_friends.dart).
 */
export function InviteFriends() {
  const [info, setInfo] = useState<Referrals | null>(null);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiRequest('/referrals', { auth: true }).then((d) => {
      setInfo(d.referrals);
      setLink(inviteLink(d.referrals.code));
    }).catch(() => setInfo(null));
  }, []);

  if (!info) return null;
  const text = `Train with me on FitGuide. Sign up with my link and we both get a week of PLUS after your first workout: ${link}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* the link is on screen to copy by hand */ }
  };
  const share = () => navigator.share?.({ title: 'FitGuide', text }).catch(() => {});

  return (
    <section className="bg-gradient-to-br from-lime-light/15 to-obsidian-wave border border-lime-light/30 rounded-2xl p-5 space-y-4" aria-labelledby="invite-heading">
      <h2 id="invite-heading" className="text-xl font-extrabold flex items-center gap-2"><Gift className="w-5 h-5 text-lime-light" aria-hidden="true" /> Invite a friend</h2>
      <p className="text-sm">When a friend signs up with your link and finishes their first workout, you both get <strong>a week of FitGuide PLUS</strong>.</p>
      <div className="flex gap-2">
        <input readOnly value={link} aria-label="Your invite link" onFocus={(e) => e.target.select()} className="flex-1 min-w-0 bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-xs text-white" />
        <button type="button" onClick={copy} aria-label="Copy your invite link" className="shrink-0 w-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center">
          {copied ? <Check className="w-4 h-4 text-lime-light" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button type="button" onClick={share} aria-label="Share your invite link" className="shrink-0 w-10 rounded-xl bg-lime-light text-noir-eclipse flex items-center justify-center"><Share2 className="w-4 h-4" aria-hidden="true" /></button>
        )}
      </div>
      <p className="text-xs text-white-70">
        {info.invited === 0 ? 'No one has joined with your link yet.' : `${info.invited} joined with your link, ${info.rewarded} finished a first workout.`}
        {info.plusUntil && ` You have PLUS until ${formatDay(info.plusUntil.slice(0, 10), { day: 'numeric', month: 'long' })}.`}
        {info.rewardsLeft === 0 && ' You’ve earned every invite week there is.'}
      </p>
    </section>
  );
}
