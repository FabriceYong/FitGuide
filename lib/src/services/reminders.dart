import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;

import '../core/api/api_client.dart';
import '../core/format.dart';
import '../models/json.dart';
import 'timer_notifications.dart';

/// Workout and streak reminders (services/reminderService.ts). The settings
/// are the account's, shared with the website; the API lists the coming two
/// weeks of reminders and the phone schedules them itself.
final _api = ApiClient.instance;
Map<String, Object> _tz() => {'tzOffset': tzOffset()};

class ReminderSettings {
  const ReminderSettings({required this.days, required this.time, required this.streak});
  ReminderSettings.fromJson(Json j)
      : days = (j['days'] is List ? (j['days'] as List).map(asInt).whereType<int>().toList() : <int>[]),
        time = asString(j['time']) ?? '18:00',
        streak = asBool(j['streak']);

  /// Weekdays, 0 = Sunday … 6 = Saturday (the API's numbering).
  final List<int> days;

  /// Local "HH:MM".
  final String time;
  final bool streak;

  bool get anyOn => days.isNotEmpty || streak;

  ReminderSettings copyWith({List<int>? days, String? time, bool? streak}) =>
      ReminderSettings(days: days ?? this.days, time: time ?? this.time, streak: streak ?? this.streak);

  Json toJson() => {'days': days, 'time': time, 'streak': streak};
}

/// One reminder to show: a local date and time, and its text.
class UpcomingReminder {
  UpcomingReminder(Json j)
      : date = asString(j['date']) ?? '',
        time = asString(j['time']) ?? '18:00',
        title = asString(j['title']) ?? 'FitGuide',
        body = asString(j['body']) ?? '';
  final String date;
  final String time;
  final String title;
  final String body;

  /// When to show it, in the phone's local time (null if unreadable).
  DateTime? get at {
    final day = DateTime.tryParse(date);
    final parts = time.split(':').map(int.tryParse).toList();
    if (day == null || parts.length != 2 || parts.contains(null)) return null;
    return DateTime(day.year, day.month, day.day, parts[0]!, parts[1]!);
  }
}

typedef Reminders = ({ReminderSettings settings, List<UpcomingReminder> upcoming});

Reminders _read(Json data) => (
  settings: ReminderSettings.fromJson(asJson(data['settings'])),
  upcoming: asJsonList(data['upcoming']).map(UpcomingReminder.new).toList(),
);

Future<Reminders> fetchReminders() async => _read(await _api.request('/reminders', auth: true, query: _tz()));

Future<Reminders> saveReminders(ReminderSettings settings) async =>
    _read(await _api.request('/reminders', method: 'PUT', auth: true, query: _tz(), body: settings.toJson()));

/// Bring the phone's scheduled reminders up to date (after signing in,
/// changing the settings or finishing a workout).
Future<void> syncReminders() async {
  if (!ReminderNotifications.supported) return;
  try {
    await ReminderNotifications.schedule((await fetchReminders()).upcoming);
  } catch (_) {
    // Offline: the reminders scheduled last time stay.
  }
}

/// The reminders as notifications scheduled on the phone (Android and iOS).
class ReminderNotifications {
  ReminderNotifications._();

  // Ids 7200-7239; the workout timer uses 71xx.
  static const _firstId = 7200;
  static const _slots = 40;

  static const _channel = AndroidNotificationDetails(
    'reminders',
    'Reminders',
    channelDescription: 'Workout days and keeping your streak',
    importance: Importance.defaultImportance,
    priority: Priority.defaultPriority,
    category: AndroidNotificationCategory.reminder,
  );

  static bool get supported => TimerNotifications.supported;
  static bool get _isIOS => defaultTargetPlatform == TargetPlatform.iOS;
  static FlutterLocalNotificationsPlugin get _plugin => TimerNotifications.plugin;

  /// Ask to show notifications. True if they're allowed.
  static Future<bool> requestPermission() async {
    if (!supported || !await TimerNotifications.ready()) return false;
    try {
      if (_isIOS) {
        return await _plugin.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()?.requestPermissions(alert: true, sound: true) ?? false;
      }
      return await _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()?.requestNotificationsPermission() ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Whether this phone lets FitGuide show notifications.
  static Future<bool> allowed() async {
    if (!supported || !await TimerNotifications.ready()) return false;
    try {
      if (_isIOS) {
        return (await _plugin.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()?.checkPermissions())?.isEnabled ?? false;
      }
      return await _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()?.areNotificationsEnabled() ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Replace the scheduled reminders with [items]; ones already past are skipped.
  static Future<void> schedule(List<UpcomingReminder> items, {DateTime Function() now = DateTime.now}) async {
    if (!supported || !await TimerNotifications.ready()) return;
    await clear();
    final start = now();
    final due = items.where((r) => r.at?.isAfter(start) ?? false).take(_slots).toList();
    for (var i = 0; i < due.length; i++) {
      try {
        await _plugin.zonedSchedule(
          id: _firstId + i,
          title: due[i].title,
          body: due[i].body,
          scheduledDate: tz.TZDateTime.from(due[i].at!.toUtc(), tz.UTC),
          notificationDetails: const NotificationDetails(android: _channel, iOS: DarwinNotificationDetails()),
          // Inexact is fine for a reminder and needs no "alarms" permission.
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        );
      } catch (_) {}
    }
  }

  /// Remove every scheduled reminder (signing out).
  static Future<void> clear() async {
    if (!supported || !await TimerNotifications.ready()) return;
    for (var i = 0; i < _slots; i++) {
      try {
        await _plugin.cancel(id: _firstId + i);
      } catch (_) {}
    }
  }
}
