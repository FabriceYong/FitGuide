import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Device storage for non-secret state (the website's localStorage).
/// Tokens live in secure storage instead (see ApiClient).
class Storage {
  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static String? getString(String key) => _prefs?.getString(key);

  static Future<void> setString(String key, String? value) async {
    if (value == null) {
      await _prefs?.remove(key);
    } else {
      await _prefs?.setString(key, value);
    }
  }

  static Object? getJson(String key) {
    final raw = getString(key);
    if (raw == null) return null;
    try {
      return jsonDecode(raw);
    } catch (_) {
      return null;
    }
  }

  static Future<void> setJson(String key, Object? value) => setString(key, value == null ? null : jsonEncode(value));

  static Future<void> remove(String key) async => _prefs?.remove(key);

  static bool has(String key) => _prefs?.containsKey(key) ?? false;
}
