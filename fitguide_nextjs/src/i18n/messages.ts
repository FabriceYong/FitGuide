/**
 * Interface text by locale. English is the source; every other locale must
 * have the same keys (TypeScript checks this). Translated so far: the site
 * header, skip link, offline messages, language switcher and the PLUS page.
 * Other screens are still English-only; add their text here as they move over.
 */
export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'fitguide_locale';
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', es: 'Español' };

const en = {
  'skip.toContent': 'Skip to content',
  'nav.label': 'Main',
  'nav.workouts': 'Workouts',
  'nav.programs': 'Programs',
  'nav.plan': 'My plan',
  'nav.nutrition': 'Nutrition',
  'nav.community': 'Community',
  'nav.progress': 'Progress',
  'nav.plus': 'PLUS',
  'nav.studio': 'Coach studio',
  'nav.admin': 'Admin',
  'language.label': 'Language',
  'offline.banner': "You're offline. Workouts you finish are saved and synced later.",
  'offline.synced.one': '1 offline workout synced.',
  'offline.synced.other': '{count} offline workouts synced.',
  'offline.dropped.one': "1 offline workout couldn't be saved (for example, it's no longer available to you).",
  'offline.dropped.other': "{count} offline workouts couldn't be saved (for example, they're no longer available to you).",
  'offline.title': "You're offline",
  'offline.body': "This page isn't saved on your device yet. Workouts you've opened before still work offline, and any workout you finish is synced when you reconnect.",
  'offline.retry': 'Try again',
  'plus.title': 'Train with everything',
  'plus.cancelAnytime': 'Cancel anytime from your billing settings.',
  'plus.feature.content': 'Every PLUS workout and program, including programs from FitGuide coaches',
  'plus.feature.coach': 'Unlimited AI coach messages (free accounts get 10 a day)',
  'plus.feature.support': 'Supports new workouts, programs and features',
  'plus.signIn': 'Sign in to subscribe',
  'plus.youHave': 'You have PLUS',
  'plus.renews': 'Renews on {date}',
  'plus.ends': 'Ends on {date}',
  'plus.pastDue': 'Payment overdue, please update your card',
  'plus.manage': 'Manage subscription',
  'plus.opening': 'Opening…',
  'plus.unavailable': "Subscriptions aren't available yet.",
  'plus.monthly': 'Monthly',
  'plus.yearly': 'Yearly',
  'plus.perMonth': 'month',
  'plus.perYear': 'year',
  'plus.save': 'Save {percent}%',
  'plus.get': 'Get PLUS',
  'plus.openingCheckout': 'Opening checkout…',
  'plus.stripe': 'Payments are handled by Stripe. FitGuide never sees your card details.',
  'plus.welcome': 'Welcome to PLUS!',
  'plus.confirming': 'Thanks! Your payment is being confirmed; PLUS turns on in a moment.',
  'plus.cancelled': 'Checkout was cancelled. You have not been charged.',
};

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

const es: Messages = {
  'skip.toContent': 'Ir al contenido',
  'nav.label': 'Principal',
  'nav.workouts': 'Entrenamientos',
  'nav.programs': 'Programas',
  'nav.plan': 'Mi plan',
  'nav.nutrition': 'Nutrición',
  'nav.community': 'Comunidad',
  'nav.progress': 'Progreso',
  'nav.plus': 'PLUS',
  'nav.studio': 'Estudio del coach',
  'nav.admin': 'Admin',
  'language.label': 'Idioma',
  'offline.banner': 'Sin conexión. Los entrenamientos que termines se guardan y se sincronizan después.',
  'offline.synced.one': '1 entrenamiento sin conexión sincronizado.',
  'offline.synced.other': '{count} entrenamientos sin conexión sincronizados.',
  'offline.dropped.one': 'No se pudo guardar 1 entrenamiento sin conexión (por ejemplo, ya no está disponible para ti).',
  'offline.dropped.other': 'No se pudieron guardar {count} entrenamientos sin conexión (por ejemplo, ya no están disponibles para ti).',
  'offline.title': 'Sin conexión',
  'offline.body': 'Esta página aún no está guardada en tu dispositivo. Los entrenamientos que ya abriste funcionan sin conexión, y los que termines se sincronizan al reconectarte.',
  'offline.retry': 'Reintentar',
  'plus.title': 'Entrena con todo',
  'plus.cancelAnytime': 'Cancela cuando quieras desde la configuración de facturación.',
  'plus.feature.content': 'Todos los entrenamientos y programas PLUS, incluidos los de coaches de FitGuide',
  'plus.feature.coach': 'Mensajes ilimitados con el coach de IA (las cuentas gratuitas tienen 10 al día)',
  'plus.feature.support': 'Apoya nuevos entrenamientos, programas y funciones',
  'plus.signIn': 'Inicia sesión para suscribirte',
  'plus.youHave': 'Tienes PLUS',
  'plus.renews': 'Se renueva el {date}',
  'plus.ends': 'Termina el {date}',
  'plus.pastDue': 'Pago pendiente, actualiza tu tarjeta',
  'plus.manage': 'Gestionar suscripción',
  'plus.opening': 'Abriendo…',
  'plus.unavailable': 'Las suscripciones aún no están disponibles.',
  'plus.monthly': 'Mensual',
  'plus.yearly': 'Anual',
  'plus.perMonth': 'mes',
  'plus.perYear': 'año',
  'plus.save': 'Ahorra un {percent}%',
  'plus.get': 'Obtener PLUS',
  'plus.openingCheckout': 'Abriendo el pago…',
  'plus.stripe': 'Los pagos los gestiona Stripe. FitGuide nunca ve los datos de tu tarjeta.',
  'plus.welcome': '¡Bienvenido a PLUS!',
  'plus.confirming': '¡Gracias! Estamos confirmando tu pago; PLUS se activará en un momento.',
  'plus.cancelled': 'Pago cancelado. No se te ha cobrado nada.',
};

export const MESSAGES: Record<Locale, Messages> = { en, es };

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

/** Pick a locale from the saved choice, else the browser's Accept-Language. */
export function resolveLocale(saved: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(saved)) return saved;
  for (const part of (acceptLanguage || '').split(',')) {
    const code = part.trim().split(/[-;]/)[0].toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

/** Look up a message and fill {placeholders}. */
export function translate(messages: Messages, key: MessageKey, vars?: Record<string, string | number>): string {
  const text = messages[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`)) : text;
}
