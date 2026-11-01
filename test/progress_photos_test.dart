import 'dart:convert';

import 'package:fitguide/src/core/api/api_client.dart';
import 'package:fitguide/src/features/progress/progress_photos.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

final _png = base64Decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

/// Private progress photos: loaded with the session, compared, deleted.
void main() {
  final sent = <http.Request>[];

  setUp(() async {
    await setUpApp();
    sent.clear();
    ApiClient.instance.useForTesting(MockClient((request) async {
      sent.add(request);
      if (request.method == 'DELETE') return http.Response(jsonEncode({'success': true}), 200);
      if (request.url.path.endsWith('/image')) return http.Response.bytes(_png, 200, headers: {'content-type': 'image/png'});
      return http.Response(jsonEncode({
        'photos': [
          {'id': 'p1', 'date': '2026-09-01', 'note': 'Start', 'url': '/progress-photos/p1/image'},
          {'id': 'p2', 'date': '2026-11-01', 'note': '', 'url': '/progress-photos/p2/image'},
        ],
      }), 200);
    }));
  });
  tearDown(() => ApiClient.instance.useForTesting(http.Client(), signedIn: false));

  testWidgets('shows the first and latest side by side, and deletes', (tester) async {
    await pumpApp(tester, const SingleChildScrollView(child: ProgressPhotos()));
    await tester.pumpAndSettle();

    expect(find.bySemanticsLabel('Before'), findsOneWidget);
    expect(find.bySemanticsLabel('After'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp(r'Progress photo, .*: Start'), skipOffstage: false), findsNWidgets(2));
    // Each image is fetched once, with the session.
    expect(sent.where((r) => r.url.path.endsWith('/image')).length, 2);

    await tester.tap(find.byTooltip(RegExp(r'^Delete the photo from ')).first);
    await tester.pumpAndSettle();
    expect(sent.last.method, 'DELETE');
    expect(sent.last.url.path, endsWith('/progress-photos/p1'));
    expect(find.bySemanticsLabel('Before'), findsNothing);
  });
}
