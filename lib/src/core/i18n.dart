import 'package:flutter/foundation.dart';

import 'storage.dart';

/// Interface text by locale (fitguide_nextjs/src/i18n/messages.ts). Like the
/// website, only the navigation, offline messages, language picker and the
/// PLUS page are translated so far.
const locales = ['en', 'es'];
const localeNames = {'en': 'English', 'es': 'Español'};

const _en = {
  'nav.label': 'Main',
  'nav.workouts': 'Workouts',
  'nav.programs': 'Programs',
  'nav.plan': 'My plan',
  'nav.nutrition': 'Nutrition',
  'nav.community': 'Community',
  'nav.progress': 'Progress',
  'nav.plus': 'PLUS',
  'nav.studio': 'Studio',
  'nav.admin': 'Admin',
  'language.label': 'Language',
  'offline.banner': "You're offline. Workouts you finish are saved and synced later.",
  'offline.synced.one': '1 offline workout synced.',
  'offline.synced.other': '{count} offline workouts synced.',
  'offline.dropped.one': "1 offline workout couldn't be saved (for example, it's no longer available to you).",
  'offline.dropped.other': "{count} offline workouts couldn't be saved (for example, they're no longer available to you).",
  'plus.title': 'Train with everything',
  'plus.cancelAnytime': 'Cancel anytime from your billing settings.',
  'plus.feature.content': 'Every PLUS workout and program, including programs from FitGuide creators',
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
  'plus.browser': 'Checkout opens in your browser. Come back here when you are done.',
  'plus.refresh': 'Refresh status',
};

const _es = {
  'nav.label': 'Principal',
  'nav.workouts': 'Entrenamientos',
  'nav.programs': 'Programas',
  'nav.plan': 'Mi plan',
  'nav.nutrition': 'Nutrición',
  'nav.community': 'Comunidad',
  'nav.progress': 'Progreso',
  'nav.plus': 'PLUS',
  'nav.studio': 'Estudio',
  'nav.admin': 'Admin',
  'language.label': 'Idioma',
  'offline.banner': 'Sin conexión. Los entrenamientos que termines se guardan y se sincronizan después.',
  'offline.synced.one': '1 entrenamiento sin conexión sincronizado.',
  'offline.synced.other': '{count} entrenamientos sin conexión sincronizados.',
  'offline.dropped.one': 'No se pudo guardar 1 entrenamiento sin conexión (por ejemplo, ya no está disponible para ti).',
  'offline.dropped.other': 'No se pudieron guardar {count} entrenamientos sin conexión (por ejemplo, ya no están disponibles para ti).',
  'plus.title': 'Entrena con todo',
  'plus.cancelAnytime': 'Cancela cuando quieras desde la configuración de facturación.',
  'plus.feature.content': 'Todos los entrenamientos y programas PLUS, incluidos los de creadores de FitGuide',
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
  'plus.browser': 'El pago se abre en tu navegador. Vuelve aquí cuando termines.',
  'plus.refresh': 'Actualizar estado',
};

const _messages = {'en': _en, 'es': _es};
const _localeKey = 'fitguide_locale';

/// The chosen language, saved on the device (the site keeps it in a cookie).
class LocaleController extends ChangeNotifier {
  LocaleController() {
    final saved = Storage.getString(_localeKey);
    if (locales.contains(saved)) {
      _locale = saved!;
    } else {
      final device = PlatformDispatcher.instance.locale.languageCode;
      _locale = locales.contains(device) ? device : 'en';
    }
  }

  late String _locale;
  String get locale => _locale;

  void setLocale(String value) {
    if (!locales.contains(value) || value == _locale) return;
    _locale = value;
    Storage.setString(_localeKey, value);
    notifyListeners();
  }

  /// Look up a message and fill {placeholders}.
  String t(String key, [Map<String, Object>? vars]) {
    var text = _messages[_locale]?[key] ?? _en[key] ?? key;
    vars?.forEach((name, value) => text = text.replaceAll('{$name}', '$value'));
    return text;
  }
}
