import type { Metadata } from 'next';
import Link from 'next/link';
import { getT } from '../../i18n/server';

export const metadata: Metadata = { title: 'Offline', robots: { index: false } };

/** Shown by the service worker for pages that weren't saved for offline use. */
export default async function OfflinePage() {
  const t = await getT();
  return (
    <main id="main" className="min-h-screen bg-noir-eclipse text-white font-poppins flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-extrabold">{t('offline.title')}</h1>
        <p className="text-white-70">{t('offline.body')}</p>
        <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">{t('offline.retry')}</Link>
      </div>
    </main>
  );
}
