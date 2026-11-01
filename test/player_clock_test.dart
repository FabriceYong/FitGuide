import 'package:fitguide/src/features/workout/player_screen.dart';
import 'package:fitguide/src/models/catalog.dart';
import 'package:fitguide/src/services/speech.dart';
import 'package:fitguide/src/services/timer_notifications.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

/// The player's clock follows real time, so it stays right while the phone
/// is locked, and shows the countdown in a notification meanwhile.
final _workout = Workout({
  'slug': 'clock-test',
  'title': 'Clock Test',
  'category': 'Core',
  'duration': 2,
  'calories': 20,
  'restPeriod': 20,
  'equipment': ['None'],
  'steps': [
    {'stepNumber': 1, 'instruction': 'Plank hold', 'duration': 30},
    {'stepNumber': 2, 'instruction': 'Side plank', 'duration': 30},
    {'stepNumber': 3, 'instruction': 'Hollow hold', 'duration': 30},
  ],
});

const _notifications = MethodChannel('dexterous.com/flutter/local_notifications');
const _countdownId = 7101;
const _alertId = 7102;

void main() {
  late DateTime now;
  final calls = <MethodCall>[];

  setUp(() async {
    await setUpApp();
    now = DateTime(2026, 11, 1, 10);
    calls.clear();
    Speech.onSay = (_) {};
    AndroidFlutterLocalNotificationsPlugin.registerWith();
    TimerNotifications.reset();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(_notifications, (call) async {
      calls.add(call);
      return call.method == 'initialize' ? true : null;
    });
  });
  tearDown(() {
    Speech.onSay = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(_notifications, null);
  });

  /// Let [seconds] go by with the app running (the timer ticks every 250 ms).
  Future<void> pass(WidgetTester tester, int seconds) async {
    for (var i = 0; i < seconds * 4; i++) {
      now = now.add(const Duration(milliseconds: 250));
      await tester.pump(const Duration(milliseconds: 250));
    }
  }

  Future<void> lifecycle(WidgetTester tester, List<AppLifecycleState> states) async {
    for (final state in states) {
      tester.binding.handleAppLifecycleStateChanged(state);
    }
    // Let the calls to the notifications plugin go through.
    for (var i = 0; i < 5; i++) {
      await tester.pump();
    }
  }

  const lock = [AppLifecycleState.inactive, AppLifecycleState.hidden, AppLifecycleState.paused];
  const unlock = [AppLifecycleState.hidden, AppLifecycleState.inactive, AppLifecycleState.resumed];

  Future<void> startPlaying(WidgetTester tester) async {
    await pumpApp(tester, WorkoutPlayer(workout: _workout, now: () => now));
    await tester.tap(find.bySemanticsLabel('Play'));
    await tester.pump();
  }

  Iterable<Map<Object?, Object?>> shown(int id) =>
      calls.where((c) => c.method == 'show' && (c.arguments as Map)['id'] == id).map((c) => c.arguments as Map<Object?, Object?>);

  testWidgets('counts each step and rest down, then moves on', (tester) async {
    await startPlaying(tester);
    expect(find.text('STEP 1 OF 3'), findsOneWidget);
    await pass(tester, 10);
    expect(find.text('00:20'), findsOneWidget);
    await pass(tester, 20);
    expect(find.text('REST'), findsOneWidget);
    await pass(tester, 20);
    expect(find.text('REST'), findsNothing);
    expect(find.text('STEP 2 OF 3'), findsOneWidget);
    await pass(tester, 5);
    expect(find.text('00:25'), findsOneWidget);
    // Nothing is shown outside the app while it's on screen.
    expect(shown(_countdownId), isEmpty);
  });

  testWidgets('locked with the app running (Android): a live countdown, then an alert when the rest is over', (tester) async {
    await startPlaying(tester);
    await pass(tester, 30);
    expect(find.text('REST'), findsOneWidget);

    await lifecycle(tester, lock);
    final rest = shown(_countdownId).last;
    expect(rest['title'], 'Rest');
    expect(rest['body'], 'Next up: Side plank · 0:30');
    final android = rest['platformSpecifics'] as Map;
    expect([android['usesChronometer'], android['chronometerCountDown'], android['ongoing']], [true, true, true]);
    expect(android['when'], now.add(const Duration(seconds: 20)).millisecondsSinceEpoch);

    // The rest runs out while locked: the alert sounds and the next step's countdown shows.
    await pass(tester, 20);
    expect(shown(_alertId).single['title'], 'Rest over');
    expect(shown(_countdownId).last['title'], 'Side plank');

    // Back in the app: the notifications go, and the step carried on.
    await pass(tester, 3);
    await lifecycle(tester, unlock);
    expect(calls.where((c) => c.method == 'cancel').map((c) => (c.arguments as Map)['id']), containsAll([_countdownId, _alertId]));
    expect(find.text('STEP 2 OF 3'), findsOneWidget);
    expect(find.text('00:27'), findsOneWidget);
  });

  testWidgets('an app paused while locked (iPhone) catches up: the rest is over and the next step waits', (tester) async {
    await startPlaying(tester);
    await pass(tester, 30);
    expect(find.text('REST'), findsOneWidget);

    // Locked for five minutes with the app paused: no ticks at all.
    await lifecycle(tester, lock);
    now = now.add(const Duration(minutes: 5));
    await lifecycle(tester, unlock);

    expect(find.text('REST'), findsNothing);
    expect(find.text('STEP 2 OF 3'), findsOneWidget);
    // Waiting at its start, paused: nobody was there to do it.
    expect(find.text('00:30'), findsOneWidget);
    expect(find.bySemanticsLabel('Play'), findsOneWidget);
    await pass(tester, 5);
    expect(find.text('00:30'), findsOneWidget);
  });
}
