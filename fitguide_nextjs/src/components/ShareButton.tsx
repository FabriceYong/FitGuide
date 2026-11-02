'use client';

import { useState } from 'react';
import { Loader2, Share2 } from 'lucide-react';
import { shareImage } from '../lib/shareCard';
import { track } from '../lib/analytics';

/** Make a picture card and share it (or save it where the browser can't share files). */
export function ShareButton({ make, filename, text, label = 'Share', kind, className = '' }: {
  make: () => Promise<Blob>;
  filename: string;
  text: string;
  label?: string;
  /** For analytics: what was shared. */
  kind: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const share = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const result = await shareImage(await make(), filename, text);
      if (result !== 'cancelled') track('card_shared', { kind, how: result });
      if (result === 'saved') setStatus('Picture saved. Post it wherever you like.');
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <button type="button" onClick={share} disabled={busy} className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold disabled:opacity-60 ${className}`}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Share2 className="w-4 h-4" aria-hidden="true" />} {label}
      </button>
      {status && <p role="status" className="text-xs text-white-70">{status}</p>}
    </div>
  );
}
