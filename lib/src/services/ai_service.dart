import '../core/api/api_client.dart';
import '../core/format.dart';
import '../models/json.dart';

/// FitGuide's small AI helpers (services/aiService.ts): exercise swap,
/// workout feedback and the weekly check-in.
final _api = ApiClient.instance;
Map<String, Object> _tz() => {'tzOffset': tzOffset()};

typedef AiAllowance = ({int used, int max, int left});

AiAllowance _allowance(Object? j) {
  final m = asJson(j);
  return (used: asInt(m['used']) ?? 0, max: asInt(m['max']) ?? 0, left: asInt(m['left']) ?? 0);
}

class AiStatus {
  AiStatus(Json j) : available = asBool(j['available']), allowance = asJson(j['allowance']).map((k, v) => MapEntry(k, _allowance(v)));
  final bool available;
  final Map<String, AiAllowance> allowance;

  AiAllowance left(String kind) => allowance[kind] ?? (used: 0, max: 0, left: 0);
}

Future<AiStatus> fetchAiStatus() async => AiStatus(await _api.request('/ai', auth: true));

class Swap {
  Swap(Json j)
    : name = asString(j['name']) ?? '',
      instruction = asString(j['instruction']) ?? '',
      why = asString(j['why']) ?? '',
      formCues = asStrings(j['formCues']),
      safetyNote = asString(j['safetyNote']);
  final String name;
  final String instruction;
  final String why;
  final List<String> formCues;
  final String? safetyNote;
}

Future<Swap> suggestSwap({required String instruction, String? exerciseName, required String reason, String? details, required Json workout}) async {
  final data = await _api.request(
    '/ai/swap',
    method: 'POST',
    auth: true,
    timeout: const Duration(seconds: 60),
    body: {
      'step': {'instruction': instruction, if (exerciseName != null && exerciseName.isNotEmpty) 'exerciseName': exerciseName},
      'reason': reason,
      if (details != null && details.trim().isNotEmpty) 'details': details.trim(),
      'workout': workout,
    },
  );
  return Swap(asJson(data['swap']));
}

class WorkoutFeedbackNote {
  WorkoutFeedbackNote(Json j) : headline = asString(j['headline']) ?? '', notes = asStrings(j['notes']), nextTime = asString(j['nextTime']) ?? '';
  final String headline;
  final List<String> notes;
  final String nextTime;
}

Future<WorkoutFeedbackNote> fetchWorkoutFeedback(String sessionId) async =>
    WorkoutFeedbackNote(asJson((await _api.request('/ai/feedback', method: 'POST', auth: true, query: _tz(), body: {'sessionId': sessionId}, timeout: const Duration(seconds: 60)))['feedback']));

class Checkin {
  Checkin(Json j)
    : summary = asString(j['summary']) ?? '',
      wins = asStrings(j['wins']),
      focus = asString(j['focus']) ?? '',
      planChange = asString(j['planChange']),
      workouts = asInt(asJson(j['week'])['workouts']) ?? 0,
      minutes = asInt(asJson(j['week'])['minutes']) ?? 0,
      averageSteps = asInt(asJson(j['week'])['averageSteps']),
      daysFoodLogged = asInt(asJson(j['week'])['daysFoodLogged']) ?? 0;
  final String summary;
  final List<String> wins;
  final String focus;

  /// easier | harder | keep, or null without a plan.
  final String? planChange;
  final int workouts;
  final int minutes;
  final int? averageSteps;
  final int daysFoodLogged;
}

Future<({Checkin checkin, AiAllowance allowance})> fetchCheckin() async {
  final data = await _api.request('/ai/checkin', method: 'POST', auth: true, query: _tz(), timeout: const Duration(seconds: 60));
  return (checkin: Checkin(asJson(data['checkin'])), allowance: _allowance(data['allowance']));
}
