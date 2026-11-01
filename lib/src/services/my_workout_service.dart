import '../core/api/api_client.dart';
import '../models/catalog.dart';
import '../models/json.dart';

/// A member's own workouts, made in the workout builder
/// (services/myWorkoutService.ts; the API's services/myWorkouts.js).
final _api = ApiClient.instance;

class BuilderExercise {
  const BuilderExercise({this.name = '', this.sets = 3, this.reps = '10', this.seconds, this.weighted = false, this.supersetNext = false});
  BuilderExercise.fromJson(Json j)
      : name = asString(j['name']) ?? '',
        sets = asInt(j['sets']) ?? 3,
        reps = asString(j['reps']),
        seconds = asInt(j['seconds']),
        weighted = asBool(j['weighted']),
        supersetNext = asBool(j['supersetNext']);

  final String name;
  final int sets;

  /// "10" or a range "8-10"; null when counted in [seconds].
  final String? reps;
  final int? seconds;

  /// Log a weight for each set.
  final bool weighted;

  /// Straight on to the next exercise, resting after both (a superset).
  final bool supersetNext;

  bool get timed => seconds != null;

  BuilderExercise copyWith({String? name, int? sets, String? Function()? reps, int? Function()? seconds, bool? weighted, bool? supersetNext}) => BuilderExercise(
        name: name ?? this.name,
        sets: sets ?? this.sets,
        reps: reps != null ? reps() : this.reps,
        seconds: seconds != null ? seconds() : this.seconds,
        weighted: weighted ?? this.weighted,
        supersetNext: supersetNext ?? this.supersetNext,
      );

  Json toJson() => {'name': name.trim(), 'sets': sets, 'reps': reps, 'seconds': seconds, 'weighted': weighted, 'supersetNext': supersetNext};
}

class BuilderAnswers {
  const BuilderAnswers({this.title = '', this.category = 'Strength', this.restSec = 90, this.exercises = const [BuilderExercise()]});
  BuilderAnswers.fromJson(Json j)
      : title = asString(j['title']) ?? '',
        category = asString(j['category']) ?? 'Strength',
        restSec = asInt(j['restSec']) ?? 90,
        exercises = asJsonList(j['exercises']).map(BuilderExercise.fromJson).toList();

  final String title;
  final String category;
  final int restSec;
  final List<BuilderExercise> exercises;

  BuilderAnswers copyWith({String? title, String? category, int? restSec, List<BuilderExercise>? exercises}) => BuilderAnswers(
        title: title ?? this.title,
        category: category ?? this.category,
        restSec: restSec ?? this.restSec,
        exercises: exercises ?? this.exercises,
      );

  Json toJson() => {
        'title': title.trim(),
        'category': category,
        'restSec': restSec,
        // The last exercise has nothing to pair with.
        'exercises': [for (final (i, e) in exercises.indexed) {...e.toJson(), 'supersetNext': e.supersetNext && i < exercises.length - 1}],
      };
}

/// One of your workouts: the workout itself and the builder's answers.
class MyWorkout {
  MyWorkout(Json j)
      : workout = Workout(j),
        answers = BuilderAnswers.fromJson(asJson(j['builtFrom']));
  final Workout workout;
  final BuilderAnswers answers;
}

Future<List<MyWorkout>> fetchMyWorkouts() async => asJsonList((await _api.request('/my-workouts', auth: true))['workouts']).map(MyWorkout.new).toList();

/// Null when there's no such workout of yours.
Future<MyWorkout?> fetchMyWorkout(String slug) async {
  try {
    return MyWorkout(asJson((await _api.request('/my-workouts/${Uri.encodeComponent(slug)}', auth: true))['workout']));
  } on ApiError catch (err) {
    if (err.status == 404) return null;
    rethrow;
  }
}

/// Create a workout, or change the one with [slug].
Future<MyWorkout> saveMyWorkout(BuilderAnswers answers, {String? slug}) async => MyWorkout(asJson((await _api.request(
      slug == null ? '/my-workouts' : '/my-workouts/${Uri.encodeComponent(slug)}',
      method: slug == null ? 'POST' : 'PUT',
      auth: true,
      body: answers.toJson(),
    ))['workout']));

Future<void> deleteMyWorkout(String slug) => _api.request('/my-workouts/${Uri.encodeComponent(slug)}', method: 'DELETE', auth: true);

/// Your own workouts' slugs start with "my-" (they aren't in the catalog).
bool isOwnWorkout(String slug) => slug.startsWith('my-');
