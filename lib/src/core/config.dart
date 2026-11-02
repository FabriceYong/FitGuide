import 'package:flutter/foundation.dart';

/// Where the app finds the FitGuide API and the website.
///
/// Set them at build time:
///   flutter run --dart-define=API_URL=https://api.example.com/api --dart-define=WEB_URL=https://app.example.com
/// Without API_URL, debug builds use the local API (10.0.2.2 is the host
/// machine from the Android emulator).
class AppConfig {
  static const _apiUrl = String.fromEnvironment('API_URL');
  static const _webUrl = String.fromEnvironment('WEB_URL');

  static String get apiBase {
    final url = _apiUrl.isNotEmpty ? _apiUrl : '${_localHost()}:5001/api';
    return url.replaceAll(RegExp(r'/+$'), '');
  }

  /// The API server without /api, for files under /uploads.
  static String get apiOrigin => apiBase.replaceAll(RegExp(r'/api$'), '');

  /// The website, for pages that only exist there (admin, creator studio).
  static String get webBase {
    final url = _webUrl.isNotEmpty ? _webUrl : '${_localHost()}:3000';
    return url.replaceAll(RegExp(r'/+$'), '');
  }

  /// Map tiles for the gym finder: standard OpenStreetMap ones unless
  /// MAP_TILES_URL names another provider (OSM asks heavy users to bring their own).
  static const mapTilesUrl = String.fromEnvironment('MAP_TILES_URL', defaultValue: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');

  static String _localHost() {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2';
    return 'http://localhost';
  }
}
