import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:home_widget/home_widget.dart';

import '../core/format.dart';
import '../models/training.dart';
import 'nutrition_service.dart';
import 'readiness_service.dart';
import 'training_service.dart';

/// The lines the "FitGuide today" home-screen widget shows.
class TodayWidgetLines {
  const TodayWidgetLines({required this.title, required this.subtitle, required this.streak, required this.water, required this.readiness});
  final String title;
  final String subtitle;
  final String streak;
  final String water;
  final String readiness;

  static const signedOut = TodayWidgetLines(
    title: 'FitGuide',
    subtitle: 'Sign in to see today’s workout',
    streak: '',
    water: '',
    readiness: '',
  );

  Map<String, String> toMap() => {'title': title, 'subtitle': subtitle, 'streak': streak, 'water': water, 'readiness': readiness};
}

/// What to show for today, from the progress summary, today's food log and readiness.
TodayWidgetLines todayLines(ProgressSummary summary, {DayLog? log, Readiness? readiness, String? todayYmd}) {
  final today = todayYmd ?? localToday();
  final plan = summary.activeEnrollment;
  final next = plan?.nextDay;
  final String title;
  final String subtitle;
  if (summary.trainedToday) {
    title = 'Trained today ✓';
    subtitle = next != null ? 'Next: ${next.title}, ${formatDay(next.date)}' : 'Nice work. Rest up.';
  } else if (next != null && next.date == today) {
    title = next.title;
    subtitle = 'Today · week ${next.week}, day ${next.day}';
  } else if (plan != null) {
    title = 'Rest day';
    subtitle = next != null ? 'Next: ${next.title}, ${formatDay(next.date)}' : plan.programTitle;
  } else {
    title = 'Ready when you are';
    subtitle = 'Open FitGuide to pick a workout';
  }
  final streak = summary.weekStreak;
  final glasses = log == null ? null : (log.waterMl / 250).floor();
  final goal = log == null ? null : (log.targets.waterMl / 250).round();
  return TodayWidgetLines(
    title: title,
    subtitle: subtitle,
    streak: streak.weeks > 0 ? '🔥 ${streak.weeks}-week streak · ${streak.thisWeekText}' : '🔥 ${streak.thisWeekText}',
    water: glasses == null ? '' : '💧 $glasses of $goal glasses',
    readiness: readiness == null
        ? ''
        : readiness.checkedIn
            ? 'Readiness ${readiness.score} · ${readiness.headline}'
            : 'Check in for today’s readiness',
  );
}

/// Keeps the home-screen widget up to date (Android now; the iPhone widget
/// needs its WidgetKit extension added in Xcode, see ios/TodayWidget).
class HomeWidgets {
  HomeWidgets._();

  static const androidProvider = 'com.fitguide.fitguide.TodayWidgetProvider';
  static const iOSName = 'TodayWidget';
  // Shared with the iPhone widget extension (ios/TodayWidget).
  static const appGroupId = 'group.com.fitguide.fitguide';

  static bool get supported => !kIsWeb && (Platform.isAndroid || Platform.isIOS);

  static Future<void> show(TodayWidgetLines lines) async {
    if (!supported) return;
    try {
      if (Platform.isIOS) await HomeWidget.setAppGroupId(appGroupId);
      for (final entry in lines.toMap().entries) {
        await HomeWidget.saveWidgetData<String>('today_${entry.key}', entry.value);
      }
      await HomeWidget.updateWidget(qualifiedAndroidName: androidProvider, iOSName: iOSName);
    } catch (_) {
      // No widget on the home screen, or the platform can't take it: nothing to update.
    }
  }

  /// After sign-out the widget stops showing the account's day.
  static Future<void> clear() => show(TodayWidgetLines.signedOut);
}

/// Fetch today's numbers and put them on the widget. Offline, the last ones stay.
Future<void> syncHomeWidgets() async {
  if (!HomeWidgets.supported) return;
  try {
    final today = localToday();
    final results = await Future.wait<Object?>([
      fetchProgressSummary(),
      fetchDayLog(today).then<Object?>((l) => l, onError: (_) => null),
      fetchReadiness().then<Object?>((r) => r, onError: (_) => null),
    ]);
    await HomeWidgets.show(todayLines((results[0]! as ProgressData).summary, log: results[1] as DayLog?, readiness: results[2] as Readiness?, todayYmd: today));
  } catch (_) {
    // Offline: the widget keeps what it showed last.
  }
}
