import 'dart:convert';
import 'dart:typed_data';

import 'package:fitguide/src/core/api/api_client.dart';
import 'package:fitguide/src/features/profile/data_export.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

/// "Download my data": each file is fetched with the session and saved.
void main() {
  final asked = <String>[];

  setUp(() async {
    await setUpApp();
    asked.clear();
    ApiClient.instance.useForTesting(MockClient((request) async {
      asked.add(request.url.path);
      if (request.url.path.endsWith('.csv')) return http.Response('completed_at,workout\r\n2026-11-01,Leg day\r\n', 200);
      if (request.url.path.endsWith('/export')) return http.Response(jsonEncode({'profile': {'name': 'Ada'}}), 200);
      return http.Response(jsonEncode({'message': 'Not found.'}), 404);
    }));
  });
  tearDown(() => ApiClient.instance.useForTesting(http.Client(), signedIn: false));

  testWidgets('saves the JSON and CSV files under dated names', (tester) async {
    final saved = <String, String>{};
    await pumpApp(tester, DataExport(save: (name, Uint8List bytes) async {
      saved[name] = utf8.decode(bytes);
      return '/downloads/$name';
    }));

    await tester.tap(find.bySemanticsLabel('Download Everything (JSON)'));
    await tester.pumpAndSettle();
    await tester.tap(find.bySemanticsLabel('Download Workouts (CSV)'));
    await tester.pumpAndSettle();

    expect(asked, [endsWith('/auth/export'), endsWith('/auth/export/workouts.csv')]);
    final json = saved.keys.singleWhere((n) => n.endsWith('.json'));
    expect(json, matches(RegExp(r'^fitguide-data-\d{4}-\d{2}-\d{2}\.json$')));
    expect(jsonDecode(saved[json]!), {'profile': {'name': 'Ada'}});
    expect(saved.entries.singleWhere((e) => e.key.endsWith('.csv')).value, contains('Leg day'));
    expect(find.textContaining('Saved fitguide-workouts-'), findsOneWidget);
  });

  testWidgets('says when a file could not be fetched', (tester) async {
    ApiClient.instance.useForTesting(MockClient((_) async => http.Response(jsonEncode({'message': 'Too many downloads. Please wait 15 minutes and try again.'}), 429)));
    await pumpApp(tester, DataExport(save: (_, _) async => 'unused'));
    await tester.tap(find.bySemanticsLabel('Download Body measurements (CSV)'));
    await tester.pumpAndSettle();
    expect(find.text('Too many downloads. Please wait 15 minutes and try again.'), findsOneWidget);
  });
}
