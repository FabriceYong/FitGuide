import 'package:fitguide/src/services/ai_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('reads the AI status and allowances', () {
    final status = AiStatus({
      'available': true,
      'allowance': {
        'swap': {'used': 2, 'max': 10, 'left': 8},
        'checkin': {'used': 2, 'max': 2, 'left': 0},
      },
    });
    expect(status.available, isTrue);
    expect(status.left('swap'), (used: 2, max: 10, left: 8));
    expect(status.left('checkin').left, 0);
    expect(status.left('feedback').left, 0);
  });

  test('reads a suggested swap', () {
    final swap = Swap({
      'name': 'Step-back lunge',
      'instruction': 'Step-back lunges, alternating legs',
      'why': 'Same legs, no landing.',
      'formCues': ['Front knee over toes', 'Tall chest'],
      'safetyNote': null,
    });
    expect(swap.name, 'Step-back lunge');
    expect(swap.formCues, hasLength(2));
    expect(swap.safetyNote, isNull);
  });

  test('reads a weekly check-in and its week numbers', () {
    final checkin = Checkin({
      'summary': 'A steady week.',
      'wins': ['Three workouts'],
      'focus': 'Log dinner on weekdays.',
      'planChange': null,
      'week': {'workouts': 3, 'minutes': 95, 'averageSteps': null, 'daysFoodLogged': 4},
    });
    expect(checkin.workouts, 3);
    expect(checkin.minutes, 95);
    expect(checkin.averageSteps, isNull);
    expect(checkin.daysFoodLogged, 4);
    expect(checkin.planChange, isNull);
    expect(checkin.wins.single, 'Three workouts');
  });
}
