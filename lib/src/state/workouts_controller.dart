import 'package:flutter/foundation.dart';

import '../models/catalog.dart';
import '../services/catalog_service.dart';

/// The workout catalog, loaded once and shared by the dashboard's tabs
/// (context/WorkoutContext.tsx).
class WorkoutsController extends ChangeNotifier {
  List<Workout> _workouts = const [];
  bool _loading = true;
  String? _error;
  String? _savedAt;

  List<Workout> get workouts => _workouts;
  bool get loading => _loading;

  /// Why the catalog couldn't be loaded (only when there's no saved copy either).
  String? get error => _error;

  /// Set when the server was unreachable and the saved copy is shown.
  String? get savedAt => _savedAt;

  /// Categories that have workouts, A–Z.
  List<String> get categories => (_workouts.map((w) => w.category).toSet().toList()..sort());

  Map<String, String> get titles => {for (final w in _workouts) w.slug: w.title};

  Future<void> load() async {
    try {
      final result = await fetchWorkouts();
      _workouts = result.workouts;
      _savedAt = result.savedAt;
      _error = null;
    } catch (err) {
      _error = '$err';
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> reload() {
    _error = null;
    notifyListeners();
    return load();
  }
}
