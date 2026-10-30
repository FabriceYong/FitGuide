import 'package:flutter/widgets.dart';

import '../core/storage.dart';
import '../models/json.dart';
import '../models/training.dart';
import '../services/health_service.dart';
import '../services/phone_health.dart';
import 'auth_controller.dart';

/// Uploads the phone's health store (Apple Health / Health Connect) to the
/// API, so the website shows the same steps, calories, heart rate, sleep and
/// blood pressure as the app. Syncs when the app opens and comes back to the
/// front, once connected on this phone for the signed-in account.
class PhoneHealthController extends ChangeNotifier with WidgetsBindingObserver {
  PhoneHealthController(
    this._auth, {
    PhoneHealthStore? Function() store = defaultPhoneHealthStore,
    this.upload = syncPhoneHealth,
    this.recentSessions = fetchRecentSessions,
    this.saveHeartRate = setSessionHeartRate,
  }) : store = store() {
    WidgetsBinding.instance.addObserver(this);
    _auth.addListener(_onAuth);
    _onAuth();
  }

  final AuthController _auth;

  /// Null where the device has no health store (web, desktop).
  final PhoneHealthStore? store;

  // The API calls (replaceable in tests).
  final Future<Json> Function(String source, List<PhoneDay> days, List<PhoneBpReading> readings) upload;
  final Future<List<SessionRecord>> Function() recentSessions;
  final Future<Json> Function(String id, {required int avgHr, int? maxHr}) saveHeartRate;

  static const syncDays = 14;
  // Don't sync on every return to the app.
  static const _minGap = Duration(minutes: 15);
  // Workouts this recent get their heart rate filled in when the watch's
  // readings reach the store after the workout was saved.
  static const _heartRateLookback = Duration(days: 3);

  String? _userId;
  bool _syncing = false;
  String? _error;
  ({int days, int readings})? _lastResult;
  int _version = 0;

  bool get supported => store != null;
  bool get syncing => _syncing;
  String? get error => _error;
  ({int days, int readings})? get lastResult => _lastResult;

  /// Goes up after every upload, so screens showing health data reload.
  int get version => _version;

  String get _key => 'fitguide_phone_health_$_userId';
  Json? get _saved => _userId == null ? null : asJson(Storage.getJson(_key));
  bool get connected => supported && _saved?['on'] == true;
  DateTime? get lastSyncAt => DateTime.tryParse(asString(_saved?['lastSyncAt']) ?? '');

  void _onAuth() {
    final id = _auth.hasAccount ? _auth.user!.id : null;
    if (id == _userId) return;
    _userId = id;
    _error = null;
    _lastResult = null;
    notifyListeners();
    sync();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) sync();
  }

  /// Ask the phone for access, then upload. False when access was refused.
  Future<bool> connect() async {
    final store = this.store;
    if (store == null || _userId == null) return false;
    _error = null;
    try {
      if (!await store.requestAccess()) {
        _error = await store.isAvailable()
            ? 'FitGuide wasn\'t given access to ${store.name}. Allow it in ${store.name}\'s settings and try again.'
            : 'Install or update Health Connect, then try again.';
        notifyListeners();
        return false;
      }
    } catch (err) {
      _error = '$err';
      notifyListeners();
      return false;
    }
    await Storage.setJson(_key, {'on': true});
    notifyListeners();
    await sync(force: true);
    return true;
  }

  /// Stop syncing on this phone. Numbers already uploaded stay.
  Future<void> disconnect() async {
    await Storage.remove(_key);
    _lastResult = null;
    _error = null;
    notifyListeners();
  }

  Future<void> sync({bool force = false}) async {
    final store = this.store;
    final userId = _userId;
    if (store == null || !connected || _syncing) return;
    final last = lastSyncAt;
    if (!force && last != null && DateTime.now().difference(last) < _minGap) return;
    _syncing = true;
    notifyListeners();
    try {
      final now = DateTime.now();
      final from = DateTime(now.year, now.month, now.day - (syncDays - 1));
      final days = await store.days(from, now);
      final readings = await store.bloodPressure(from, now);
      final result = await upload(store.source, days, readings);
      await _fillWorkoutHeartRate(store, now);
      // Signed out (or switched account) while this ran: don't record it.
      if (userId != _userId) return;
      await Storage.setJson(_key, {'on': true, 'lastSyncAt': now.toIso8601String()});
      _lastResult = (days: asInt(result['days']) ?? 0, readings: asInt(result['readings']) ?? 0);
      _error = null;
      _version++;
    } catch (err) {
      _error = 'Couldn\'t sync ${store.name}: $err';
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }

  /// Heart rate for recent workouts saved without it, so their calories come
  /// from the watch rather than the estimate.
  Future<void> _fillWorkoutHeartRate(PhoneHealthStore store, DateTime now) async {
    for (final session in await recentSessions()) {
      final started = DateTime.tryParse(session.startedAt);
      final completed = DateTime.tryParse(session.completedAt);
      if (session.avgHr != null || started == null || completed == null || now.difference(completed) > _heartRateLookback) continue;
      final hr = await store.heartRate(started, completed);
      if (hr != null) await saveHeartRate(session.id, avgHr: hr.avg, maxHr: hr.max);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _auth.removeListener(_onAuth);
    super.dispose();
  }
}
