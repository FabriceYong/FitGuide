import 'package:fitguide/src/models/training.dart';
import 'package:fitguide/src/services/home_widgets.dart';
import 'package:fitguide/src/services/nutrition_service.dart';
import 'package:fitguide/src/services/readiness_service.dart';
import 'package:flutter_test/flutter_test.dart';

/// What the "FitGuide today" home-screen widget says.
void main() {
  const today = '2026-11-02';
  Map<String, dynamic> plan(String nextDate) => {
        'id': 'e1',
        'programSlug': 'plan-1',
        'programTitle': 'Your muscle plan',
        'nextDay': {'week': 2, 'day': 3, 'title': 'Day 3: Leg Day', 'workoutSlug': 'legs', 'date': nextDate, 'status': nextDate == today ? 'today' : 'upcoming'},
        'schedule': [],
      };
  ProgressSummary summary({Map<String, dynamic>? enrollment, int streak = 0, bool trainedToday = false}) => ProgressSummary({
        'streak': {'current': streak, 'longest': streak, 'trainedToday': trainedToday},
        'activeEnrollment': enrollment,
      });
  final log = DayLog({'targets': {'waterMl': 2000}, 'water': {'ml': 750}, 'entries': []});

  test("shows today's planned workout, the streak, water and readiness", () {
    final lines = todayLines(
      summary(enrollment: plan(today), streak: 5),
      log: log,
      readiness: Readiness({'checkedIn': true, 'score': 78, 'headline': 'Ready to push'}),
      todayYmd: today,
    );
    expect(lines.toMap(), {
      'title': 'Day 3: Leg Day',
      'subtitle': 'Today · week 2, day 3',
      'streak': '🔥 5-day streak',
      'water': '💧 3 of 8 glasses',
      'readiness': 'Readiness 78 · Ready to push',
    });
  });

  test('a rest day points to the next session, and asks for the check-in', () {
    final lines = todayLines(summary(enrollment: plan('2026-11-04')), readiness: Readiness({'checkedIn': false}), todayYmd: today);
    expect(lines.title, 'Rest day');
    expect(lines.subtitle, startsWith('Next: Day 3: Leg Day, '));
    expect(lines.streak, 'Start a streak today');
    expect(lines.water, '');
    expect(lines.readiness, 'Check in for today’s readiness');
  });

  test('after training, and without a plan', () {
    expect(todayLines(summary(enrollment: plan(today), trainedToday: true, streak: 1), todayYmd: today).title, 'Trained today ✓');
    final none = todayLines(summary(), todayYmd: today);
    expect((none.title, none.subtitle), ('Ready when you are', 'Open FitGuide to pick a workout'));
  });

  test('signed out, it asks to sign in', () {
    expect(TodayWidgetLines.signedOut.toMap()['subtitle'], 'Sign in to see today’s workout');
  });
}
