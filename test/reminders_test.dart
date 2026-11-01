import 'package:fitguide/src/services/reminders.dart';
import 'package:fitguide/src/services/timer_notifications.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_test/flutter_test.dart';

/// The phone schedules the reminders the API lists for the next two weeks.
const _notifications = MethodChannel('dexterous.com/flutter/local_notifications');

UpcomingReminder _reminder(String date, String time, [String title = 'Time to train']) =>
    UpcomingReminder({'date': date, 'time': time, 'kind': 'workout', 'title': title, 'body': 'Even 15 minutes counts.'});

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final calls = <MethodCall>[];

  setUp(() {
    calls.clear();
    AndroidFlutterLocalNotificationsPlugin.registerWith();
    TimerNotifications.reset();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(_notifications, (call) async {
      calls.add(call);
      return call.method == 'initialize' ? true : null;
    });
  });
  tearDown(() => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(_notifications, null));

  test('reads the local date and time of a reminder', () {
    expect(_reminder('2026-11-05', '07:30').at, DateTime(2026, 11, 5, 7, 30));
    expect(_reminder('not a date', '07:30').at, isNull);
    expect(_reminder('2026-11-05', '7').at, isNull);
  });

  test('replaces the scheduled reminders, skipping ones already past', () async {
    // The plugin refuses times already past on the real clock, so these are days ahead.
    final day = DateTime.now().add(const Duration(days: 3));
    final ymd = '${day.year}-${day.month.toString().padLeft(2, '0')}-${day.day.toString().padLeft(2, '0')}';
    final next = day.add(const Duration(days: 1));
    final nextYmd = '${next.year}-${next.month.toString().padLeft(2, '0')}-${next.day.toString().padLeft(2, '0')}';
    await ReminderNotifications.schedule(
      [
        _reminder(ymd, '09:00', 'Earlier that day'),
        _reminder(ymd, '18:00'),
        _reminder(nextYmd, '20:00', 'Keep your streak going'),
      ],
      now: () => DateTime(day.year, day.month, day.day, 10),
    );

    // Everything scheduled before is cancelled first.
    final cancelled = calls.where((c) => c.method == 'cancel').map((c) => (c.arguments as Map)['id']).toList();
    expect(cancelled, [for (var i = 0; i < 40; i++) 7200 + i]);

    final scheduled = calls.where((c) => c.method == 'zonedSchedule').map((c) => c.arguments as Map).toList();
    expect(scheduled.map((a) => a['title']), ['Time to train', 'Keep your streak going']);
    expect(scheduled.map((a) => a['id']), [7200, 7201]);
    expect(scheduled.first['timeZoneName'], 'Etc/UTC');
    expect(DateTime.parse('${scheduled.first['scheduledDateTime']}Z'), DateTime(day.year, day.month, day.day, 18).toUtc());
  });

  test('reads the settings the API sends', () {
    final s = ReminderSettings.fromJson({'days': [1, 4], 'time': '06:45', 'streak': true, 'timeZone': null});
    expect(s.days, [1, 4]);
    expect(s.time, '06:45');
    expect(s.anyOn, isTrue);
    expect(s.copyWith(days: [], streak: false).anyOn, isFalse);
    expect(s.toJson(), {'days': [1, 4], 'time': '06:45', 'streak': true});
  });
}
