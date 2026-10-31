'use client';

import dynamic from 'next/dynamic';

/** The gym finder, rendered in the browser only: it needs the device's location and Leaflet needs `window`. */
export const GymFinderLoader = dynamic(() => import('./GymFinder').then((m) => m.GymFinder), {
  ssr: false,
  loading: () => (
    <div className="space-y-6" aria-hidden="true">
      <div className="h-10 w-72 max-w-full bg-obsidian-wave rounded-xl animate-pulse" />
      <div className="h-[52vh] lg:h-[calc(100vh-15rem)] bg-obsidian-wave rounded-2xl animate-pulse" />
    </div>
  ),
});
