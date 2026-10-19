import { SITE_URL } from '../lib/server-api';

/** /robots.txt: index the catalog, skip personal pages and the player. */
export default function robots() {
  return {
    rules: { userAgent: '*', allow: ['/workouts', '/programs'], disallow: ['/progress', '/workouts/*/play'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
