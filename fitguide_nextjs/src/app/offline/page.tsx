import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Offline', robots: { index: false } };

/** Shown by the service worker for pages that weren't saved for offline use. */
export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-noir-eclipse text-white font-poppins flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-extrabold">You&apos;re offline</h1>
        <p className="text-white-70">
          This page isn&apos;t saved on your device yet. Workouts you&apos;ve opened before still work offline,
          and any workout you finish is synced when you reconnect.
        </p>
        <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Try again</Link>
      </div>
    </main>
  );
}
