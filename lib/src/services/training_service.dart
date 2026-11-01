import 'dart:async';
import 'dart:math';

import '../core/api/api_client.dart';
import '../core/format.dart';
import '../core/storage.dart';
import '../models/catalog.dart';
import '../models/json.dart';
import '../models/training.dart';

/// Logged sessions, programs and enrollments, body metrics and the progress
/// summary (services/trainingService.ts). Calendar-dependent calls send the
/// device's UTC offset so the API groups days in the user's local time.
final _api = ApiClient.instance;
Map<String, Object> _tz() => {'tzOffset': tzOffset()};

// ── Progress ──────────────────────────────────────────────────────────────────
class ProgressData {
  ProgressData(this.summary, this.recentSessions);
  final ProgressSummary summary;
  final List<SessionRecord> recentSessions;
}

Future<ProgressData> fetchProgressSummary() async {
  final data = await _api.request('/progress/summary', auth: true, query: _tz());
  return ProgressData(ProgressSummary(asJson(data['summary'])), asJsonList(data['recentSessions']).map(SessionRecord.new).toList());
}

// ── Sessions ──────────────────────────────────────────────────────────────────
// Sessions finished without a connection wait here, each with the account it
// belongs to, and are sent once that account is signed in and back online.
// Every session carries a clientId, so the API saves a resent one only once.
const _queueKey = 'fitguide_pending_sessions_v2';
const _programFields = ['enrollmentId', 'programWeek', 'programDay'];

/// A random id for a new session (see the API's clientId).
String newClientId() {
  final r = Random.secure();
  String hex(int n) => List.generate(n, (_) => r.nextInt(16).toRadixString(16)).join();
  return '${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + r.nextInt(4)).toRadixString(16)}${hex(3)}-${hex(12)}';
}

List<Json> _readQueue() => asJsonList(Storage.getJson(_queueKey))
    .where((q) => q['userId'] is String && asJson(q['session'])['clientId'] != null)
    .toList();

Future<void> _writeQueue(List<Json> items) => items.isEmpty ? Storage.remove(_queueKey) : Storage.setJson(_queueKey, items);

Future<Json> _postSession(Json session) => _api.request('/sessions', method: 'POST', auth: true, body: session);

class LoggedSession {
  LoggedSession(this.session, this.newRecords, {this.queued = false});
  final Json session;
  final List<PersonalRecord> newRecords;
  final bool queued;
}

/// Save a finished session for the signed-in user. Offline (status 0), it's
/// queued for this user and comes back with queued = true.
Future<LoggedSession> logSession(Json session, String userId) async {
  final body = {...session, 'clientId': session['clientId'] ?? newClientId()};
  try {
    final data = await _postSession(body);
    return LoggedSession(asJson(data['session']), asJsonList(data['newRecords']).map(PersonalRecord.new).toList());
  } catch (err) {
    if (err is! ApiError || err.status != 0) rethrow;
    await _writeQueue([..._readQueue(), {'userId': userId, 'session': body}]);
    return LoggedSession({...body, 'calories': null}, const [], queued: true);
  }
}

int queuedSessionCount(String userId) => _readQueue().where((q) => q['userId'] == userId).length;

/// Forget a user's queued sessions (their account is being deleted).
Future<void> discardQueuedSessions(String userId) => _writeQueue(_readQueue().where((q) => q['userId'] != userId).toList());

bool _retryLater(int status) => status == 0 || status == 401 || status == 408 || status == 429 || status >= 500;

Future<String> _sendQueued(Json session) async {
  try {
    await _postSession(session);
    return 'sent';
  } catch (err) {
    final status = err is ApiError ? err.status : 0;
    if (_retryLater(status)) return 'retry';
    // The program may have ended while offline, so the day can't count for it
    // any more. Keep the workout itself.
    if (status == 400 && session['enrollmentId'] != null) {
      return _sendQueued({for (final e in session.entries) if (!_programFields.contains(e.key)) e.key: e.value});
    }
    return 'dropped';
  }
}

final _flushing = <String, Future<({int sent, int dropped})>>{};

/// Send this user's queued sessions. Ones the API refuses for good are
/// removed and counted as dropped.
Future<({int sent, int dropped})> flushQueuedSessions(String userId) {
  return _flushing[userId] ??= () async {
    try {
      final mine = _readQueue().where((q) => q['userId'] == userId).toList();
      final done = <String>{};
      var sent = 0;
      var dropped = 0;
      for (final q in mine) {
        final session = asJson(q['session']);
        final result = await _sendQueued(session);
        if (result == 'retry') continue;
        done.add('${session['clientId']}');
        if (result == 'sent') {
          sent++;
        } else {
          dropped++;
        }
      }
      // Re-read, so a session queued while this ran is kept.
      await _writeQueue(_readQueue().where((q) => !(q['userId'] == userId && done.contains('${asJson(q['session'])['clientId']}'))).toList());
      return (sent: sent, dropped: dropped);
    } finally {
      _flushing.remove(userId);
    }
  }();
}

/// The same set last time, and what to aim for now (fitguide_api/services/progress.js).
class PreviousSet {
  PreviousSet(Json j)
      : last = j['last'] == null ? null : (reps: asInt(asJson(j['last'])['reps']), weightKg: asDouble(asJson(j['last'])['weightKg']), completedAt: asString(asJson(j['last'])['completedAt']) ?? ''),
        suggestion = j['suggestion'] == null
            ? null
            : (reps: asInt(asJson(j['suggestion'])['reps']) ?? 0, weightKg: asDouble(asJson(j['suggestion'])['weightKg']), reason: asString(asJson(j['suggestion'])['reason']) ?? 'more_reps');
  final ({int? reps, double? weightKg, String completedAt})? last;

  /// [reason] is add_weight, reach_range or more_reps.
  final ({int reps, double? weightKg, String reason})? suggestion;
}

/// For each step (its saved name and rep target), the same set last time; in step order.
Future<List<PreviousSet>> fetchPreviousSets(List<Json> steps) async =>
    asJsonList((await _api.request('/sessions/previous-sets', method: 'POST', auth: true, body: {'steps': steps}))['steps']).map(PreviousSet.new).toList();

Future<Json> deleteSession(String id) => _api.request('/sessions/${Uri.encodeComponent(id)}', method: 'DELETE', auth: true);

// ── Programs ──────────────────────────────────────────────────────────────────
Future<List<ProgramSummary>> fetchPrograms() async => asJsonList((await _api.request('/programs'))['programs']).map(ProgramSummary.new).toList();

Future<ProgramDetail?> fetchProgram(String slug) async {
  try {
    final data = await _api.request('/programs/${Uri.encodeComponent(slug)}');
    return ProgramDetail(asJson(data['program']), asJson(data['workouts']));
  } on ApiError catch (err) {
    if (err.status == 404) return null;
    rethrow;
  }
}

class Enrollments {
  Enrollments(this.active, this.enrollments);
  final Plan? active;
  final List<Plan> enrollments;
}

Future<Enrollments> fetchEnrollments() async {
  final data = await _api.request('/enrollments', auth: true, query: _tz());
  return Enrollments(Plan.maybe(data['active']), asJsonList(data['enrollments']).map(Plan.new).toList());
}

/// Start a program. Throws ApiError 409 (code ACTIVE_ENROLLMENT) if another is active and [replace] isn't set.
Future<Json> enrollInProgram(String programSlug, {bool replace = false, String? startDate}) => _api.request(
      '/enrollments',
      method: 'POST',
      auth: true,
      query: _tz(),
      body: {'programSlug': programSlug, 'startDate': startDate ?? localToday(), 'replace': replace},
    );

Future<Json> leaveProgram(String id) =>
    _api.request('/enrollments/${Uri.encodeComponent(id)}', method: 'PATCH', auth: true, query: _tz(), body: {'status': 'abandoned'});

// ── Body metrics ──────────────────────────────────────────────────────────────
Future<List<BodyMetric>> fetchBodyMetrics() async => asJsonList((await _api.request('/body-metrics', auth: true))['metrics']).map(BodyMetric.new).toList();

Future<Json> logBodyMetric(Json entry) => _api.request('/body-metrics', method: 'POST', auth: true, query: _tz(), body: entry);

Future<Json> deleteBodyMetric(String id) => _api.request('/body-metrics/${Uri.encodeComponent(id)}', method: 'DELETE', auth: true);

/// Workouts by slug, for screens that link sessions back to the catalog.
Map<String, Workout> bySlug(List<Workout> workouts) => {for (final w in workouts) w.slug: w};
