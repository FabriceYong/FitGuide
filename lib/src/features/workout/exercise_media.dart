import '../../core/storage.dart';
import '../../models/json.dart';
import '../../services/catalog_service.dart';

/// Demo media for a player step (features/workout/hooks/useExerciseGif.js):
/// the step's own GIF, else one the API finds by name, else a matching photo.
const _prefix = 'fitguide_media_cache_v1_';
const _ttl = Duration(days: 7);

const _curated = {
  'warmup': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop&q=80',
  'cooldown': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80',
  'stretching': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
  'tabata': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
  'hiit': 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=800&auto=format&fit=crop&q=80',
  'squat': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
  'pushup': 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&auto=format&fit=crop&q=80',
  'lunge': 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800&auto=format&fit=crop&q=80',
  'plank': 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=800&auto=format&fit=crop&q=80',
  'burpee': 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=800&auto=format&fit=crop&q=80',
  'yoga': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
  'cardio': 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800&auto=format&fit=crop&q=80',
  'strength': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80',
  'abs': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=80',
  'core': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=80',
};
const _default = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop&q=80';

final _memory = <String, String>{};
final _inflight = <String, Future<String>>{};

String _searchTerm(String instruction) {
  var cleaned = instruction
      .replaceFirst(
        RegExp(r'^(begin in|start in|inhale and|exhale and|return to|lower down|hold|come into|move into|transition to|step or jump|look forward and|cool down:|warm-up:|main workout:)\s*', caseSensitive: false),
        '',
      )
      .trim();
  final colon = cleaned.indexOf(':');
  if (colon > 3 && colon < 60) cleaned = cleaned.substring(0, colon).trim();
  final paren = RegExp(r'^(.+?)\s*\([^)]+\)').firstMatch(cleaned);
  if (paren != null) cleaned = paren.group(1)!.trim();
  final fragment = cleaned.split(RegExp('[,./]')).first.trim();
  if (fragment.length > 3 && fragment.length < 60) cleaned = fragment;
  return (cleaned.length > 60 ? cleaned.substring(0, 60) : cleaned).toLowerCase();
}

String curatedFallback(String instruction) {
  final text = instruction.toLowerCase();
  for (final entry in _curated.entries) {
    if (text.contains(entry.key)) return entry.value;
  }
  return _default;
}

String? _stored(String key) {
  final cached = asJson(Storage.getJson('$_prefix$key'));
  final url = asString(cached['url']);
  final at = asInt(cached['timestamp']);
  if (url == null || at == null) return null;
  if (DateTime.now().millisecondsSinceEpoch - at > _ttl.inMilliseconds) {
    Storage.remove('$_prefix$key');
    return null;
  }
  return url;
}

void _store(String key, String url) => Storage.setJson('$_prefix$key', {'url': url, 'timestamp': DateTime.now().millisecondsSinceEpoch});

/// The picture to show for a step, cached on the device for a week.
Future<String> exerciseMedia(String? preassigned, String instruction) async {
  if (preassigned != null && preassigned.isNotEmpty) return preassigned;
  final term = _searchTerm(instruction).isEmpty ? 'exercise' : _searchTerm(instruction);
  final remembered = _memory[term] ?? _stored(term);
  if (remembered != null) return _memory[term] = remembered;
  return _inflight[term] ??= () async {
    String url;
    try {
      url = await fetchExerciseGif(term) ?? curatedFallback(instruction);
    } catch (_) {
      url = curatedFallback(instruction);
    }
    _store(term, url);
    _memory[term] = url;
    _inflight.remove(term);
    return url;
  }();
}
