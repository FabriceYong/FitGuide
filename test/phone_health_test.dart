import 'package:fitguide/src/models/json.dart';
import 'package:fitguide/src/models/training.dart';
import 'package:fitguide/src/models/user.dart';
import 'package:fitguide/src/services/phone_health.dart';
import 'package:fitguide/src/state/auth_controller.dart';
import 'package:fitguide/src/state/phone_health_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

/// Signed in as [id], without the API.
class _SignedIn extends AuthController {
  String id = 'user-1';
  void switchTo(String next) {
    id = next;
    notifyListeners();
  }

  @override
  AppUser? get user => AppUser({'id': id, 'name': 'Tester'});

  @override
  bool get hasAccount => true;
}

class _FakeStore implements PhoneHealthStore {
  bool grant = true;
  int accessRequests = 0;

  @override
  String get source => 'health_connect';
  @override
  String get name => 'Health Connect';
  @override
  Future<bool> isAvailable() async => true;
  @override
  Future<bool> requestAccess() async {
    accessRequests++;
    return grant;
  }

  @override
  Future<List<PhoneDay>> days(DateTime from, DateTime to) async => [
        for (var d = from; !d.isAfter(to); d = DateTime(d.year, d.month, d.day + 1))
          (date: '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}', steps: 5000, activeCalories: 300, restingHr: 60, sleepMinutes: null),
      ];

  @override
  Future<List<PhoneBpReading>> bloodPressure(DateTime from, DateTime to) async => [(measuredAt: to.subtract(const Duration(hours: 2)), systolic: 121, diastolic: 79)];

  @override
  Future<({int avg, int max})?> heartRate(DateTime from, DateTime to) async => (avg: 138, max: 170);
}

Json _session(String id, {int? avgHr, Duration ago = const Duration(hours: 1)}) {
  final done = DateTime.now().subtract(ago);
  return {
    'id': id,
    'workoutSlug': 'core-power-blast',
    'startedAt': done.subtract(const Duration(minutes: 20)).toIso8601String(),
    'completedAt': done.toIso8601String(),
    'durationSec': 1200,
    'avgHr': avgHr,
  };
}

void main() {
  setUp(setUpApp);

  testWidgets('uploads the phone health store once connected, and fills in workout heart rate', (tester) async {
    final auth = _SignedIn();
    final store = _FakeStore();
    final uploads = <({String source, List<PhoneDay> days, List<PhoneBpReading> readings})>[];
    final heartRates = <String, int>{};
    final phone = PhoneHealthController(
      auth,
      store: () => store,
      upload: (source, days, readings) async {
        uploads.add((source: source, days: days, readings: readings));
        return {'days': days.length, 'readings': readings.length};
      },
      recentSessions: () async => [
        SessionRecord(_session('no-hr')),
        SessionRecord(_session('has-hr', avgHr: 120)),
        SessionRecord(_session('old', ago: const Duration(days: 5))),
      ],
      saveHeartRate: (id, {required avgHr, maxHr}) async {
        heartRates[id] = avgHr;
        return {};
      },
    );
    addTearDown(phone.dispose);

    // Nothing is read until the person connects.
    expect(phone.supported, isTrue);
    expect(phone.connected, isFalse);
    await phone.sync(force: true);
    expect(uploads, isEmpty);

    expect(await phone.connect(), isTrue);
    expect(phone.connected, isTrue);
    expect(uploads, hasLength(1));
    expect(uploads.single.source, 'health_connect');
    expect(uploads.single.days, hasLength(PhoneHealthController.syncDays));
    expect(uploads.single.readings.single.systolic, 121);
    expect(heartRates, {'no-hr': 138});
    expect(phone.version, 1);
    expect(phone.lastResult, (days: 14, readings: 1));
    expect(phone.lastSyncAt, isNotNull);

    // Coming back to the app straight away doesn't sync again; Sync now does.
    await phone.sync();
    expect(uploads, hasLength(1));
    await phone.sync(force: true);
    expect(uploads, hasLength(2));

    // Connected per account: another account on this phone starts disconnected.
    auth.switchTo('user-2');
    expect(phone.connected, isFalse);
    auth.switchTo('user-1');
    expect(phone.connected, isTrue);

    await phone.disconnect();
    await phone.sync(force: true);
    expect(uploads, hasLength(2));
  });

  testWidgets('says so when access is refused', (tester) async {
    final store = _FakeStore()..grant = false;
    final phone = PhoneHealthController(_SignedIn(), store: () => store, upload: (_, _, _) async => fail('should not upload'));
    addTearDown(phone.dispose);
    expect(await phone.connect(), isFalse);
    expect(phone.connected, isFalse);
    expect(phone.error, contains('Health Connect'));
  });

  testWidgets('does nothing where the device has no health store', (tester) async {
    final phone = PhoneHealthController(_SignedIn(), store: () => null);
    addTearDown(phone.dispose);
    expect(phone.supported, isFalse);
    expect(await phone.connect(), isFalse);
  });
}
