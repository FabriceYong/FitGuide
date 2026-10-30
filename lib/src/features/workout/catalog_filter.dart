import '../../models/catalog.dart';

/// Searching and filtering the workout catalog (the Explore tab and the
/// catalog screen; features/workout/catalogFilter.ts on the website).

const catalogLevels = ['Beginner', 'Intermediate', 'Advanced'];
const catalogDurations = [(0, 'Any length'), (20, 'Up to 20 min'), (30, 'Up to 30 min'), (45, 'Up to 45 min')];

String stripOptional(String e) => e.replaceFirst(RegExp(r'^Optional:\s*', caseSensitive: false), '');

/// Equipment a workout can't be done without.
List<String> requiredEquipment(Workout w) => w.equipment.where((e) => e != 'None' && !RegExp(r'^Optional:', caseSensitive: false).hasMatch(e)).toList();

/// [equipment] is an equipment name, or 'none' for workouts that need nothing.
bool matchesFilter(Workout w, {String query = '', String category = '', String level = '', String equipment = '', int maxMinutes = 0}) {
  if (category.isNotEmpty && w.category != category) return false;
  // "All Levels" workouts suit every level.
  if (level.isNotEmpty && w.difficulty != level && w.difficulty != 'All Levels') return false;
  if (equipment == 'none' ? requiredEquipment(w).isNotEmpty : equipment.isNotEmpty && !w.equipment.map(stripOptional).contains(equipment)) return false;
  if (maxMinutes > 0 && w.duration > maxMinutes) return false;
  final term = query.trim().toLowerCase();
  if (term.isEmpty) return true;
  return [w.title, w.description, w.shortDescription ?? '', w.category, ...w.tags].any((s) => s.toLowerCase().contains(term));
}

/// Categories with how many workouts each has, largest first.
List<MapEntry<String, int>> categoryCounts(List<Workout> workouts) {
  final counts = <String, int>{};
  for (final w in workouts) {
    counts[w.category] = (counts[w.category] ?? 0) + 1;
  }
  return counts.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
}

List<String> equipmentNames(List<Workout> workouts) => ({for (final w in workouts) ...w.equipment.map(stripOptional)}..remove('None')).toList()..sort();
