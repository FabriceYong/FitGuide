'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '../lib/analytics';

/** Records a page view on every route change. */
export function PageViews() {
  const pathname = usePathname();
  useEffect(() => {
    track('page_view');
  }, [pathname]);
  return null;
}
