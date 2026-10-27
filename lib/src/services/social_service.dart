import '../core/api/api_client.dart';
import '../core/format.dart';
import '../models/json.dart';

/// Friends, challenges and leaderboards (services/socialService.ts).
final _api = ApiClient.instance;
Map<String, Object> _tz() => {'tzOffset': tzOffset()};

class FriendEntry {
  FriendEntry(Json j)
      : id = asString(j['id']) ?? '',
        name = asString(j['name']) ?? '',
        friendshipId = asString(j['friendshipId']) ?? '';
  final String id;
  final String name;
  final String friendshipId;
}

class Friends {
  Friends(Json j)
      : friendCode = asString(j['friendCode']) ?? '',
        friends = asJsonList(j['friends']).map(FriendEntry.new).toList(),
        incoming = asJsonList(j['incoming']).map(FriendEntry.new).toList(),
        outgoing = asJsonList(j['outgoing']).map(FriendEntry.new).toList();
  final String friendCode;
  final List<FriendEntry> friends;
  final List<FriendEntry> incoming;
  final List<FriendEntry> outgoing;
}

class LeaderboardRow {
  LeaderboardRow(Json j)
      : id = asString(j['id']) ?? '',
        name = asString(j['name']) ?? '',
        score = asDouble(j['score']) ?? 0,
        rank = asInt(j['rank']) ?? 0,
        isYou = asBool(j['isYou']);
  final String id;
  final String name;
  final double score;
  final int rank;
  final bool isYou;
}

class Challenge {
  Challenge(Json j)
      : id = asString(j['id']) ?? '',
        title = asString(j['title']) ?? '',
        metricLabel = asString(j['metricLabel']) ?? '',
        unit = asString(j['unit']) ?? '',
        startDate = asString(j['startDate']) ?? '',
        endDate = asString(j['endDate']) ?? '',
        visibility = asString(j['visibility']) ?? 'friends',
        status = asString(j['status']) ?? 'active',
        memberCount = asInt(j['memberCount']) ?? 0,
        joined = asBool(j['joined']),
        isCreator = asBool(j['isCreator']),
        joinCode = asString(j['joinCode']),
        leaderboard = j['leaderboard'] == null ? null : asJsonList(j['leaderboard']).map(LeaderboardRow.new).toList();
  final String id;
  final String title;
  final String metricLabel;
  final String unit;
  final String startDate;
  final String endDate;
  final String visibility;
  final String status;
  final int memberCount;
  final bool joined;
  final bool isCreator;
  final String? joinCode;
  final List<LeaderboardRow>? leaderboard;
}

Future<Friends> fetchFriends() async => Friends(await _api.request('/social/friends', auth: true));

Future<String> addFriend(String code) async =>
    asString((await _api.request('/social/friends', method: 'POST', auth: true, body: {'code': code}))['result']) ?? 'requested';

Future<Json> acceptFriend(String friendshipId) => _api.request('/social/friends/$friendshipId/accept', method: 'POST', auth: true);
Future<Json> removeFriend(String friendshipId) => _api.request('/social/friends/$friendshipId', method: 'DELETE', auth: true);

Future<List<LeaderboardRow>> fetchLeaderboard([String metric = 'minutes']) async =>
    asJsonList((await _api.request('/social/leaderboard', auth: true, query: {'metric': metric, ..._tz()}))['rows']).map(LeaderboardRow.new).toList();

Future<List<Challenge>> fetchChallenges() async =>
    asJsonList((await _api.request('/social/challenges', auth: true, query: _tz()))['challenges']).map(Challenge.new).toList();

Future<Challenge> fetchChallenge(String id) async => Challenge(asJson((await _api.request('/social/challenges/$id', auth: true, query: _tz()))['challenge']));

Future<Challenge> createChallenge(Json input) async =>
    Challenge(asJson((await _api.request('/social/challenges', method: 'POST', auth: true, query: _tz(), body: input))['challenge']));

Future<Challenge> joinChallenge(String id) async =>
    Challenge(asJson((await _api.request('/social/challenges/$id/join', method: 'POST', auth: true, query: _tz()))['challenge']));

Future<Challenge> joinChallengeByCode(String code) async =>
    Challenge(asJson((await _api.request('/social/challenges/join', method: 'POST', auth: true, query: _tz(), body: {'code': code}))['challenge']));

Future<Json> leaveChallenge(String id) => _api.request('/social/challenges/$id/membership', method: 'DELETE', auth: true);
Future<Json> deleteChallenge(String id) => _api.request('/social/challenges/$id', method: 'DELETE', auth: true);
