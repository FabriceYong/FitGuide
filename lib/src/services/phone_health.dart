import 'package:flutter/foundation.dart';
import 'package:health/health.dart';

import '../core/format.dart';

/// One day's totals from the phone's health store.
typedef PhoneDay = ({String date, int? steps, int? activeCalories, int? restingHr, int? sleepMinutes});

/// One blood pressure reading from a cuff that writes to the health store.
typedef PhoneBpReading = ({DateTime measuredAt, int systolic, int diastolic});

/// The phone's health store: Apple Health on iPhone, Health Connect on
/// Android. The watch, the phone's own step counter, cuffs and other apps
/// all write there, so the app reads it instead of measuring anything itself.
abstract class PhoneHealthStore {
  /// The API's name for this source: apple_health | health_connect.
  String get source;

  /// What people call it.
  String get name;

  /// Whether it can be used on this phone (Health Connect may need installing).
  Future<bool> isAvailable();

  /// Ask to read steps, calories, heart rate, sleep and blood pressure.
  Future<bool> requestAccess();

  Future<List<PhoneDay>> days(DateTime from, DateTime to);

  Future<List<PhoneBpReading>> bloodPressure(DateTime from, DateTime to);

  /// Average and highest heart rate between two instants, or null without
  /// enough readings (a watch or strap wasn't worn).
  Future<({int avg, int max})?> heartRate(DateTime from, DateTime to);
}

/// The store for this device, or null where there isn't one (web, desktop).
PhoneHealthStore? defaultPhoneHealthStore() {
  if (kIsWeb) return null;
  return switch (defaultTargetPlatform) {
    TargetPlatform.iOS => HealthPackageStore(ios: true),
    TargetPlatform.android => HealthPackageStore(ios: false),
    _ => null,
  };
}

// Fewer than this many heart-rate samples in a workout isn't a real reading.
const _minHeartRateSamples = 3;

/// [PhoneHealthStore] through the `health` package.
class HealthPackageStore implements PhoneHealthStore {
  HealthPackageStore({required this.ios});

  final bool ios;
  // Created on first use, so building the app never touches the plugin.
  Health? _health;

  Future<Health> _plugin() async {
    if (_health == null) {
      _health = Health();
      await _health!.configure();
    }
    return _health!;
  }

  // iPhone records sleep stages; Health Connect has whole sleep sessions.
  HealthDataType get _sleep => ios ? HealthDataType.SLEEP_ASLEEP : HealthDataType.SLEEP_SESSION;

  List<HealthDataType> get _types => [
        HealthDataType.STEPS,
        HealthDataType.ACTIVE_ENERGY_BURNED,
        HealthDataType.HEART_RATE,
        HealthDataType.RESTING_HEART_RATE,
        HealthDataType.BLOOD_PRESSURE_SYSTOLIC,
        HealthDataType.BLOOD_PRESSURE_DIASTOLIC,
        _sleep,
      ];

  @override
  String get source => ios ? 'apple_health' : 'health_connect';

  @override
  String get name => ios ? 'Apple Health' : 'Health Connect';

  @override
  Future<bool> isAvailable() async => ios || await (await _plugin()).isHealthConnectAvailable();

  @override
  Future<bool> requestAccess() async {
    final health = await _plugin();
    if (!await isAvailable()) {
      // Opens the Play Store page for Health Connect (Android 13 and older).
      await health.installHealthConnect();
      return false;
    }
    return health.requestAuthorization(_types, permissions: [for (final _ in _types) HealthDataAccess.READ]);
  }

  /// Points of [type], or none when it can't be read (no permission for it).
  Future<List<HealthDataPoint>> _points(HealthDataType type, DateTime from, DateTime to) async {
    try {
      return await (await _plugin()).getHealthDataFromTypes(types: [type], startTime: from, endTime: to);
    } catch (_) {
      return const [];
    }
  }

  static num? _number(HealthDataPoint p) => p.value is NumericHealthValue ? (p.value as NumericHealthValue).numericValue : null;

  /// Sum per day of [value], keeping the source with the most: the watch and
  /// the phone both record the same walk, so adding sources would count it twice.
  static Map<String, num> _perDayBestSource(List<HealthDataPoint> points, String Function(HealthDataPoint) day, num? Function(HealthDataPoint) value) {
    final bySource = <String, Map<String, num>>{};
    for (final p in points) {
      final v = value(p);
      if (v == null) continue;
      final days = bySource.putIfAbsent(day(p), () => {});
      days[p.sourceId] = (days[p.sourceId] ?? 0) + v;
    }
    return {for (final e in bySource.entries) e.key: e.value.values.reduce((a, b) => a > b ? a : b)};
  }

  @override
  Future<List<PhoneDay>> days(DateTime from, DateTime to) async {
    final health = await _plugin();
    final start = DateTime(from.year, from.month, from.day);
    final energy = await _points(HealthDataType.ACTIVE_ENERGY_BURNED, start, to);
    final resting = await _points(HealthDataType.RESTING_HEART_RATE, start, to);
    // Last night's sleep belongs to the morning it ended, so look back an evening.
    final sleep = await _points(_sleep, start.subtract(const Duration(hours: 12)), to);

    final calories = _perDayBestSource(energy, (p) => ymd(p.dateFrom.toLocal()), _number);
    final sleepMinutes = _perDayBestSource(sleep, (p) => ymd(p.dateTo.toLocal()), (p) => p.dateTo.difference(p.dateFrom).inMinutes);
    final restingByDay = <String, List<num>>{};
    for (final p in resting) {
      final v = _number(p);
      if (v != null) restingByDay.putIfAbsent(ymd(p.dateFrom.toLocal()), () => []).add(v);
    }

    final out = <PhoneDay>[];
    for (var day = start; !day.isAfter(to); day = DateTime(day.year, day.month, day.day + 1)) {
      final next = DateTime(day.year, day.month, day.day + 1);
      int? steps;
      try {
        // The store's own total, which doesn't double-count phone and watch.
        steps = await health.getTotalStepsInInterval(day, next.isAfter(to) ? to : next);
      } catch (_) {}
      final date = ymd(day);
      final hr = restingByDay[date];
      out.add((
        date: date,
        steps: steps,
        activeCalories: calories[date]?.round(),
        restingHr: hr == null ? null : (hr.reduce((a, b) => a + b) / hr.length).round(),
        sleepMinutes: sleepMinutes[date]?.round(),
      ));
    }
    return out;
  }

  @override
  Future<List<PhoneBpReading>> bloodPressure(DateTime from, DateTime to) async {
    final systolic = await _points(HealthDataType.BLOOD_PRESSURE_SYSTOLIC, from, to);
    final diastolic = {
      for (final p in await _points(HealthDataType.BLOOD_PRESSURE_DIASTOLIC, from, to)) p.dateFrom.millisecondsSinceEpoch: _number(p),
    };
    // A reading is stored as two samples taken at the same moment.
    return [
      for (final p in systolic)
        if (_number(p) != null && diastolic[p.dateFrom.millisecondsSinceEpoch] != null)
          (measuredAt: p.dateFrom, systolic: _number(p)!.round(), diastolic: diastolic[p.dateFrom.millisecondsSinceEpoch]!.round()),
    ];
  }

  @override
  Future<({int avg, int max})?> heartRate(DateTime from, DateTime to) async {
    final values = (await _points(HealthDataType.HEART_RATE, from, to)).map(_number).whereType<num>().toList();
    if (values.length < _minHeartRateSamples) return null;
    return (avg: (values.reduce((a, b) => a + b) / values.length).round(), max: values.reduce((a, b) => a > b ? a : b).round());
  }
}
