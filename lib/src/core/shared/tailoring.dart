import 'dart:math' as math;

import '../../models/catalog.dart';
import '../../models/user.dart';
import 'profile_options.dart';

/// How a profile picks and explains workouts, and personalises calorie
/// estimates. A line-for-line port of packages/shared/tailoring.js, so the
/// app recommends exactly what the website does.

// Equipment anyone can use: the floor, a chair, stairs, a route to run.
const _basicEquipment = {'None', 'Timer', 'Mat', 'Yoga Mat', 'Running Shoes', 'Track or Treadmill', 'Stairs or Step Platform', 'Barre or Chair'};
bool _isOptional(String item) => RegExp(r'^optional:', caseSensitive: false).hasMatch(item);

const _highIntensity = {'High', 'Very High'};
List<String> _lower(List<String> list) => list.map((s) => s.toLowerCase()).toList();
bool _targets(Workout w, List<String> muscles) => w.targetMuscles.any(muscles.contains);

bool Function(Workout w, String text, List<String> tags) _limitationTest(String id) {
  switch (id) {
    case 'knees':
      return (w, text, tags) =>
          RegExp('knee|joint').hasMatch(text) || tags.contains('sprints') || tags.contains('squats') || (_targets(w, ['Quads', 'Legs']) && w.intensity == 'Very High');
    case 'lower-back':
      return (w, text, tags) =>
          RegExp('protect (your |lower )?back|back injur').hasMatch(text) || _targets(w, ['Lower Back', 'Posterior Chain']) || w.equipment.contains('Barbell');
    case 'shoulders':
      return (w, text, tags) =>
          RegExp('shoulder').hasMatch(text) || (_targets(w, ['Shoulders']) && _highIntensity.contains(w.intensity)) || w.equipment.contains('Pull-up Bar');
    case 'wrists':
      return (w, text, tags) => RegExp('wrist|wrap hands').hasMatch(text) || w.category == 'Martial Arts';
    case 'low-impact':
      return (w, text, tags) =>
          !tags.contains('low-impact') &&
          (RegExp('land softly|jump').hasMatch(text) ||
              ['HIIT', 'CrossFit'].contains(w.category) ||
              w.intensity == 'Very High' ||
              ['hiit', 'tabata', 'sprints', 'kickboxing'].any(tags.contains));
    default:
      return (w, text, tags) => false;
  }
}

// ─── Sign-up suggestions ─────────────────────────────────────────────────────
const _goalFocus = {
  'Muscle': ['Full Body', 'Chest', 'Back', 'Legs'],
  'Weight': ['Full Body', 'Core', 'Legs'],
  'Flexibility': ['Back', 'Core'],
  'Vitality': ['Full Body', 'Core'],
};
const _genderFocus = {'Female': ['Glutes'], 'Male': ['Chest', 'Arms']};

/// Focus areas to pre-select at sign-up for this goal and gender.
List<String> suggestedFocusAreas({String? goal, String? gender}) {
  final list = [...(_goalFocus[goal] ?? _goalFocus['Vitality']!), ...(_genderFocus[gender] ?? const <String>[])];
  return list.toSet().toList();
}

// ─── Calories ────────────────────────────────────────────────────────────────
const _sexOffset = {'Male': 5, 'Female': -161};
const _midpointOffset = -78;
const _assumedAge = 30;
const _referenceRestingKcal = 1680;

/// Resting energy (BMR) in kcal/day, Mifflin-St Jeor.
double restingKcal({String? gender, required double weight, required double height, int? birthYear, int? year}) {
  final y = year ?? DateTime.now().year;
  final age = birthYear != null ? y - birthYear : _assumedAge;
  final offset = _sexOffset[gender] ?? _midpointOffset;
  return 10 * weight + 6.25 * height - 5 * age + offset;
}

/// How much more or less than the reference adult this person burns.
double calorieFactor(AppUser? profile, [int? year]) {
  final w = profile?.weight;
  final h = profile?.height;
  if (profile == null || w == null || w <= 0 || h == null || h <= 0) return 1;
  final kcal = restingKcal(gender: profile.gender, weight: w, height: h, birthYear: profile.birthYear, year: year);
  return math.min(1.8, math.max(0.5, kcal / _referenceRestingKcal));
}

/// A catalog calorie estimate for this person.
int? personalCalories(int? kcal, AppUser? profile) => kcal == null ? null : (kcal * calorieFactor(profile)).round();

// ─── Ranking ─────────────────────────────────────────────────────────────────
const _goalCategories = {
  'Muscle': ['Strength', 'CrossFit', 'HIIT'],
  'Weight': ['HIIT', 'Cardio', 'Martial Arts', 'Dance', 'Swimming', 'CrossFit'],
  'Flexibility': ['Yoga', 'Flexibility', 'Pilates'],
  'Vitality': ['Cardio', 'Yoga', 'Pilates', 'Dance', 'Swimming', 'Strength'],
};
const _goalPhrases = {'Muscle': 'building muscle', 'Weight': 'weight loss', 'Flexibility': 'flexibility', 'Vitality': 'all-round fitness'};
const _levelOrder = ['Beginner', 'Intermediate', 'Advanced'];

/// Equipment a workout needs beyond the basics.
List<String> requiredEquipment(Workout w) => w.equipment.where((item) => !_basicEquipment.contains(item) && !_isOptional(item)).toList();

Set<String>? _ownedEquipment(List<String> kits) {
  if (kits.isEmpty) return null;
  return {for (final k in kits) ...(equipmentKitOptions[k]?.items ?? const <String>[])};
}

List<String> _focusMatches(Workout w, List<String> focusAreas) => focusAreas.where((a) => _targets(w, focusAreaMuscles[a] ?? const [])).toList();

/// The user's limitations this workout loads.
List<String> limitationConflicts(Workout w, List<String> limitations) {
  final text = _lower([...w.cautions, ...w.prerequisites]).join(' ; ');
  final tags = _lower(w.tags);
  return limitations.where((id) => limitationLabels.containsKey(id) && _limitationTest(id)(w, text, tags)).toList();
}

String _listPhrase(List<String> items) =>
    items.length > 1 ? '${items.sublist(0, items.length - 1).join(', ')} and ${items.last}' : items.first;

class WorkoutFit {
  WorkoutFit(this.workout, this.score, this.reasons, this.conflicts, this.missingEquipment);
  final Workout workout;
  final double score;
  final List<String> reasons;
  final List<String> conflicts;
  final List<String> missingEquipment;
}

/// How well one workout fits a profile.
WorkoutFit workoutFit(Workout w, AppUser? profile, {List<String> recentSlugs = const []}) {
  var score = 0.0;
  final reasons = <String>[];

  final focus = _focusMatches(w, profile?.focusAreas ?? const []);
  score += math.min(3, focus.length) * 1.25;
  if (focus.isNotEmpty) reasons.add('Works your ${_listPhrase(focus.take(3).map((a) => a.toLowerCase()).toList())}');

  final minutes = profile?.workoutMinutes;
  if (minutes != null && minutes > 0) {
    if (w.duration <= minutes + 5) {
      score += 1.5;
      reasons.add('Fits your $minutes minutes');
    } else {
      // Time is a firm limit: a point for every 2.5 minutes over.
      score -= math.min(8, (w.duration - minutes) / 2.5);
    }
  }

  final owned = _ownedEquipment(profile?.equipment ?? const []);
  final needs = requiredEquipment(w);
  final missing = owned != null ? needs.where((i) => !owned.contains(i)).toList() : <String>[];
  if (missing.isNotEmpty) {
    score -= 10;
  } else if (owned != null) {
    reasons.add(needs.isNotEmpty ? 'Uses your ${_listPhrase(needs.take(2).map((n) => n.toLowerCase()).toList())}' : 'No equipment needed');
  }

  final preferred = _goalCategories[profile?.goal] ?? const <String>[];
  if (preferred.contains(w.category)) {
    score += 3.5 - preferred.indexOf(w.category) / preferred.length;
    reasons.add('Good for ${_goalPhrases[profile?.goal]}');
  }

  final userRank = _levelOrder.indexOf(profile?.fitnessLevel ?? '');
  final rank = _levelOrder.indexOf(w.difficulty);
  if (w.difficulty == 'All Levels' || userRank == -1 || rank == userRank) {
    score += 4;
  } else if (rank < userRank) {
    score += 2;
  } else {
    score -= 3 * (rank - userRank);
  }

  final conflicts = limitationConflicts(w, profile?.limitations ?? const []);
  score -= 8 * conflicts.length;
  if (recentSlugs.contains(w.slug)) score -= 5;
  if (w.isPremium && profile?.plan != 'plus' && profile?.role != 'admin') score -= 2;

  return WorkoutFit(w, score, reasons.take(3).toList(), conflicts, missing);
}

/// Workouts best first for this profile. Ties rotate with [day] so the top
/// picks change from day to day.
List<WorkoutFit> rankWorkouts(List<Workout> workouts, AppUser? profile, {List<String> recentSlugs = const [], int day = 0, int? limit}) {
  final entries = [
    for (final (i, w) in workouts.indexed) (fit: workoutFit(w, profile, recentSlugs: recentSlugs), turn: (i + day) % workouts.length),
  ];
  entries.sort((a, b) {
    final byScore = b.fit.score.compareTo(a.fit.score);
    return byScore != 0 ? byScore : a.turn.compareTo(b.turn);
  });
  final ranked = entries.map((e) => e.fit).toList();
  return limit != null ? ranked.take(limit).toList() : ranked;
}
