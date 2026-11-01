import '../core/api/api_client.dart';
import '../core/format.dart';
import '../models/json.dart';
import '../models/training.dart';

/// Personal plans and the AI coach (services/planService.ts).
final _api = ApiClient.instance;
Map<String, Object> _tz() => {'tzOffset': tzOffset()};

class PlanOptions {
  PlanOptions(Json j)
      : goals = asStrings(j['goals']),
        levels = asStrings(j['levels']),
        equipment = asStrings(j['equipment']);
  final List<String> goals;
  final List<String> levels;
  final List<String> equipment;
}

class AdaptResult {
  AdaptResult(Json j)
      : direction = asString(j['direction']) ?? 'keep',
        reason = asString(j['reason']) ?? '',
        changes = asJsonList(j['changes']),
        plan = Plan(asJson(j['plan']));
  final String direction;
  final String reason;
  final List<Json> changes;
  final Plan plan;
}

/// One day a suggestion changes: catching up gives it a new date,
/// easier/harder a new workout.
class SuggestedChange {
  SuggestedChange(Json j)
      : week = asInt(j['week']) ?? 1,
        day = asInt(j['day']) ?? 1,
        title = asString(j['title']) ?? '',
        date = asString(j['date']) ?? '',
        newDate = asString(j['newDate']),
        newTitle = asString(j['newTitle']);
  final int week;
  final int day;
  final String title;
  final String date;
  final String? newDate;
  final String? newTitle;
}

/// A change the active plan or program proposes (catch_up, easier or
/// harder); nothing changes until it's accepted.
class PlanSuggestion {
  PlanSuggestion(Json j)
      : id = asString(j['id']) ?? '',
        kind = asString(j['kind']) ?? 'catch_up',
        enrollmentId = asString(j['enrollmentId']) ?? '',
        programTitle = asString(j['programTitle']) ?? '',
        reason = asString(j['reason']) ?? '',
        endDate = asString(j['endDate']),
        changes = asJsonList(j['changes']).map(SuggestedChange.new).toList();

  static PlanSuggestion? maybe(Object? j) => j == null ? null : PlanSuggestion(asJson(j));

  final String id;
  final String kind;
  final String enrollmentId;
  final String programTitle;
  final String reason;
  final String? endDate;
  final List<SuggestedChange> changes;
}

class CoachMessage {
  CoachMessage({required this.id, required this.role, required this.text, required this.createdAt});
  CoachMessage.fromJson(Json j)
      : id = asString(j['id']) ?? '',
        role = asString(j['role']) ?? 'assistant',
        text = asString(j['text']) ?? '',
        createdAt = asString(j['createdAt']) ?? '';
  final String id;
  final String role;
  final String text;
  final String createdAt;
}

Future<PlanOptions> fetchPlanOptions() async => PlanOptions(await _api.request('/plan/options', auth: true));

Future<Plan?> fetchPlan() async => Plan.maybe((await _api.request('/plan', auth: true, query: _tz()))['plan']);

Future<({Plan plan, List<String> warnings})> generatePlan(Json answers) async {
  final data = await _api.request('/plan/generate', method: 'POST', auth: true, query: _tz(), body: answers);
  return (plan: Plan(asJson(data['plan'])), warnings: asStrings(data['warnings']));
}

Future<AdaptResult> adaptPlan() async => AdaptResult(await _api.request('/plan/adapt', method: 'POST', auth: true, query: _tz()));

Future<PlanSuggestion?> fetchPlanSuggestion() async =>
    PlanSuggestion.maybe((await _api.request('/plan/suggestion', auth: true, query: _tz()))['suggestion']);

/// Make the change; returns the enrollment as it is now. If the plan changed
/// since, this throws an ApiError (409) with the new suggestion in its data.
Future<Plan> acceptPlanSuggestion(String id) async =>
    Plan(asJson((await _api.request('/plan/suggestion/accept', method: 'POST', auth: true, query: _tz(), body: {'id': id}))['enrollment']));

/// No thanks: that kind isn't suggested again for a week.
Future<Json> dismissPlanSuggestion(String kind) =>
    _api.request('/plan/suggestion/dismiss', method: 'POST', auth: true, query: _tz(), body: {'kind': kind});

Future<({bool available, List<CoachMessage> messages})> fetchCoach() async {
  final data = await _api.request('/coach', auth: true);
  return (available: asBool(data['available']), messages: asJsonList(data['messages']).map(CoachMessage.fromJson).toList());
}

Future<({CoachMessage reply, bool changedPlan})> sendCoachMessage(String text) async {
  // The coach can take a while to think and use its plan tools.
  final data = await _api.request('/coach/messages', method: 'POST', auth: true, query: _tz(), body: {'text': text}, timeout: const Duration(seconds: 120));
  return (reply: CoachMessage.fromJson(asJson(data['reply'])), changedPlan: asBool(data['changedPlan']));
}

Future<Json> resetCoach() => _api.request('/coach/messages', method: 'DELETE', auth: true);
