import 'package:flutter/foundation.dart';

import '../core/api/api_client.dart';
import '../core/storage.dart';
import '../models/json.dart';
import '../models/user.dart';

/// The signed-in user, a guest, or nobody (contexts/AuthContext.js on the
/// website, plus the "show sign-up" switch from AuthWrapper).
class AuthController extends ChangeNotifier {
  AuthController() {
    _api.onUnauthorized = clearSession;
  }

  static const _userKey = 'fitguide_user';
  final ApiClient _api = ApiClient.instance;

  AppUser? _user;
  bool _ready = false;
  bool _showRegister = false;

  AppUser? get user => _user;
  bool get ready => _ready;
  bool get isAuthenticated => _user != null;
  bool get isGuest => _user?.isGuest ?? false;
  bool get hasAccount => _user != null && !_user!.isGuest;

  /// Whether the sign-up wizard is open (guests included).
  bool get showRegister => _showRegister;

  /// Restore the saved user, then confirm the session with /auth/me.
  Future<void> init() async {
    final stored = asJson(Storage.getJson(_userKey));
    if (stored.isNotEmpty && stored['isGuest'] == true) {
      _user = AppUser(stored);
    } else if (stored.isNotEmpty && _api.hasSession) {
      _user = AppUser(stored);
      refreshProfile();
    } else {
      await _api.clearSession();
      await Storage.remove(_userKey);
    }
    _ready = true;
    notifyListeners();
  }

  /// Refresh the profile; keep the cached one if the server is unreachable.
  Future<void> refreshProfile() async {
    try {
      final data = await _api.request('/auth/me', auth: true);
      _store(AppUser(asJson(data['user'])));
    } catch (_) {
      // A 401 already signed the user out through onUnauthorized.
    }
  }

  /// Sign in with a /auth/login or /auth/register response (user + tokens).
  Future<void> login(Json response) async {
    await _api.saveSession(response);
    _store(AppUser(asJson(response['user'])));
  }

  /// Browse without an account. Nothing is saved on the server.
  void startGuestSession(Json profile) {
    _api.clearSession();
    _store(AppUser({...profile, 'id': 'guest', 'isGuest': true}));
  }

  /// Merge updated profile fields into the current user.
  void updateUser(Json updates) {
    final current = _user;
    if (current == null) return;
    _store(current.merge(updates));
  }

  /// Sign out: revoke the refresh token on the server, then forget it here.
  void logout() {
    final refresh = _api.refreshToken;
    if (refresh != null) {
      _api.request('/auth/logout', method: 'POST', body: {'refreshToken': refresh}).catchError((_) => <String, dynamic>{});
    }
    clearSession();
  }

  /// Forget the session locally (the server says it is no longer valid).
  void clearSession() {
    _api.clearSession();
    Storage.remove(_userKey);
    _user = null;
    notifyListeners();
  }

  void startSignUp() {
    _showRegister = true;
    notifyListeners();
  }

  void closeRegister() {
    _showRegister = false;
    notifyListeners();
  }

  void _store(AppUser user) {
    _user = user;
    Storage.setJson(_userKey, user.data);
    notifyListeners();
  }
}
