'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Crown, Loader2, Minus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../lib/api';
import { track } from '../../lib/analytics';
import { useLocale, useT } from '../../i18n/client';
import type { MessageKey } from '../../i18n/messages';

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
const FEATURES: MessageKey[] = ['plus.feature.content', 'plus.feature.coach', 'plus.feature.support'];

const money = (p: Price, locale: string) => new Intl.NumberFormat(locale, { style: 'currency', currency: p.currency.toUpperCase() }).format(p.amount / 100);

/** /plus: what PLUS includes, checkout and subscription management. */
export function PlusView() {
  const { ready, hasAccount, updateUser } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const t = useT();
  const locale = useLocale();

  useEffect(() => {
    if (!ready || !hasAccount) return;
    const result = new URLSearchParams(window.location.search).get('checkout');
    if (result) window.history.replaceState(null, '', '/plus');
    apiRequest('/billing', { auth: true })
      .then((data: BillingStatus) => {
        setStatus(data);
        updateUser({ plan: data.plan });
        if (result === 'success') {
          setMessage(t(data.plan === 'plus' ? 'plus.welcome' : 'plus.confirming'));
        } else if (result === 'cancelled') {
          setMessage(t('plus.cancelled'));
        }
      })
      .catch((err: Error) => setMessage(err.message));
  }, [ready, hasAccount, updateUser, t]);

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
        <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-400/15 text-amber-300"><Crown className="w-3.5 h-3.5" aria-hidden="true" /> FitGuide PLUS</span>
        <h1 className="text-4xl md:text-5xl font-extrabold">{t('plus.title')}</h1>
        <p className="text-white-70">{t('plus.cancelAnytime')}</p>
      </div>

      <ul className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 space-y-3">
        {FEATURES.map((f) => <li key={f} className="flex items-start gap-3"><Check className="w-5 h-5 text-lime-light shrink-0" aria-hidden="true" /> {t(f)}</li>)}
      </ul>

      {message && <p role="status" className="text-sm bg-white/5 border border-white-30/10 rounded-xl px-4 py-3 text-center">{message}</p>}

      {!ready ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : !hasAccount ? (
        <div className="text-center"><Link href="/?next=/plus" className="inline-block px-6 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold">{t('plus.signIn')}</Link></div>
      ) : !status ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : status.plan === 'plus' ? (
        <div className="bg-obsidian-wave border border-lime-light/30 rounded-2xl p-6 text-center space-y-3">
          <p className="font-bold text-lg">{t('plus.youHave')}</p>
          {status.renewsAt && (
            <p className="text-sm text-white-70">
              {t(status.cancelAtPeriodEnd ? 'plus.ends' : 'plus.renews', { date: new Date(status.renewsAt).toLocaleDateString(locale) })}
              {status.subscriptionStatus === 'past_due' && ` · ${t('plus.pastDue')}`}
            </p>
          )}
          <button onClick={() => go('portal', '/billing/portal')} disabled={busy !== null} className="px-6 py-3 rounded-xl bg-white/10 font-bold text-sm">
            {busy === 'portal' ? t('plus.opening') : t('plus.manage')}
          </button>
        </div>
      ) : !status.enabled ? (
        <p className="text-center text-white-70">{t('plus.unavailable')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {[monthly, yearly].filter(Boolean).map((p) => (
            <div key={p!.interval} className={`bg-obsidian-wave border rounded-2xl p-6 space-y-4 ${p!.interval === 'yearly' ? 'border-lime-light/40' : 'border-white-30/10'}`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white-70">{t(p!.interval === 'yearly' ? 'plus.yearly' : 'plus.monthly')}</p>
                <p className="text-3xl font-extrabold mt-1">{money(p!, locale)}<span className="text-sm text-white-70 font-semibold"> / {t(p!.interval === 'yearly' ? 'plus.perYear' : 'plus.perMonth')}</span></p>
                {p!.interval === 'yearly' && saving > 0 && <p className="text-xs text-lime-light font-bold mt-1">{t('plus.save', { percent: saving })}</p>}
              </div>
              <button onClick={() => go(p!.interval, '/billing/checkout', { interval: p!.interval })} disabled={busy !== null} className="w-full px-5 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-60">
                {busy === p!.interval ? t('plus.openingCheckout') : t('plus.get')}
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-white-70 text-center">{t('plus.stripe')}</p>

      <section aria-labelledby="plus-compare" className="space-y-4 pt-4">
        <h2 id="plus-compare" className="text-2xl font-extrabold text-center">{t('plus.compare.title')}</h2>
        <div className="bg-obsidian-wave border border-white-30/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white-30/10 text-left">
                <th scope="col" className="p-4 font-bold text-white-70">{t('plus.compare.feature')}</th>
                <th scope="col" className="p-4 font-bold text-center w-28">{t('plus.compare.free')}</th>
                <th scope="col" className="p-4 font-extrabold text-center w-28 text-amber-300 bg-amber-400/5">PLUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white-30/10">
              {COMPARE.map(([feature, free, plus]) => (
                <tr key={feature}>
                  <th scope="row" className="p-4 font-medium text-left">{t(feature)}</th>
                  <td className="p-4 text-center text-white-70">{cell(free, t)}</td>
                  <td className="p-4 text-center bg-amber-400/5">{cell(plus, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="plus-faq" className="space-y-3">
        <h2 id="plus-faq" className="text-2xl font-extrabold text-center">{t('plus.faq.title')}</h2>
        {FAQ.map(([q, a]) => (
          <details key={q} className="group bg-obsidian-wave border border-white-30/10 rounded-2xl px-5 py-4">
            <summary className="flex items-center justify-between gap-3 cursor-pointer font-bold list-none">
              {t(q)} <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="text-sm text-white-70 mt-3 leading-relaxed">{t(a)}</p>
          </details>
        ))}
      </section>
    </div>
  );
}

// [feature, free, PLUS]: true for included, false for not, or a short note.
const COMPARE: [MessageKey, boolean | MessageKey, boolean | MessageKey][] = [
  ['plus.compare.workouts', 'plus.compare.workoutsFree', 'plus.compare.workoutsPlus'],
  ['plus.compare.plan', true, true],
  ['plus.compare.nutrition', true, true],
  ['plus.compare.health', true, true],
  ['plus.compare.coach', 'plus.compare.coachFree', 'plus.compare.coachPlus'],
  ['plus.compare.programs', false, true],
];

const FAQ: [MessageKey, MessageKey][] = [
  ['plus.faq.cancelQ', 'plus.faq.cancelA'],
  ['plus.faq.keepQ', 'plus.faq.keepA'],
  ['plus.faq.switchQ', 'plus.faq.switchA'],
  ['plus.faq.payQ', 'plus.faq.payA'],
];

function cell(value: boolean | MessageKey, t: (key: MessageKey) => string) {
  if (value === true) return <Check className="w-5 h-5 text-lime-light mx-auto" aria-label="Included" />;
  if (value === false) return <Minus className="w-5 h-5 text-white-30 mx-auto" aria-label="Not included" />;
  return <span className="font-semibold">{t(value)}</span>;
}
