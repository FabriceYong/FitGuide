import 'dart:math';

import 'api/api_client.dart';
import 'storage.dart';

/// First-party, cookie-free analytics sent to the FitGuide API, the same
/// events the website sends (lib/analytics.ts). The visitor id is random and
/// stays on this device.
const _visitorKey = 'fitguide_visitor';

String _visitorId() {
  var id = Storage.getString(_visitorKey);
  if (id == null) {
    final random = Random.secure();
    id = List.generate(16, (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
    Storage.setString(_visitorKey, id);
  }
  return id;
}

/// Record an event. [path] is the website path of the matching page.
void track(String name, {String path = '/', Map<String, Object>? props}) {
  ApiClient.instance
      .request('/events', method: 'POST', body: {
        'name': name,
        'path': path,
        'visitorId': _visitorId(),
        'device': 'mobile',
        if (props != null) 'props': props,
      })
      .catchError((_) => <String, dynamic>{});
}
