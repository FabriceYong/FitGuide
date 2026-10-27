import 'package:flutter/foundation.dart';

import '../models/catalog.dart';
import '../services/catalog_service.dart';
import 'auth_controller.dart';

/// The signed-in user's favorite workouts, with a toggle. Guests get none
/// (features/dashboard/useFavorites.ts).
class FavoritesController extends ChangeNotifier {
  FavoritesController(this._auth) {
    _auth.addListener(_onAuth);
    _onAuth();
  }

  final AuthController _auth;
  String? _loadedFor;
  List<Workout> _favorites = const [];
  bool _loading = false;
  String? _error;

  List<Workout> get favorites => _favorites;
  bool get loading => _loading;
  String? get error => _error;
  bool get canSave => _auth.hasAccount;

  bool isFavorite(String slug) => _favorites.any((w) => w.slug == slug);

  void _onAuth() {
    final id = _auth.hasAccount ? _auth.user!.id : null;
    if (id == _loadedFor) return;
    _loadedFor = id;
    _favorites = const [];
    if (id != null) load();
  }

  Future<void> load() async {
    _loading = true;
    notifyListeners();
    try {
      _favorites = await getFavorites();
      _error = null;
    } catch (err) {
      _error = '$err';
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> toggle(String slug) async {
    _error = null;
    try {
      _favorites = isFavorite(slug) ? await removeFromFavorites(slug) : await addToFavorites(slug);
    } catch (err) {
      _error = '$err';
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _auth.removeListener(_onAuth);
    super.dispose();
  }
}
