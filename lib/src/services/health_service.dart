import '../core/api/api_client.dart';
import '../core/format.dart';
import '../models/json.dart';
import '../models/training.dart';
import 'phone_health.dart';

/// Daily health numbers and wearable connections (services/healthService.ts).
final _api = ApiClient.instance;
Map<String, Object> _tz() => {'tzOffset': tzOffset()};

class HealthDay {
  HealthDay(Json j)
      : date = asString(j['date']) ?? '',
        steps = asInt(j['steps']),
        restingHr = asInt(j['restingHr']),
        sleepMinutes = asInt(j['sleepMinutes']),
        activeCalories = asInt(j['activeCalories']),
        sources = asStrings(j['sources']);
  final String date;
  final int? steps;
  final int? restingHr;
  final int? sleepMinutes;
  final int? activeCalories;
  final List<String> sources;
}

/// Where a number came from, as people know it.
const sourceLabels = {
  'manual': 'entered by you',
  'apple_health': 'Apple Health',
  'health_connect': 'Health Connect',
  'fitbit': 'Fitbit',
  'csv': 'CSV import',
  'strava': 'Strava',
};

/// The American Heart Association's names for each category (adults).
const bpCategoryLabels = {
  'normal': 'Normal',
  'elevated': 'Elevated',
  'high_1': 'High, stage 1',
  'high_2': 'High, stage 2',
  'crisis': 'Very high: get medical help if it stays this high',
};

class BloodPressureReading {
  BloodPressureReading(Json j)
      : id = asString(j['id']) ?? '',
        measuredAt = asString(j['measuredAt']) ?? '',
        systolic = asInt(j['systolic']) ?? 0,
        diastolic = asInt(j['diastolic']) ?? 0,
        pulse = asInt(j['pulse']),
        source = asString(j['source']) ?? 'manual',
        category = asString(j['category']) ?? 'normal';
  final String id;
  final String measuredAt;
  final int systolic;
  final int diastolic;
  final int? pulse;
  final String source;
  final String category;
}

class HealthSummary {
  HealthSummary(Json j)
      : days = asJsonList(j['days']).map(HealthDay.new).toList(),
        today = j['today'] == null ? null : HealthDay(asJson(j['today'])),
        weekSteps = asInt(asJson(j['weekAverage'])['steps']),
        weekSleepMinutes = asInt(asJson(j['weekAverage'])['sleepMinutes']),
        weekActiveCalories = asInt(asJson(j['weekAverage'])['activeCalories']),
        latestRestingHr = j['latestRestingHr'] == null
            ? null
            : (value: asInt(asJson(j['latestRestingHr'])['value']) ?? 0, date: asString(asJson(j['latestRestingHr'])['date']) ?? ''),
        bloodPressure = asJsonList(asJson(j['bloodPressure'])['readings']).map(BloodPressureReading.new).toList();
  final List<HealthDay> days;
  final HealthDay? today;
  final int? weekSteps;
  final int? weekSleepMinutes;
  final int? weekActiveCalories;
  final ({int value, String date})? latestRestingHr;

  /// Newest first, the last 90 days.
  final List<BloodPressureReading> bloodPressure;
}

class Integration {
  Integration(Json j)
      : id = asString(j['id']) ?? '',
        name = asString(j['name']) ?? '',
        description = asString(j['description']) ?? '',
        available = asBool(j['available']),
        connected = asBool(j['connected']),
        lastSyncAt = asString(j['lastSyncAt']),
        lastError = asString(j['lastError']);
  final String id;
  final String name;
  final String description;
  final bool available;
  final bool connected;
  final String? lastSyncAt;
  final String? lastError;
}

Future<HealthSummary> fetchHealth([int days = 30]) async => HealthSummary(await _api.request('/health-data', auth: true, query: {'days': days, ..._tz()}));

Future<Json> saveHealthDay(String date, Json values) => _api.request('/health-data/$date', method: 'PUT', auth: true, query: _tz(), body: values);

Future<({int imported, int skipped, List<String> errors})> importHealthCsv(String csv) async {
  final data = await _api.request('/health-data/import', method: 'POST', auth: true, query: _tz(), body: {'csv': csv});
  return (imported: asInt(data['imported']) ?? 0, skipped: asInt(data['skipped']) ?? 0, errors: asStrings(data['errors']));
}

Future<BloodPressureReading> addBloodPressure({required int systolic, required int diastolic, int? pulse}) async => BloodPressureReading(asJson(
    (await _api.request('/health-data/blood-pressure', method: 'POST', auth: true, query: _tz(), body: {
      'systolic': systolic,
      'diastolic': diastolic,
      'pulse': ?pulse,
    }))['reading']));

Future<Json> deleteBloodPressure(String id) => _api.request('/health-data/blood-pressure/${Uri.encodeComponent(id)}', method: 'DELETE', auth: true);

/// Upload what the phone's health store holds (see PhoneHealthController).
Future<Json> syncPhoneHealth(String source, List<PhoneDay> days, List<PhoneBpReading> readings) => _api.request('/health-data/sync', method: 'POST', auth: true, query: _tz(), body: {
      'source': source,
      'days': [
        for (final d in days) {'date': d.date, 'steps': d.steps, 'activeCalories': d.activeCalories, 'restingHr': d.restingHr, 'sleepMinutes': d.sleepMinutes},
      ],
      'bloodPressure': [
        for (final r in readings) {'measuredAt': r.measuredAt.toUtc().toIso8601String(), 'systolic': r.systolic, 'diastolic': r.diastolic},
      ],
    });

Future<List<SessionRecord>> fetchRecentSessions() async => asJsonList((await _api.request('/sessions', auth: true, query: {'limit': 20}))['sessions']).map(SessionRecord.new).toList();

/// The watch's readings for a saved workout; the API works its calories out again.
Future<Json> setSessionHeartRate(String id, {required int avgHr, int? maxHr}) =>
    _api.request('/sessions/${Uri.encodeComponent(id)}/heart-rate', method: 'PUT', auth: true, body: {'avgHr': avgHr, 'maxHr': maxHr});

Future<List<Integration>> fetchIntegrations() async => asJsonList((await _api.request('/integrations', auth: true))['integrations']).map(Integration.new).toList();

Future<String> connectIntegration(String id) async => asString((await _api.request('/integrations/$id/connect', method: 'POST', auth: true))['url']) ?? '';
Future<Json> syncIntegration(String id) => _api.request('/integrations/$id/sync', method: 'POST', auth: true);
Future<Json> disconnectIntegration(String id) => _api.request('/integrations/$id', method: 'DELETE', auth: true);
