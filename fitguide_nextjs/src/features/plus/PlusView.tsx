'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Crown, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../lib/api';
import { track } from '../../lib/analytics';

interface Price {
  interval: 'monthly' | 'yearly';
  amount: number;
  currency: string;
}

interface BillingStatus {
  enabled: boolean;
  plan: 'free' | 'plus';
  subscriptionStatus: string | null;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  prices: Price[];
}

// What PLUS adds on top of the free account (plans, nutrition, progress
// and wearables are free for everyone).
const FEATURES = [
  'Every PLUS workout and program, including programs from FitGuide creators',
  'Unlimited AI coach messages (free accounts get 10 a day)',
  'Supports new workouts, programs and features',
];

const money = (p: Price) => new Intl.NumberFormat(undefined, { style: 'currency', currency: p.currency.toUpperCase() }).format(p.amount / 100);

/** /plus: what PLUS includes, checkout and subscription management. */
export function PlusView() {
  const { ready, hasAccount, updateUser } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !hasAccount) return;
    const result = new URLSearchParams(window.location.search).get('checkout');
    if (result) window.history.replaceState(null, '', '/plus');
    apiRequest('/billing', { auth: true })
      .then((data: BillingStatus) => {
        setStatus(data);
        updateUser({ plan: data.plan });
        if (result === 'success') {
          setMessage(data.plan === 'plus' ? 'Welcome to PLUS!' : 'Thanks! Your payment is being confirmed; PLUS turns on in a moment.');
        } else if (result === 'cancelled') {
          setMessage('Checkout was cancelled. You have not been charged.');
        }
      })
      .catch((err: Error) => setMessage(err.message));
  }, [ready, hasAccount, updateUser]);

  const go = async (key: string, path: string, body?: object) => {
    setBusy(key);
    setMessage(null);
    try {
      const { url } = await apiRequest(path, { method: 'POST', auth: true, body });
      if (key !== 'portal') track('checkout_started', { interval: key });
      window.location.assign(url);
    } catch (err) {
      setMessage((err as Error).message);
      setBusy(null);
    }
  };

  const yearly = status?.prices.find((p) => p.interval === 'yearly');
  const monthly = status?.prices.find((p) => p.interval === 'monthly');
  const saving = yearly && monthly ? Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-400/15 text-amber-300"><Crown className="w-3.5 h-3.5" /> FitGuide PLUS</span>
        <h1 className="text-4xl md:text-5xl font-extrabold">Train with everything</h1>
        <p className="text-white-70">Cancel anytime from your billing settings.</p>
      </div>

      <ul className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 space-y-3">
        {FEATURES.map((f) => <li key={f} className="flex items-start gap-3"><Check className="w-5 h-5 text-lime-light shrink-0" /> {f}</li>)}
      </ul>

      {message && <p role="status" className="text-sm bg-white/5 border border-white-30/10 rounded-xl px-4 py-3 text-center">{message}</p>}

      {!ready ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : !hasAccount ? (
        <div className="text-center"><Link href="/?next=/plus" className="inline-block px-6 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold">Sign in to subscribe</Link></div>
      ) : !status ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : status.plan === 'plus' ? (
        <div className="bg-obsidian-wave border border-lime-light/30 rounded-2xl p-6 text-center space-y-3">
          <p className="font-bold text-lg">You have PLUS</p>
          {status.renewsAt && (
            <p className="text-sm text-white-70">
              {status.cancelAtPeriodEnd ? 'Ends' : 'Renews'} on {new Date(status.renewsAt).toLocaleDateString()}
              {status.subscriptionStatus === 'past_due' && ' · payment overdue, please update your card'}
            </p>
          )}
          <button onClick={() => go('portal', '/billing/portal')} disabled={busy !== null} className="px-6 py-3 rounded-xl bg-white/10 font-bold text-sm">
            {busy === 'portal' ? 'Opening…' : 'Manage subscription'}
          </button>
        </div>
      ) : !status.enabled ? (
        <p className="text-center text-white-70">Subscriptions aren&apos;t available yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {[monthly, yearly].filter(Boolean).map((p) => (
            <div key={p!.interval} className={`bg-obsidian-wave border rounded-2xl p-6 space-y-4 ${p!.interval === 'yearly' ? 'border-lime-light/40' : 'border-white-30/10'}`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white-70">{p!.interval === 'yearly' ? 'Yearly' : 'Monthly'}</p>
                <p className="text-3xl font-extrabold mt-1">{money(p!)}<span className="text-sm text-white-70 font-semibold"> / {p!.interval === 'yearly' ? 'year' : 'month'}</span></p>
                {p!.interval === 'yearly' && saving > 0 && <p className="text-xs text-lime-light font-bold mt-1">Save {saving}%</p>}
              </div>
              <button onClick={() => go(p!.interval, '/billing/checkout', { interval: p!.interval })} disabled={busy !== null} className="w-full px-5 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-60">
                {busy === p!.interval ? 'Opening checkout…' : 'Get PLUS'}
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-white-70 text-center">Payments are handled by Stripe. FitGuide never sees your card details.</p>
    </div>
  );
}
