import '../core/api/api_client.dart';
import '../core/format.dart';
import '../models/json.dart';

/// The daily readiness score (services/readinessService.ts).
final _api = ApiClient.instance;
Map<String, Object> _tz() => {'tzOffset': tzOffset()};

class ReadinessReason {
  ReadinessReason(Json j)
      : text = asString(j['text']) ?? '',
        effect = asString(j['effect']) ?? 'none';
  final String text;

  /// up | down | none
  final String effect;
}

/// On a low day: an easier workout for today's session of a personal plan.
class EasierSwap {
  EasierSwap(Json j)
      : week = asInt(j['week']) ?? 1,
        day = asInt(j['day']) ?? 1,
        title = asString(j['title']) ?? '',
        newTitle = asString(j['newTitle']) ?? '',
        workoutSlug = asString(j['workoutSlug']) ?? '';
  final int week;
  final int day;
  final String title;
  final String newTitle;
  final String workoutSlug;
}

class Readiness {
  Readiness(Json j)
      : checkedIn = asBool(j['checkedIn']),
        energy = asInt(j['energy']),
        soreness = asInt(j['soreness']),
        score = asInt(j['score']) ?? 0,
        band = asString(j['band']) ?? 'steady',
        headline = asString(j['headline']) ?? '',
        advice = asString(j['advice']) ?? '',
        reasons = asJsonList(j['reasons']).map(ReadinessReason.new).toList(),
        easierSwap = j['easierSwap'] == null ? null : EasierSwap(asJson(j['easierSwap']));
  final bool checkedIn;
  final int? energy;
  final int? soreness;
  final int score;

  /// push | steady | easy
  final String band;
  final String headline;
  final String advice;
  final List<ReadinessReason> reasons;
  final EasierSwap? easierSwap;
}

Future<Readiness> fetchReadiness() async => Readiness(asJson((await _api.request('/readiness', auth: true, query: _tz()))['readiness']));

Future<Readiness> checkInReadiness(int energy, int soreness) async =>
    Readiness(asJson((await _api.request('/readiness', method: 'PUT', auth: true, query: _tz(), body: {'energy': energy, 'soreness': soreness}))['readiness']));

/// Put another workout on an open day of the personal plan.
Future<Json> swapPlanDay(int week, int day, String workoutSlug) =>
    _api.request('/plan/days', method: 'PATCH', auth: true, query: _tz(), body: {'week': week, 'day': day, 'workoutSlug': workoutSlug});
