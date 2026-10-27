import '../core/api/api_client.dart';
import '../core/format.dart';
import '../models/json.dart';

/// Daily health numbers and wearable connections (services/healthService.ts).
final _api = ApiClient.instance;
Map<String, Object> _tz() => {'tzOffset': tzOffset()};

class HealthDay {
  HealthDay(Json j)
      : date = asString(j['date']) ?? '',
        steps = asInt(j['steps']),
        restingHr = asInt(j['restingHr']),
        sleepMinutes = asInt(j['sleepMinutes']);
  final String date;
  final int? steps;
  final int? restingHr;
  final int? sleepMinutes;
}

class HealthSummary {
  HealthSummary(Json j)
      : days = asJsonList(j['days']).map(HealthDay.new).toList(),
        today = j['today'] == null ? null : HealthDay(asJson(j['today'])),
        weekSteps = asInt(asJson(j['weekAverage'])['steps']),
        weekSleepMinutes = asInt(asJson(j['weekAverage'])['sleepMinutes']),
        latestRestingHr = j['latestRestingHr'] == null
            ? null
            : (value: asInt(asJson(j['latestRestingHr'])['value']) ?? 0, date: asString(asJson(j['latestRestingHr'])['date']) ?? '');
  final List<HealthDay> days;
  final HealthDay? today;
  final int? weekSteps;
  final int? weekSleepMinutes;
  final ({int value, String date})? latestRestingHr;
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

Future<List<Integration>> fetchIntegrations() async => asJsonList((await _api.request('/integrations', auth: true))['integrations']).map(Integration.new).toList();

Future<String> connectIntegration(String id) async => asString((await _api.request('/integrations/$id/connect', method: 'POST', auth: true))['url']) ?? '';
Future<Json> syncIntegration(String id) => _api.request('/integrations/$id/sync', method: 'POST', auth: true);
Future<Json> disconnectIntegration(String id) => _api.request('/integrations/$id', method: 'DELETE', auth: true);
