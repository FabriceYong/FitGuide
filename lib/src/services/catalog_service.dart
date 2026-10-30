import '../core/api/api_client.dart';
import '../core/storage.dart';
import '../models/catalog.dart';
import '../models/json.dart';

/// The workout catalog, reviews, the exercise library and article feeds
/// (services/workoutService.ts and contentService.ts on the website).
final _api = ApiClient.instance;

const _cacheKey = 'fitguide_catalog_v1';

class CatalogResult {
  CatalogResult(this.workouts, [this.savedAt]);
  final List<Workout> workouts;

  /// Set when the server was unreachable and this is the saved copy.
  final String? savedAt;
}

/// Whether an error means "couldn't reach the server" rather than a real answer.
bool _isUnreachable(Object err) => err is ApiError && (err.status == 0 || err.status >= 500);

List<Workout>? _readCache() {
  final cached = asJson(Storage.getJson(_cacheKey));
  final list = cached['workouts'];
  return list is List ? asJsonList(list).map(Workout.new).toList() : null;
}

String? _cacheDate() => asString(asJson(Storage.getJson(_cacheKey))['savedAt']);

/// All published workouts. The last catalog is kept on the device, so the
/// app still lists real workouts when the server can't be reached.
Future<CatalogResult> fetchWorkouts() async {
  try {
    final data = await _api.request('/workouts');
    final raw = asJsonList(data['workouts']);
    Storage.setJson(_cacheKey, {'savedAt': DateTime.now().toIso8601String(), 'workouts': raw});
    return CatalogResult(raw.map(Workout.new).toList());
  } catch (err) {
    final cached = _isUnreachable(err) ? _readCache() : null;
    if (cached == null) rethrow;
    return CatalogResult(cached, _cacheDate());
  }
}

/// One workout, or null when it doesn't exist. Offline, it's looked up in
/// the saved catalog.
Future<Workout?> fetchWorkoutBySlug(String slug, {bool auth = false}) async {
  try {
    final data = await _api.request('/workouts/${Uri.encodeComponent(slug)}', auth: auth && _api.hasSession);
    return Workout(asJson(data['workout']));
  } catch (err) {
    if (err is ApiError && err.status == 404) return null;
    final cached = _isUnreachable(err) ? _readCache()?.where((w) => w.slug == slug).firstOrNull : null;
    if (cached == null) rethrow;
    return cached;
  }
}

// ── Reviews ───────────────────────────────────────────────────────────────────
Future<List<Review>> fetchReviews([String? workoutSlug]) async =>
    asJsonList((await _api.request('/reviews', query: {'workoutId': workoutSlug}))['reviews']).map(Review.new).toList();

Future<int> likeReview(String id) async =>
    asInt((await _api.request('/reviews/${Uri.encodeComponent(id)}/like', method: 'POST', auth: true))['likes']) ?? 0;

class PickedImage {
  PickedImage(this.bytes, this.filename, this.contentType);
  final List<int> bytes;
  final String filename;
  final String contentType;
}

Future<Review> postReview({
  required int rating,
  required String comment,
  String? workoutSlug,
  String? workoutTitle,
  PickedImage? beforeImage,
  PickedImage? afterImage,
}) async {
  final fields = {
    'rating': '$rating',
    'comment': comment,
    if (workoutSlug != null && workoutSlug.isNotEmpty) 'workoutId': workoutSlug,
    if (workoutSlug != null && workoutSlug.isNotEmpty && workoutTitle != null) 'workoutRegiment': workoutTitle,
  };
  final files = [
    if (beforeImage != null) UploadFile(field: 'beforeImage', bytes: beforeImage.bytes, filename: beforeImage.filename, contentType: beforeImage.contentType),
    if (afterImage != null) UploadFile(field: 'afterImage', bytes: afterImage.bytes, filename: afterImage.filename, contentType: afterImage.contentType),
  ];
  final data = await _api.request('/reviews', method: 'POST', auth: true, fields: fields, files: files);
  return Review(asJson(data['review']));
}

// ── Exercise library ──────────────────────────────────────────────────────────
Future<List<Exercise>> fetchExercises() async => asJsonList((await _api.request('/exercises'))['exercises']).map(Exercise.new).toList();

// ── Articles (RSS feeds proxied by the API) ───────────────────────────────────
Future<List<FeedArticle>> fetchFeedArticles(String feed, {int count = 3}) async =>
    asJsonList((await _api.request('/articles', query: {'feed': feed, 'count': count}))['articles']).map(FeedArticle.new).toList();

// ── Favorites (signed-in accounts only) ───────────────────────────────────────
Future<List<Workout>> getFavorites() async {
  if (!_api.hasSession) return [];
  return asJsonList((await _api.request('/favorites', auth: true))['favorites']).map(Workout.new).toList();
}

Future<List<Workout>> addToFavorites(String slug) async =>
    asJsonList((await _api.request('/favorites/${Uri.encodeComponent(slug)}', method: 'POST', auth: true))['favorites']).map(Workout.new).toList();

Future<List<Workout>> removeFromFavorites(String slug) async =>
    asJsonList((await _api.request('/favorites/${Uri.encodeComponent(slug)}', method: 'DELETE', auth: true))['favorites']).map(Workout.new).toList();

Future<bool> checkIsFavorite(String slug) async {
  if (!_api.hasSession) return false;
  try {
    return asBool((await _api.request('/favorites/check/${Uri.encodeComponent(slug)}', auth: true))['isFavorite']);
  } catch (_) {
    return false;
  }
}

// ── Demo pictures for the workout player ────────────────────────────────────

const _demoMediaKey = 'fitguide_demo_media_v1';
Future<Map<String, DemoMedia>>? _demoMedia;

/// Freely licensed pictures for the player's demos, by demo name. Kept on the
/// device so the player still has them offline; empty if never loaded.
Future<Map<String, DemoMedia>> demoMedia() => _demoMedia ??= () async {
      List<Json> rows;
      try {
        rows = asJsonList((await _api.request('/exercise-media/demos'))['demos']);
        await Storage.setJson(_demoMediaKey, rows);
      } catch (_) {
        rows = asJsonList(Storage.getJson(_demoMediaKey));
        _demoMedia = null; // ask the server again next time
      }
      return {
        for (final r in rows)
          if (r['media'] != null && asString(r['name']) != null) asString(r['name'])!: DemoMedia.fromJson(asJson(r['media'])),
      };
    }();
