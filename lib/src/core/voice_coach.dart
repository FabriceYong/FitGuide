import 'units.dart';

/// What the workout player says beyond the step's name and target: last
/// time's numbers and today's suggestion as a step starts, praise when a
/// logged set beats last time, and halfway and last-exercise lines
/// (packages/shared/voiceCoach.js on the website). Weights are in kg and
/// spoken in the member's units.

typedef SetValues = ({int? reps, double? weightKg});

/// "22.5 kilos" or "50 pounds".
String spokenWeight(double kg, [Units units = Units.metric]) {
  final value = ((units.isImperial ? kg * lbPerKg : kg) * 10).round() / 10;
  final text = value == value.roundToDouble() ? '${value.round()}' : value.toStringAsFixed(1);
  return '$text ${units.isImperial ? (value == 1 ? 'pound' : 'pounds') : (value == 1 ? 'kilo' : 'kilos')}';
}

/// "20 kilos for 8", "12 reps" or null.
String? spokenSet(SetValues? set, [Units units = Units.metric]) {
  if (set == null) return null;
  final weight = set.weightKg ?? 0;
  final reps = set.reps ?? 0;
  if (weight > 0 && reps > 0) return '${spokenWeight(weight, units)} for $reps';
  if (weight > 0) return spokenWeight(weight, units);
  if (reps > 0) return '$reps reps';
  return null;
}

/// What to add after the step's name and target as it starts.
String stepCoaching({required int index, required int total, SetValues? last, SetValues? suggestion, Units units = Units.metric}) {
  final lines = <String>[];
  final lastText = spokenSet(last, units);
  final todayText = spokenSet(suggestion, units);
  if (lastText != null) lines.add('Last time, $lastText.');
  if (todayText != null && todayText != lastText) lines.add('Today, try $todayText.');
  if (total >= 4 && index == total ~/ 2) lines.add('Halfway there.');
  if (total >= 3 && index == total - 1) lines.add('Last one. Finish strong!');
  return lines.join(' ');
}

/// Praise when a logged set beats last time's, or null.
String? setPraise({SetValues? logged, SetValues? last, Units units = Units.metric}) {
  if (logged == null || last == null) return null;
  final weight = logged.weightKg ?? 0;
  final lastWeight = last.weightKg ?? 0;
  if (weight > 0 && lastWeight > 0 && weight > lastWeight + 0.01) {
    return 'That’s ${spokenWeight(weight - lastWeight, units)} more than last time. Nice work!';
  }
  final reps = logged.reps ?? 0;
  final lastReps = last.reps ?? 0;
  if (reps > lastReps && lastReps > 0 && (weight - lastWeight).abs() < 0.01) {
    final more = reps - lastReps;
    return '$more more ${more == 1 ? 'rep' : 'reps'} than last time. Strong!';
  }
  return null;
}
