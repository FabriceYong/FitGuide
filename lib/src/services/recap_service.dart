import '../core/api/api_client.dart';
import '../core/format.dart';
import '../models/json.dart';
import '../models/training.dart';

/// The monthly and yearly recap (services/recapService.ts).
final _api = ApiClient.instance;

class Recap {
  Recap(Json j)
      : kind = asString(j['kind']) ?? 'month',
        key = asString(j['key']) ?? '',
        label = asString(j['label']) ?? '',
        workouts = asInt(j['workouts']) ?? 0,
        previousWorkouts = asInt(j['previousWorkouts']) ?? 0,
        activeDays = asInt(j['activeDays']) ?? 0,
        minutes = asInt(j['minutes']) ?? 0,
        volumeKg = asDouble(j['volumeKg']) ?? 0,
        records = asInt(j['records']) ?? 0,
        topRecord = j['topRecord'] == null ? null : PersonalRecord(asJson(j['topRecord'])),
        topMuscle = j['topMuscle'] == null ? null : (region: asString(asJson(j['topMuscle'])['region']) ?? '', workouts: asInt(asJson(j['topMuscle'])['workouts']) ?? 0),
        favouriteWorkout = j['favouriteWorkout'] == null ? null : (title: asString(asJson(j['favouriteWorkout'])['title']) ?? '', times: asInt(asJson(j['favouriteWorkout'])['times']) ?? 0),
        foodDays = asInt(j['foodDays']) ?? 0;

  /// month | year
  final String kind;
  final String key;
  final String label;
  final int workouts;
  final int previousWorkouts;
  final int activeDays;
  final int minutes;
  final double volumeKg;
  final int records;
  final PersonalRecord? topRecord;
  final ({String region, int workouts})? topMuscle;
  final ({String title, int times})? favouriteWorkout;
  final int foodDays;

  bool get isMonth => kind == 'month';
}

/// A month ('YYYY-MM') or a year's recap.
Future<Recap> fetchRecap({String? month, int? year}) async => Recap(asJson((await _api.request('/progress/recap', auth: true, query: {
      'tzOffset': tzOffset(),
      if (month != null) 'month': month,
      if (year != null) 'year': year,
    }))['recap']));

/// Recaps to offer on the home tab (last month's early in a month, last year's in early January).
Future<List<Recap>> fetchRecapOffers() async =>
    asJsonList((await _api.request('/progress/recap/offers', auth: true, query: {'tzOffset': tzOffset()}))['offers']).map(Recap.new).toList();
