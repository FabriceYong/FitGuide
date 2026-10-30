import { SiteNav } from './SiteNav';

/** Header for the standalone pages (catalog, programs, progress, ...): the same one as the home page. */
export function SiteHeader({ active }) {
  return <SiteNav active={active} />;
}
