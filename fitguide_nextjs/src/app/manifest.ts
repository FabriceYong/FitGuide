import type { MetadataRoute } from 'next';

/** Web app manifest: lets people install FitGuide to their home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FitGuide',
    short_name: 'FitGuide',
    description: 'Guided workouts, personal plans, nutrition and progress tracking.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0C10',
    theme_color: '#0A0C10',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
