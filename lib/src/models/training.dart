import 'json.dart';

/// Training data (fitguide_nextjs/src/services/trainingService.ts and planService.ts).
class ActivityDay {
  ActivityDay(Json j)
      : date = asString(j['date']) ?? '',
        sessions = asInt(j['sessions']) ?? 0,
        minutes = asInt(j['minutes']) ?? 0,
        calories = asInt(j['calories']) ?? 0;

  final String date;
  final int sessions;
  final int minutes;
  final int calories;
}

class PersonalRecord {
  PersonalRecord(Json j)
      : exerciseSlug = asString(j['exerciseSlug']),
        exerciseName = asString(j['exerciseName']) ?? '',
        workoutTitle = asString(j['workoutTitle']) ?? '',
        achievedAt = asString(j['achievedAt']) ?? '',
        unit = asString(j['unit']) ?? 'reps',
        value = asDouble(j['value']) ?? 0,
        reps = asInt(j['reps']),
        estimatedOneRepMaxKg = asDouble(j['estimatedOneRepMaxKg']);

  final String? exerciseSlug;
  final String exerciseName;
  final String workoutTitle;
  final String achievedAt;
  final String unit;
  final double value;
  final int? reps;
  final double? estimatedOneRepMaxKg;
}

class SessionRecord {
  SessionRecord(Json j)
      : id = asString(j['id']) ?? '',
        workoutSlug = asString(j['workoutSlug']) ?? '',
        workoutTitle = asString(j['workoutTitle']) ?? '',
        completedAt = asString(j['completedAt']) ?? '',
        durationSec = asInt(j['durationSec']) ?? 0,
        calories = asInt(j['calories']),
        perceivedEffort = asInt(j['perceivedEffort']),
        status = asString(j['status']) ?? 'completed',
        enrollmentId = asString(j['enrollmentId']),
        programWeek = asInt(j['programWeek']),
        programDay = asInt(j['programDay']);

  final String id;
  final String workoutSlug;
  final String workoutTitle;
  final String completedAt;
  final int durationSec;
  final int? calories;
  final int? perceivedEffort;
  final String status;
  final String? enrollmentId;
  final int? programWeek;
  final int? programDay;
}

class PlanDay {
  PlanDay(Json j)
      : week = asInt(j['week']) ?? 1,
        day = asInt(j['day']) ?? 1,
        title = asString(j['title']) ?? '',
        workoutSlug = asString(j['workoutSlug']) ?? '',
        date = asString(j['date']) ?? '',
        status = asString(j['status']) ?? 'upcoming',
        sessionId = asString(j['sessionId']);

  final int week;
  final int day;
  final String title;
  final String workoutSlug;
  final String date;
  /// done | missed | today | upcoming
  final String status;
  final String? sessionId;
}

/// An enrollment in a program or personal plan, with its schedule.
class Plan {
  Plan(Json j)
      : id = asString(j['id']) ?? '',
        programSlug = asString(j['programSlug']) ?? '',
        programTitle = asString(j['programTitle']) ?? '',
        level = asString(j['level']),
        weeks = asInt(j['weeks']),
        startDate = asString(j['startDate']) ?? '',
        endDate = asString(j['endDate']) ?? '',
        status = asString(j['status']) ?? 'active',
        totalDays = asInt(j['totalDays']) ?? 0,
        completedCount = asInt(j['completedCount']) ?? 0,
        percentComplete = asInt(j['percentComplete']) ?? 0,
        adherencePct = asInt(j['adherencePct']),
        currentWeek = asInt(j['currentWeek']) ?? 1,
        nextDay = j['nextDay'] == null ? null : PlanDay(asJson(j['nextDay'])),
        schedule = asJsonList(j['schedule']).map(PlanDay.new).toList();

  static Plan? maybe(Object? j) => j == null ? null : Plan(asJson(j));

  final String id;
  final String programSlug;
  final String programTitle;
  final String? level;
  final int? weeks;
  final String startDate;
  final String endDate;
  final String status;
  final int totalDays;
  final int completedCount;
  final int percentComplete;
  final int? adherencePct;
  final int currentWeek;
  final PlanDay? nextDay;
  final List<PlanDay> schedule;

  /// Personal plans are enrollments in generated "plan-…" programs.
  bool get isPersonalPlan => programSlug.startsWith('plan-');
}

class WeightPoint {
  WeightPoint(Json j) : date = asString(j['date']) ?? '', weightKg = asDouble(j['weightKg']) ?? 0;
  final String date;
  final double weightKg;
}

class BodySummary {
  BodySummary(Json j)
      : latestWeight = j['latestWeight'] == null ? null : WeightPoint(asJson(j['latestWeight'])),
        weightChangeKg = asDouble(j['weightChangeKg']),
        weightChangeSince = asString(j['weightChangeSince']),
        weights = asJsonList(j['weights']).map(WeightPoint.new).toList(),
        latestMeasurements = asJson(j['latestMeasurements']).map((k, v) => MapEntry(k, (value: asDouble(asJson(v)['value']) ?? 0, date: asString(asJson(v)['date']) ?? '')));

  final WeightPoint? latestWeight;
  final double? weightChangeKg;
  final String? weightChangeSince;
  final List<WeightPoint> weights;
  final Map<String, ({double value, String date})> latestMeasurements;
}

class ProgressSummary {
  ProgressSummary(Json j)
      : today = asString(j['today']) ?? '',
        totals = asJson(j['totals']),
        thisWeek = asJson(j['thisWeek']),
        streakCurrent = asInt(asJson(j['streak'])['current']) ?? 0,
        streakLongest = asInt(asJson(j['streak'])['longest']) ?? 0,
        trainedToday = asBool(asJson(j['streak'])['trainedToday']),
        days = asJsonList(j['days']).map(ActivityDay.new).toList(),
        personalRecords = asJsonList(j['personalRecords']).map(PersonalRecord.new).toList(),
        body = BodySummary(asJson(j['body'])),
        activeEnrollment = Plan.maybe(j['activeEnrollment']);

  final String today;
  final Json totals;
  final Json thisWeek;
  final int streakCurrent;
  final int streakLongest;
  final bool trainedToday;
  final List<ActivityDay> days;
  final List<PersonalRecord> personalRecords;
  final BodySummary body;
  final Plan? activeEnrollment;

  int total(String key) => asInt(totals[key]) ?? 0;
  int week(String key) => asInt(thisWeek[key]) ?? 0;
}

class BodyMetric {
  BodyMetric(this.raw) : id = asString(raw['id']) ?? '', date = asString(raw['date']) ?? '';
  final Json raw;
  final String id;
  final String date;
  double? value(String field) => asDouble(raw[field]);
}
