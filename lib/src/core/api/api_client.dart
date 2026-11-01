import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../config.dart';

/// An error from the API, or status 0 when the server couldn't be reached.
class ApiError implements Exception {
  ApiError(this.message, this.status, [this.data]);

  final String message;
  final int status;
  final Map<String, dynamic>? data;

  String? get code => data?['code'] as String?;

  @override
  String toString() => message;
}

/// A file to send in a multipart request.
class UploadFile {
  UploadFile({required this.field, required this.bytes, required this.filename, this.contentType});

  final String field;
  final List<int> bytes;
  final String filename;
  final String? contentType;
}

/// Turn a stored asset path ("/uploads/avatars/x.png") into a full URL.
String? assetUrl(String? path) {
  if (path == null || path.isEmpty) return null;
  if (RegExp(r'^(https?:|blob:|data:)').hasMatch(path)) return path;
  return '${AppConfig.apiOrigin}${path.startsWith('/') ? '' : '/'}$path';
}

/// Single client for the FitGuide API, like the website's lib/api.js.
///
/// The website keeps its session in httpOnly cookies. The app asks for bearer
/// tokens instead ("X-Auth-Transport: bearer"): a short-lived access token
/// sent as "Authorization: Bearer", and a refresh token swapped for new ones
/// on a 401. Both are kept in the platform's secure storage.
class ApiClient {
  ApiClient._();

  static final ApiClient instance = ApiClient._();

  static const _accessKey = 'fitguide_access_token';
  static const _refreshKey = 'fitguide_refresh_token';
  // Calls that start or end a session; a 401 from them is final.
  static const _noRefreshPaths = {'/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'};

  http.Client _http = http.Client();
  final FlutterSecureStorage _secure = const FlutterSecureStorage();
  String? _access;
  String? _refresh;
  Future<bool>? _refreshing;

  /// Called when the server says the session is gone (the site's UNAUTHORIZED_EVENT).
  void Function()? onUnauthorized;

  bool get hasSession => _refresh != null;

  /// Answer requests with [client] (a MockClient), signed in or not (tests).
  @visibleForTesting
  void useForTesting(http.Client client, {bool signedIn = true}) {
    _http = client;
    _access = signedIn ? 'test-access' : null;
    _refresh = signedIn ? 'test-refresh' : null;
  }
  String? get refreshToken => _refresh;

  Future<void> init() async {
    try {
      _access = await _secure.read(key: _accessKey);
      _refresh = await _secure.read(key: _refreshKey);
    } catch (_) {
      _access = null;
      _refresh = null;
    }
  }

  /// Keep the tokens from a login, register or refresh response.
  Future<void> saveSession(Map<String, dynamic> data) async {
    final token = data['token'];
    final refresh = data['refreshToken'];
    if (token is String) _access = token;
    if (refresh is String) _refresh = refresh;
    try {
      await _secure.write(key: _accessKey, value: _access);
      await _secure.write(key: _refreshKey, value: _refresh);
    } catch (_) {
      // Storage unavailable: the session just won't survive a restart.
    }
  }

  Future<void> clearSession() async {
    _access = null;
    _refresh = null;
    try {
      await _secure.delete(key: _accessKey);
      await _secure.delete(key: _refreshKey);
    } catch (_) {}
  }

  /// Swap the refresh token for new tokens. One refresh at a time.
  Future<bool> refreshSession() {
    return _refreshing ??= () async {
      try {
        final response = await _http
            .post(
              Uri.parse('${AppConfig.apiBase}/auth/refresh'),
              headers: {'Content-Type': 'application/json', 'X-Auth-Transport': 'bearer'},
              body: jsonEncode({'refreshToken': _refresh}),
            )
            .timeout(const Duration(seconds: 20));
        if (response.statusCode != 200) return false;
        await saveSession(jsonDecode(response.body) as Map<String, dynamic>);
        return true;
      } catch (_) {
        return false;
      } finally {
        _refreshing = null;
      }
    }();
  }

  /// Call the API.
  ///
  /// [auth]: needs a signed-in account. Fails fast without a session, and a
  /// 401 signs the user out. Throws [ApiError] on failure.
  Future<Map<String, dynamic>> request(
    String path, {
    String method = 'GET',
    Object? body,
    Map<String, Object?>? query,
    bool auth = false,
    List<UploadFile>? files,
    Map<String, String>? fields,
    Duration timeout = const Duration(seconds: 30),
  }) async {
    final response = await _call(path, method: method, body: body, query: query, auth: auth, files: files, fields: fields, timeout: timeout);
    return _json(response) ?? <String, dynamic>{};
  }

  /// A file the API sends (a data export), as bytes. Needs a signed-in account.
  Future<Uint8List> download(String path, {Duration timeout = const Duration(seconds: 60)}) async =>
      (await _call(path, auth: true, timeout: timeout)).bodyBytes;

  static Map<String, dynamic>? _json(http.Response response) {
    try {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (_) {
      // non-JSON response
    }
    return null;
  }

  Future<http.Response> _call(
    String path, {
    String method = 'GET',
    Object? body,
    Map<String, Object?>? query,
    bool auth = false,
    List<UploadFile>? files,
    Map<String, String>? fields,
    required Duration timeout,
  }) async {
    final params = <String, String>{};
    query?.forEach((key, value) {
      if (value != null && value != '') params[key] = '$value';
    });
    final uri = Uri.parse('${AppConfig.apiBase}$path').replace(queryParameters: params.isEmpty ? null : params);

    if (auth && !hasSession) throw ApiError('Please sign in to continue.', 401);

    Future<http.Response> send() async {
      final headers = <String, String>{'X-Auth-Transport': 'bearer'};
      if (_access != null) headers['Authorization'] = 'Bearer $_access';
      if (files != null || fields != null) {
        final multipart = http.MultipartRequest(method, uri)..headers.addAll(headers);
        if (fields != null) multipart.fields.addAll(fields);
        for (final f in files ?? const <UploadFile>[]) {
          multipart.files.add(http.MultipartFile.fromBytes(f.field, f.bytes, filename: f.filename, contentType: _mediaType(f.contentType)));
        }
        return http.Response.fromStream(await _http.send(multipart).timeout(timeout));
      }
      final request = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) {
        request.headers['Content-Type'] = 'application/json';
        request.body = jsonEncode(body);
      }
      return http.Response.fromStream(await _http.send(request).timeout(timeout));
    }

    http.Response response;
    try {
      response = await send();
      // Access tokens are short-lived: on a 401, refresh once and retry.
      if (response.statusCode == 401 && hasSession && !_noRefreshPaths.contains(path) && await refreshSession()) {
        response = await send();
      }
    } catch (_) {
      throw ApiError('Could not reach the FitGuide server. Check your connection and try again.', 0);
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final data = _json(response);
      if (response.statusCode == 401 && auth) onUnauthorized?.call();
      final errors = data?['errors'];
      final validation = errors is List ? errors.map((e) => e is Map ? e['msg'] : '$e').join('. ') : null;
      throw ApiError(
        (validation != null && validation.isNotEmpty) ? validation : (data?['message'] as String? ?? 'Request failed (HTTP ${response.statusCode}).'),
        response.statusCode,
        data,
      );
    }
    return response;
  }

  static MediaType? _mediaType(String? type) => type == null ? null : MediaType.parse(type);
}
