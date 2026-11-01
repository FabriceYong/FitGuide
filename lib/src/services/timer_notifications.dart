import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;

import '../core/storage.dart';

/// The workout player's countdown outside the app, while the phone is locked
/// or the app is in the background. Android and iOS only.
///
/// - Android keeps the app running, so the player updates these itself: a
///   silent notification counts the rest (or timed step) down live, and an
///   alert sounds when it's over ([alert]).
/// - iOS pauses the app, so the notification says when the countdown ends
///   and an alert is scheduled for that moment.
class TimerNotifications {
  TimerNotifications._();

  static final _plugin = FlutterLocalNotificationsPlugin();
  static Future<bool>? _ready;

  static const _countdownId = 7101;
  static const _alertId = 7102;
  static const _askedKey = 'fitguide_timer_notifications_asked';

  /// A silent, ongoing notification whose clock counts down to [endsAt].
  static AndroidNotificationDetails _countdownChannel(DateTime endsAt) => AndroidNotificationDetails(
    'workout_timer',
    'Workout timer',
    channelDescription: 'The rest or exercise countdown while your phone is locked',
    importance: Importance.low,
    priority: Priority.low,
    ongoing: true,
    autoCancel: false,
    onlyAlertOnce: true,
    silent: true,
    category: AndroidNotificationCategory.stopwatch,
    visibility: NotificationVisibility.public,
    when: endsAt.millisecondsSinceEpoch,
    showWhen: true,
    usesChronometer: true,
    chronometerCountDown: true,
  );
  static const _alertChannel = AndroidNotificationDetails(
    'workout_alerts',
    'Workout alerts',
    channelDescription: 'When a rest or timed exercise is over',
    importance: Importance.high,
    priority: Priority.high,
    category: AndroidNotificationCategory.alarm,
    visibility: NotificationVisibility.public,
  );

  /// Set up the plugin again on next use (tests, where each one mocks it anew).
  @visibleForTesting
  static void reset() => _ready = null;

  static bool get supported => !kIsWeb && (defaultTargetPlatform == TargetPlatform.android || defaultTargetPlatform == TargetPlatform.iOS);
  static bool get _isIOS => defaultTargetPlatform == TargetPlatform.iOS;

  static Future<bool> _init() => _ready ??= _plugin
      .initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          // Asked for when a workout starts (requestPermission), not at launch.
          iOS: DarwinInitializationSettings(requestAlertPermission: false, requestSoundPermission: false, requestBadgePermission: false),
        ),
      )
      .then((ok) => ok ?? false)
      .catchError((Object _) => false);

  /// Ask to post notifications, once: the first time a workout starts playing.
  static Future<void> requestPermission() async {
    if (!supported || Storage.has(_askedKey) || !await _init()) return;
    await Storage.setString(_askedKey, '1');
    try {
      if (_isIOS) {
        await _plugin.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()?.requestPermissions(alert: true, sound: true);
      } else {
        await _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()?.requestNotificationsPermission();
      }
    } catch (_) {
      // No permission: the timer just isn't shown outside the app.
    }
  }

  /// Show [title] counting down to [endsAt] (on iOS: "until 10:42"), and
  /// on iOS schedule the alert ([doneTitle], [doneBody]) for [endsAt].
  static Future<void> showCountdown({
    required String title,
    required String body,
    required DateTime endsAt,
    required String doneTitle,
    required String doneBody,
  }) async {
    if (!supported || !await _init()) return;
    try {
      if (_isIOS) {
        await _plugin.show(
          id: _countdownId,
          title: title,
          body: 'Until ${_clock(endsAt)}. $body',
          notificationDetails: const NotificationDetails(
            iOS: DarwinNotificationDetails(presentSound: false, interruptionLevel: InterruptionLevel.passive),
          ),
        );
        await _plugin.zonedSchedule(
          id: _alertId,
          title: doneTitle,
          body: doneBody,
          scheduledDate: tz.TZDateTime.from(endsAt, tz.UTC),
          notificationDetails: const NotificationDetails(iOS: DarwinNotificationDetails(interruptionLevel: InterruptionLevel.active)),
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        );
      } else {
        await _plugin.show(
          id: _countdownId,
          title: title,
          body: body,
          notificationDetails: NotificationDetails(
            android: _countdownChannel(endsAt),
          ),
        );
      }
    } catch (_) {
      // Notifications unavailable: the player still keeps time.
    }
  }

  /// Sound the "time's up" alert now (Android, where the app keeps running).
  static Future<void> alert({required String title, required String body}) async {
    if (!supported || _isIOS || !await _init()) return;
    try {
      await _plugin.show(id: _alertId, title: title, body: body, notificationDetails: const NotificationDetails(android: _alertChannel));
    } catch (_) {}
  }

  /// Remove the countdown and any alert still to come.
  static Future<void> clear() async {
    if (!supported || _ready == null) return;
    try {
      await _plugin.cancel(id: _countdownId);
      await _plugin.cancel(id: _alertId);
    } catch (_) {}
  }

  static String _clock(DateTime t) {
    final local = t.toLocal();
    return '${local.hour}:${local.minute.toString().padLeft(2, '0')}';
  }
}
