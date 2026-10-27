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
