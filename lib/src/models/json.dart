/// Small helpers for reading loosely typed JSON from the API.
library;

typedef Json = Map<String, dynamic>;

int? asInt(Object? v) => v is num ? v.toInt() : (v is String ? int.tryParse(v) : null);
double? asDouble(Object? v) => v is num ? v.toDouble() : (v is String ? double.tryParse(v) : null);
String? asString(Object? v) => v is String ? v : (v == null ? null : '$v');
bool asBool(Object? v) => v == true;
List<String> asStrings(Object? v) => v is List ? v.whereType<Object>().map((e) => '$e').toList() : const [];
Json asJson(Object? v) => v is Map<String, dynamic> ? v : (v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{});
List<Json> asJsonList(Object? v) => v is List ? v.map(asJson).toList() : const [];

/// "12.0" → "12", 12.5 → "12.5", the way JavaScript prints numbers.
String numText(num? n) {
  if (n == null) return '';
  if (n == n.roundToDouble()) return n.toInt().toString();
  return n.toString();
}
