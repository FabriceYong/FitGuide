import 'package:fitguide/src/features/progress/progress_view.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the weekly chart axis uses three round steps that cover the busiest day', () {
    expect(minuteTicks(0), [0, 10, 20, 30]);
    expect(minuteTicks(29), [0, 10, 20, 30]);
    expect(minuteTicks(31), [0, 15, 30, 45]);
    expect(minuteTicks(100), [0, 45, 90, 135]);
    expect(minuteTicks(400), [0, 180, 360, 540]);
  });
}
