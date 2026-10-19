import { SITE_URL, serverGetOrNull } from '../lib/server-api';

export const dynamic = 'force-dynamic';

/** /sitemap.xml: the public catalog pages. */
export default async function sitemap() {
  const [workouts, programs] = await Promise.all([serverGetOrNull('/workouts'), serverGetOrNull('/programs')]);
  return [
    { url: `${SITE_URL}/workouts`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/programs`, changeFrequency: 'weekly', priority: 0.9 },
    ...(workouts?.workouts || []).map((w) => ({
      url: `${SITE_URL}/workouts/${w.slug}`,
      lastModified: w.updatedAt || undefined,
      changeFrequency: 'monthly',
      priority: 0.7,
    })),
    ...(programs?.programs || []).map((p) => ({
      url: `${SITE_URL}/programs/${p.slug}`,
      lastModified: p.updatedAt || undefined,
      changeFrequency: 'monthly',
      priority: 0.8,
    })),
  ];
}
