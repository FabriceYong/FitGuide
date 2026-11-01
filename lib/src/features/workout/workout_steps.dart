import '../../models/catalog.dart';
import '../../models/json.dart';
import 'catalog_filter.dart';
import 'default_steps.dart';

/// A workout's steps and what each one asks for (features/workout/
/// workoutSteps.js on the website): its own steps or the default ones, and a
/// step's target read from its text, reps ("Burpees × 10 reps") or time.

/// The workout's steps: its own, or a default set built from its category and length.
List<WorkoutStep> stepsFor(Workout workout) => workout.steps.isNotEmpty ? workout.steps : generateDefaultSteps(workout);

/// A step counted in reps: [reps] like "10" or "8–12", and [sets] when it says how many.
typedef RepTarget = ({String reps, String? sets});

final _timed = RegExp(r'\b\d+\s*(s|sec|secs|seconds?|min|mins|minutes?)\b', caseSensitive: false);
final _reps = RegExp(r'(?:(\d+)\s*(?:sets?)?\s*[×x]\s*)?(\d+(?:\s*[–-]\s*\d+)?)\s*reps?\b', caseSensitive: false);

/// The rep target of a step, or null for a timed one (only when the text
/// names reps and not a time, like "× 40 seconds").
RepTarget? repTarget(WorkoutStep? step) {
  final text = step?.instruction ?? '';
  if (_timed.hasMatch(text)) return null;
  final m = _reps.firstMatch(text);
  if (m == null) return null;
  return (reps: m.group(2)!.replaceAll(RegExp(r'\s+'), ''), sets: m.group(1));
}

/// Whether logging a weight makes sense: the workout needs equipment.
bool usesWeights(Workout workout) => requiredEquipment(workout).isNotEmpty;

/// "2:30" for a step length in seconds.
String stepClock(int seconds) => '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}';

/// "Round 1 — Exercise A: Explosive Burpees × 10 reps" → "Explosive Burpees":
/// the name a reader sees first.
String stepName(WorkoutStep? step) {
  final text = (step?.exerciseName?.trim().isNotEmpty == true ? step!.exerciseName! : step?.instruction ?? '').trim();
  final colon = text.indexOf(':');
  final afterColon = colon > 0 && colon < 70 ? text.substring(colon + 1) : text;
  final name = afterColon.split(RegExp(r'\s+[—–-]\s+|\s+[×x]\s+\d|\s+\(')).first.trim();
  return name.isEmpty ? text : name;
}

/// The name a step's set is saved under (and looked up by for "last time").
String setName(WorkoutStep step, int index) {
  final name = step.exerciseName ?? (step.instruction.isNotEmpty ? step.instruction : 'Step ${index + 1}');
  return name.length > 200 ? name.substring(0, 200) : name;
}

/// "10 reps × 40 kg", "12 reps" or "40 kg" for a logged or suggested set.
String setLabel(int? reps, double? weightKg) =>
    [if (reps != null && reps > 0) '$reps reps', if (weightKg != null && weightKg > 0) '${numText((weightKg * 10).round() / 10)} kg'].join(' × ');

/// Why the player suggests a set ([reason] from the API's previous-sets).
String suggestionReason(({int reps, double? weightKg, String reason}) s) => switch (s.reason) {
      'add_weight' => 'You hit the top of the range last time, so add weight.',
      'reach_range' => 'Same weight. Aim for ${s.reps} reps.',
      _ => s.weightKg != null ? 'Same weight, one more rep.' : 'One more rep than last time.',
    };

/// "10 reps", "3 × 10 reps" or "2:30" for a step.
String targetLabel(WorkoutStep? step) {
  final reps = repTarget(step);
  if (reps != null) return '${reps.sets != null ? '${reps.sets} × ' : ''}${reps.reps} reps';
  final d = step?.duration;
  return d != null && d > 0 ? stepClock(d) : '';
}

/// What's said when a step starts: "15 reps" or "45 seconds".
String spokenTarget(WorkoutStep? step) {
  final reps = repTarget(step);
  if (reps != null) return '${reps.sets != null ? '${reps.sets} sets of ' : ''}${reps.reps.replaceFirst(RegExp('[–-]'), ' to ')} reps';
  final s = step?.duration ?? 0;
  if (s <= 0) return '';
  final m = s ~/ 60;
  return [if (m > 0) '$m minute${m > 1 ? 's' : ''}', if (s % 60 > 0) '${s % 60} seconds'].join(' ');
}
