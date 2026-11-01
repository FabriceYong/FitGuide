'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { AlertCircle, BellRing, CheckCircle2, Loader2 } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import {
  browserReminders, fetchReminders, saveReminders, turnOffBrowserReminders, turnOnBrowserReminders,
  type BrowserReminders, type ReminderSettings,
} from '../../../services/reminderService';

// Monday first; values are the API's weekdays (0 = Sunday).
const WEEK = [
  [1, 'Mon', 'Monday'], [2, 'Tue', 'Tuesday'], [3, 'Wed', 'Wednesday'], [4, 'Thu', 'Thursday'],
  [5, 'Fri', 'Friday'], [6, 'Sat', 'Saturday'], [0, 'Sun', 'Sunday'],
] as const;

const BROWSER_TEXT: Record<BrowserReminders, string> = {
  unsupported: 'This browser can’t show notifications. The FitGuide app can.',
  blocked: 'Notifications are blocked for this site. Allow them in your browser’s site settings, then come back.',
  off: 'Off in this browser.',
  on: 'On in this browser.',
};

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Workout days and time, the streak nudge, and whether this browser gets them. */
export function Reminders({ onClose }: { onClose: () => void }) {
  const timeId = useId();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [browser, setBrowser] = useState<BrowserReminders | null>(null);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchReminders(), browserReminders()])
      .then(([data, state]) => {
        setSettings(data.settings);
        setPublicKey(data.publicKey);
        setBrowser(state);
      })
      .catch((err) => setError(errorText(err, 'Could not load your reminders.')));
  }, []);

  const change = (changes: Partial<ReminderSettings>) => {
    setSettings((s) => (s ? { ...s, ...changes } : s));
    setSaved(false);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setError(null);
    setSaving(true);
    try {
      setSettings(await saveReminders(settings));
      setSaved(true);
    } catch (err) {
      setError(errorText(err, 'Could not save your reminders.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleBrowser = async () => {
    if (!publicKey) return;
    setError(null);
    setSwitching(true);
    try {
      setBrowser(browser === 'on' ? await turnOffBrowserReminders() : await turnOnBrowserReminders(publicKey));
    } catch (err) {
      setError(errorText(err, 'Could not change this browser’s reminders.'));
    } finally {
      setSwitching(false);
    }
  };

  if (!settings || !browser) {
    return (
      <Modal title="Reminders" onClose={onClose} size="sm">
        {error ? <FormError message={error} /> : <p className="flex items-center gap-2 text-sm text-white-70"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading…</p>}
      </Modal>
    );
  }

  return (
    <Modal title="Reminders" onClose={onClose} size="sm">
      <form onSubmit={save} className="space-y-5">
        <p className="text-sm text-white-70">A nudge on the days you plan to train. None comes on a day you’ve already worked out.</p>

        <fieldset>
          <legend className="text-sm font-medium text-white mb-2">Workout days</legend>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEK.map(([day, short, long]) => {
              const on = settings.days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  aria-label={long}
                  onClick={() => change({ days: on ? settings.days.filter((d) => d !== day) : [...settings.days, day] })}
                  className={`h-10 rounded-lg text-xs font-bold border ${on ? 'bg-lime-light/15 border-lime-light text-white' : 'bg-white/5 border-white-30/30 text-white-70 hover:text-white'}`}
                >
                  {short}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <label htmlFor={timeId} className="block text-sm font-medium text-white">Time</label>
          <input
            id={timeId}
            type="time"
            required
            value={settings.time}
            onChange={(e) => change({ time: e.target.value })}
            className="w-full h-11 bg-noir-eclipse border border-white-30/40 rounded-lg px-3.5 text-white text-base focus:outline-none focus:border-lime-light focus:ring-2 focus:ring-lime-light/30 [color-scheme:dark]"
          />
        </div>

        <label className="flex items-center justify-between gap-3 bg-white/5 border border-white-30/15 rounded-xl px-4 py-3 cursor-pointer">
          <span className="text-sm font-bold text-white">
            Keep my streak going
            <span className="block text-sm font-normal text-white-70">At 8 pm, if a streak of 2 days or more would end tonight.</span>
          </span>
          <input type="checkbox" checked={settings.streak} onChange={(e) => change({ streak: e.target.checked })} className="w-5 h-5 shrink-0 accent-lime-light" />
        </label>

        <section aria-label="This browser" className="bg-obsidian-wave rounded-xl p-4 space-y-3">
          <p className="flex items-start gap-2 text-sm text-white" role="status">
            <BellRing className="w-4 h-4 shrink-0 mt-0.5 text-lime-light" aria-hidden="true" />
            {publicKey || browser === 'unsupported' ? BROWSER_TEXT[browser] : 'Browser reminders aren’t set up on this server yet.'}
          </p>
          {publicKey && (browser === 'on' || browser === 'off') && (
            <button
              type="button"
              onClick={toggleBrowser}
              disabled={switching}
              className="w-full h-10 rounded-lg border border-white-30/40 text-white text-sm font-semibold hover:border-lime-light/60 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {switching && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {browser === 'on' ? 'Turn off in this browser' : 'Turn on in this browser'}
            </button>
          )}
          <p className="text-xs text-white-70">The FitGuide app shows these reminders on your phone too.</p>
        </section>

        {error && <FormError message={error} />}
        <button type="submit" disabled={saving} className="w-full h-11 bg-lime-light text-noir-eclipse font-semibold rounded-lg text-[15px] flex items-center justify-center gap-2 hover:bg-lime-light/90 disabled:opacity-60">
          {saved ? <><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Saved</> : saving ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Saving…</> : 'Save reminders'}
        </button>
      </form>
    </Modal>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {message}
    </p>
  );
}
