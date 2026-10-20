import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, MESSAGES, resolveLocale, translate, type Locale, type MessageKey } from './messages';

/** The request's locale: the saved choice, else the browser's languages. */
export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerStore.get('accept-language'));
}

/** A translate function for server components. */
export async function getT() {
  const locale = await getLocale();
  return (key: MessageKey, vars?: Record<string, string | number>) => translate(MESSAGES[locale], key, vars);
}
