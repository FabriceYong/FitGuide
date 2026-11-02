import '../core/api/api_client.dart';
import '../core/format.dart';
import '../models/json.dart';

/// Crews: small invite-only groups with a weekly goal (services/crewService.ts).
final _api = ApiClient.instance;
Map<String, Object> _tz() => {'tzOffset': tzOffset()};

class CrewSummary {
  CrewSummary(Json j)
      : id = asString(j['id']) ?? '',
        name = asString(j['name']) ?? '',
        weeklyGoal = asInt(j['weeklyGoal']) ?? 1,
        memberCount = asInt(j['memberCount']) ?? 1,
        thisWeek = asInt(j['thisWeek']) ?? 0;
  final String id;
  final String name;
  final int weeklyGoal;
  final int memberCount;
  final int thisWeek;
}

class CrewMember {
  CrewMember(Json j)
      : id = asString(j['id']) ?? '',
        name = asString(j['name']) ?? '',
        isOwner = asString(j['role']) == 'owner',
        isYou = asBool(j['isYou']),
        workoutsThisWeek = asInt(j['workoutsThisWeek']) ?? 0;
  final String id;
  final String name;
  final bool isOwner;
  final bool isYou;
  final int workoutsThisWeek;
}

class CrewActivity {
  CrewActivity(Json j)
      : id = asString(j['id']) ?? '',
        name = asString(j['name']) ?? '',
        isYou = asBool(j['isYou']),
        workoutTitle = asString(j['workoutTitle']) ?? '',
        completedAt = asString(j['completedAt']) ?? '',
        durationSec = asInt(j['durationSec']) ?? 0;
  final String id;
  final String name;
  final bool isYou;
  final String workoutTitle;
  final String completedAt;
  final int durationSec;
}

class CrewMessage {
  CrewMessage(Json j)
      : id = asString(j['id']) ?? '',
        name = asString(j['name']) ?? '',
        isYou = asBool(j['isYou']),
        text = asString(j['text']) ?? '',
        createdAt = asString(j['createdAt']) ?? '';
  final String id;
  final String name;
  final bool isYou;
  final String text;
  final String createdAt;
}

class Crew {
  Crew(Json j)
      : id = asString(j['id']) ?? '',
        name = asString(j['name']) ?? '',
        weeklyGoal = asInt(j['weeklyGoal']) ?? 1,
        inviteCode = asString(j['inviteCode']) ?? '',
        thisWeek = asInt(j['thisWeek']) ?? 0,
        isOwner = asBool(j['isOwner']),
        members = asJsonList(j['members']).map(CrewMember.new).toList(),
        activity = asJsonList(j['activity']).map(CrewActivity.new).toList(),
        messages = asJsonList(j['messages']).map(CrewMessage.new).toList();
  final String id;
  final String name;
  final int weeklyGoal;
  final String inviteCode;
  final int thisWeek;
  final bool isOwner;
  final List<CrewMember> members;
  final List<CrewActivity> activity;
  final List<CrewMessage> messages;
}

Future<List<CrewSummary>> fetchCrews() async => asJsonList((await _api.request('/crews', auth: true, query: _tz()))['crews']).map(CrewSummary.new).toList();

Future<Crew> fetchCrew(String id) async => Crew(asJson((await _api.request('/crews/${Uri.encodeComponent(id)}', auth: true, query: _tz()))['crew']));

Future<Crew> createCrew(String name, int weeklyGoal) async =>
    Crew(asJson((await _api.request('/crews', method: 'POST', auth: true, query: _tz(), body: {'name': name, 'weeklyGoal': weeklyGoal}))['crew']));

Future<Crew> joinCrew(String code) async => Crew(asJson((await _api.request('/crews/join', method: 'POST', auth: true, query: _tz(), body: {'code': code}))['crew']));

Future<Crew> updateCrewGoal(String id, int weeklyGoal) async =>
    Crew(asJson((await _api.request('/crews/${Uri.encodeComponent(id)}', method: 'PATCH', auth: true, query: _tz(), body: {'weeklyGoal': weeklyGoal}))['crew']));

Future<CrewMessage> sendCrewMessage(String id, String text) async =>
    CrewMessage(asJson((await _api.request('/crews/${Uri.encodeComponent(id)}/messages', method: 'POST', auth: true, body: {'text': text}))['message']));

Future<Json> leaveCrew(String id) => _api.request('/crews/${Uri.encodeComponent(id)}/membership', method: 'DELETE', auth: true);

Future<Json> removeCrewMember(String id, String userId) =>
    _api.request('/crews/${Uri.encodeComponent(id)}/members/${Uri.encodeComponent(userId)}', method: 'DELETE', auth: true);
