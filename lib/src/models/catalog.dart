import 'json.dart';

/// Catalog data as the API sends it (fitguide_nextjs/src/types/catalog.ts).
class WorkoutStep {
  WorkoutStep({
    required this.stepNumber,
    required this.instruction,
    this.duration,
    this.exerciseName,
    this.exerciseSlug,
    this.gifUrl,
    this.imageUrl,
    this.formCues = const [],
    this.breathingPattern,
    this.commonMistakes = const [],
  });

  factory WorkoutStep.fromJson(Json j, int index) => WorkoutStep(
        stepNumber: asInt(j['stepNumber']) ?? index + 1,
        instruction: asString(j['instruction']) ?? '',
        duration: asInt(j['duration']),
        exerciseName: asString(j['exerciseName']),
        exerciseSlug: asString(j['exerciseSlug']),
        gifUrl: asString(j['gifUrl']),
        imageUrl: asString(j['imageUrl']),
        formCues: asStrings(j['formCues']),
        breathingPattern: asString(j['breathingPattern']),
        commonMistakes: asStrings(j['commonMistakes']),
      );

  final int stepNumber;
  final String instruction;
  final int? duration;
  final String? exerciseName;
  final String? exerciseSlug;
  final String? gifUrl;
  final String? imageUrl;
  final List<String> formCues;
  final String? breathingPattern;
  final List<String> commonMistakes;
}

class Workout {
  Workout(this.raw)
      : slug = asString(raw['slug']) ?? asString(raw['id']) ?? '',
        title = asString(raw['title']) ?? '',
        description = asString(raw['description']) ?? '',
        shortDescription = asString(raw['shortDescription']),
        category = asString(raw['category']) ?? '',
        difficulty = asString(raw['difficulty']) ?? 'All Levels',
        duration = asInt(raw['duration']) ?? 0,
        calories = asInt(raw['calories']),
        intensity = asString(raw['intensity']) ?? '',
        equipment = asStrings(raw['equipment']),
        targetMuscles = asStrings(raw['targetMuscles']),
        benefits = asStrings(raw['benefits']),
        steps = [for (final (i, s) in asJsonList(raw['steps']).indexed) WorkoutStep.fromJson(s, i)],
        thumbnailUrl = asString(raw['thumbnailUrl']),
        tags = asStrings(raw['tags']),
        cautions = asStrings(raw['cautions']),
        prerequisites = asStrings(raw['prerequisites']),
        isPremium = asBool(raw['isPremium']),
        locked = asBool(raw['locked']),
        restPeriod = asInt(raw['restPeriod']),
        averageRating = asDouble(raw['averageRating']) ?? 0,
        totalReviews = asInt(raw['totalReviews']) ?? 0;

  final Json raw;
  final String slug;
  final String title;
  final String description;
  final String? shortDescription;
  final String category;
  final String difficulty;
  final int duration;
  final int? calories;
  final String intensity;
  final List<String> equipment;
  final List<String> targetMuscles;
  final List<String> benefits;
  final List<WorkoutStep> steps;
  final String? thumbnailUrl;
  final List<String> tags;
  final List<String> cautions;
  final List<String> prerequisites;
  final bool isPremium;
  final bool locked;
  final int? restPeriod;
  final double averageRating;
  final int totalReviews;

  Json toJson() => raw;
}

class Exercise {
  Exercise(Json j)
      : slug = asString(j['slug']) ?? '',
        name = asString(j['name']) ?? '',
        aliases = asStrings(j['aliases']),
        category = asString(j['category']) ?? 'Strength',
        trackingType = asString(j['trackingType']) ?? 'reps',
        primaryMuscles = asStrings(j['primaryMuscles']),
        equipment = asStrings(j['equipment']),
        instructions = asStrings(j['instructions']),
        formCues = asStrings(j['formCues']),
        commonMistakes = asStrings(j['commonMistakes']);

  final String slug;
  final String name;
  final List<String> aliases;
  final String category;
  final String trackingType;
  final List<String> primaryMuscles;
  final List<String> equipment;
  final List<String> instructions;
  final List<String> formCues;
  final List<String> commonMistakes;
}

class ProgramSummary {
  ProgramSummary(Json j)
      : slug = asString(j['slug']) ?? '',
        title = asString(j['title']) ?? '',
        description = asString(j['description']) ?? '',
        level = asString(j['level']) ?? '',
        goal = asString(j['goal']) ?? '',
        weeks = asInt(j['weeks']) ?? 0,
        daysPerWeek = asInt(j['daysPerWeek']) ?? 0,
        averageMinutes = asInt(j['averageMinutes']),
        isPremium = asBool(j['isPremium']);

  final String slug;
  final String title;
  final String description;
  final String level;
  final String goal;
  final int weeks;
  final int daysPerWeek;
  final int? averageMinutes;
  final bool isPremium;
}

class ProgramDay {
  ProgramDay(Json j)
      : week = asInt(j['week']) ?? 1,
        day = asInt(j['day']) ?? 1,
        title = asString(j['title']) ?? '',
        workoutSlug = asString(j['workoutSlug']) ?? '',
        notes = asString(j['notes']);

  final int week;
  final int day;
  final String title;
  final String workoutSlug;
  final String? notes;
}

/// GET /programs/:slug: the program with its days, and the workouts it uses.
class ProgramDetail extends ProgramSummary {
  ProgramDetail(super.j, Json workouts)
      : days = asJsonList(j['days']).map(ProgramDay.new).toList(),
        createdBy = asString(j['createdBy']),
        coachId = asString(j['coachId']),
        inPerson = asBool(j['inPerson']),
        workouts = workouts.map((slug, w) => MapEntry(slug, Workout(asJson(w))));

  final List<ProgramDay> days;
  final String? createdBy;

  /// The coach who wrote it, once they have a coach profile (GET /coaches/:id).
  final String? coachId;

  /// Trained in person: members contact the coach to request a spot.
  final bool inPerson;
  final Map<String, Workout> workouts;
}

class Review {
  Review(Json j)
      : id = asString(j['id']) ?? '',
        userId = asString(j['userId']),
        name = asString(j['name']) ?? '',
        userAvatar = asString(j['userAvatar']),
        rating = asInt(j['rating']) ?? 0,
        comment = asString(j['comment']) ?? '',
        workoutRegiment = asString(j['workoutRegiment']),
        workoutId = asString(j['workoutId']),
        beforeImage = asString(j['beforeImage']),
        afterImage = asString(j['afterImage']),
        likes = asInt(j['likes']) ?? 0,
        createdAt = asString(j['createdAt']) ?? '',
        verified = asBool(j['verified']);

  Review._copy(Review r, {required this.likes})
      : id = r.id,
        userId = r.userId,
        name = r.name,
        userAvatar = r.userAvatar,
        rating = r.rating,
        comment = r.comment,
        workoutRegiment = r.workoutRegiment,
        workoutId = r.workoutId,
        beforeImage = r.beforeImage,
        afterImage = r.afterImage,
        createdAt = r.createdAt,
        verified = r.verified;

  final String id;
  final String? userId;
  final String name;
  final String? userAvatar;
  final int rating;
  final String comment;
  final String? workoutRegiment;
  final String? workoutId;
  final String? beforeImage;
  final String? afterImage;
  final int likes;
  final String createdAt;
  final bool verified;

  Review withLikes(int likes) => Review._copy(this, likes: likes);
}

class FeedArticle {
  FeedArticle(Json j)
      : title = asString(j['title']) ?? '',
        link = asString(j['link']) ?? '',
        description = asString(j['description']) ?? '',
        pubDate = asString(j['pubDate']) ?? '',
        thumbnail = asString(j['thumbnail']) ?? '',
        author = asString(j['author']) ?? '';

  final String title;
  final String link;
  final String description;
  final String pubDate;
  final String thumbnail;
  final String author;
}

/// A freely licensed picture of a movement (one or more frames to flip
/// between), with where it comes from and its licence.
class DemoMedia {
  DemoMedia.fromJson(Json j)
      : frames = asStrings(j['frames']),
        source = asString(j['source']) ?? '',
        sourceUrl = asString(j['sourceUrl']),
        license = asString(j['license']) ?? '',
        author = asString(j['author']);

  final List<String> frames;
  final String source;
  final String? sourceUrl;
  final String license;
  final String? author;

  /// "© Everkinetic · CC BY-SA 3.0 · wger"
  String get credit => [if (author != null && author!.isNotEmpty) '© $author', license, source].where((s) => s.isNotEmpty).join(' · ');
}
