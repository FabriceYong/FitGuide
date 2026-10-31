'use client';

import { Globe } from 'lucide-react';
import { LOCALES, LOCALE_NAMES, isLocale } from '../i18n/messages';
import { useLocale, useSetLocale, useT } from '../i18n/client';

/** Compact language picker for the header. */
export function LanguageSwitcher() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useT();
  return (
    <label className="flex items-center gap-1 text-white-70 shrink-0">
      <Globe className="w-4 h-4" aria-hidden="true" />
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={locale}
        onChange={(e) => { if (isLocale(e.target.value)) setLocale(e.target.value); }}
        className="bg-transparent py-1.5 text-xs font-bold uppercase text-white-70 hover:text-white focus:text-white cursor-pointer"
      >
        {LOCALES.map((l) => <option key={l} value={l} className="bg-noir-eclipse">{LOCALE_NAMES[l]}</option>)}
      </select>
    </label>
  );
}
