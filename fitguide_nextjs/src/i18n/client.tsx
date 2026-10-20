'use client';

import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_LOCALE, LOCALE_COOKIE, MESSAGES, translate, type Locale, type MessageKey } from './messages';

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Provides the locale the server picked to client components. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

/** Translate function for client components. */
export function useT() {
  const locale = useContext(LocaleContext);
  return useCallback((key: MessageKey, vars?: Record<string, string | number>) => translate(MESSAGES[locale], key, vars), [locale]);
}

/** Save a locale choice (for a year) and re-render with it. */
export function useSetLocale() {
  const router = useRouter();
  return useCallback((locale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }, [router]);
}
