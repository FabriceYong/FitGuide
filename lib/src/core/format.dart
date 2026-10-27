import '../models/json.dart';
import '../models/training.dart';

/// Display helpers shared by the screens (features/progress/format.ts and
/// friends on the website).

const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const _weekdaysLong = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const _monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

String _two(int n) => n.toString().padLeft(2, '0');

/// The user's local date as YYYY-MM-DD.
String ymd(DateTime d) => '${d.year}-${_two(d.month)}-${_two(d.day)}';
String localToday() => ymd(DateTime.now());

/// 'YYYY-MM-DD' at local noon (safe against DST edges).
DateTime parseYmd(String value) {
  final parts = value.split('-').map(int.tryParse).toList();
  if (parts.length < 3 || parts.contains(null)) return DateTime.tryParse(value) ?? DateTime.now();
  return DateTime(parts[0]!, parts[1]!, parts[2]!, 12);
}

String shiftDate(String value, int days) => ymd(parseYmd(value).add(Duration(days: days)));

/// Minutes to add to local time to get UTC, as JavaScript's getTimezoneOffset().
int tzOffset() => -DateTime.now().timeZoneOffset.inMinutes;

/// "Wed 14 Oct".
String formatDay(String ymdValue) {
  final d = parseYmd(ymdValue);
  return '${_weekdays[d.weekday - 1]} ${d.day} ${_months[d.month - 1]}';
}

String formatWeekday(String ymdValue) => _weekdays[parseYmd(ymdValue).weekday - 1];

/// "14 Oct".
String formatDayMonth(String ymdValue) {
  final d = parseYmd(ymdValue);
  return '${d.day} ${_months[d.month - 1]}';
}

/// "Wednesday 14 October".
String formatDayLong(String ymdValue) {
  final d = parseYmd(ymdValue);
  return '${_weekdaysLong[d.weekday - 1]} ${d.day} ${_monthsLong[d.month - 1]}';
}

/// "Wed 14 Oct, 18:30".
String formatDateTime(String iso) {
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return iso;
  return '${_weekdays[d.weekday - 1]} ${d.day} ${_months[d.month - 1]}, ${_two(d.hour)}:${_two(d.minute)}';
}

/// "14 Oct 2026".
String formatDate(String iso) {
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return iso;
  return '${_months[d.month - 1]} ${d.day}, ${d.year}';
}

/// "14/10/2026".
String formatShortDate(String iso) {
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return iso;
  return '${d.day}/${d.month}/${d.year}';
}

String formatSeconds(int total) {
  final m = total ~/ 60;
  final s = total % 60;
  if (m == 0) return '${s}s';
  return s != 0 ? '${m}m ${s}s' : '$m min';
}

/// mm:ss
String clock(int seconds) => '${_two(seconds ~/ 60)}:${_two(seconds % 60)}';

String formatRecord(PersonalRecord r) {
  if (r.unit == 'kg') return '${numText(r.value)} kg${r.reps != null && r.reps! > 0 ? ' × ${r.reps}' : ''}';
  if (r.unit == 'sec') return formatSeconds(r.value.round());
  if (r.unit == 'm') return r.value >= 1000 ? '${(r.value / 1000).toStringAsFixed(2)} km' : '${numText(r.value)} m';
  return '${numText(r.value)} reps';
}

/// 15160 → "15,160".
String thousands(num n) {
  final negative = n < 0;
  final digits = n.abs().round().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
    buffer.write(digits[i]);
  }
  return '${negative ? '-' : ''}$buffer';
}

String plural(int n, String one, [String? many]) => n == 1 ? one : (many ?? '${one}s');
