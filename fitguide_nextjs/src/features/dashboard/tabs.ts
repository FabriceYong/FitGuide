/** The dashboard's sections, kept in the URL as /?tab=<id>. */
export const TABS = ['home', 'explore', 'programs', 'favorites', 'progress', 'reviews', 'tools', 'profile'] as const;
export type TabId = (typeof TABS)[number];

export const isTab = (value: string | null): value is TabId => TABS.includes(value as TabId);
