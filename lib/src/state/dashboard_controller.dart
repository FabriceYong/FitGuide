import 'package:flutter/foundation.dart';

/// The dashboard's sections (features/dashboard/tabs.ts).
enum DashboardTab { home, explore, programs, favorites, progress, reviews, tools, profile }

/// Which dashboard tab is showing. Other screens use it to send the user to
/// a tab, the way the website links to /?tab=…
class DashboardController extends ChangeNotifier {
  DashboardTab _tab = DashboardTab.home;
  String? _exploreCategory;
  int _exploreRequest = 0;

  DashboardTab get tab => _tab;

  /// A category the Explore tab should filter by next time it shows.
  String? get exploreCategory => _exploreCategory;
  int get exploreRequest => _exploreRequest;

  void setTab(DashboardTab tab) {
    if (tab == _tab) return;
    _tab = tab;
    notifyListeners();
  }

  /// Open Explore filtered to a category (the website's /workouts#strength).
  void explore({String? category}) {
    _exploreCategory = category;
    _exploreRequest++;
    _tab = DashboardTab.explore;
    notifyListeners();
  }

  int _dataVersion = 0;

  /// Bumped when training data changes (a session saved, a program started),
  /// so screens that stay open (tabs, program and plan pages) reload.
  int get dataVersion => _dataVersion;

  void dataChanged() {
    _dataVersion++;
    notifyListeners();
  }

  void reset() {
    _tab = DashboardTab.home;
    notifyListeners();
  }
}
