import '../core/api/api_client.dart';
import '../core/format.dart';
import '../models/json.dart';

/// Nutrition: targets, food search, the daily food log and meal plans
/// (services/nutritionService.ts).
final _api = ApiClient.instance;
Map<String, Object> _tz() => {'tzOffset': tzOffset()};

class Macros {
  Macros(Json j)
      : calories = asDouble(j['calories']) ?? 0,
        protein = asDouble(j['protein']) ?? 0,
        carbs = asDouble(j['carbs']) ?? 0,
        fat = asDouble(j['fat']) ?? 0;
  final double calories;
  final double protein;
  final double carbs;
  final double fat;

  String get line => '${calories.round()} kcal · P ${protein.round()} g · C ${carbs.round()} g · F ${fat.round()} g';
}

class Targets extends Macros {
  Targets(super.j)
      : ageIsEstimate = asBool(j['ageIsEstimate']),
        diet = asString(j['diet']) ?? '',
        goal = asString(j['goal']) ?? '',
        notes = asStrings(j['notes']);
  final bool ageIsEstimate;
  final String diet;
  final String goal;
  final List<String> notes;
}

class Food extends Macros {
  Food(super.j)
      : slug = asString(j['slug']) ?? '',
        name = asString(j['name']) ?? '',
        servingLabel = asString(j['servingLabel']) ?? '',
        isCustom = asBool(j['isCustom']);
  final String slug;
  final String name;
  final String servingLabel;
  final bool isCustom;
}

class LogEntry extends Macros {
  LogEntry(super.j)
      : id = asString(j['id']) ?? '',
        name = asString(j['name']) ?? '',
        servings = asDouble(j['servings']) ?? 1;
  final String id;
  final String name;
  final double servings;
}

class DayLog {
  DayLog(Json j)
      : meals = asJson(j['meals']).map((meal, entries) => MapEntry(meal, asJsonList(entries).map(LogEntry.new).toList())),
        totals = Macros(asJson(j['totals'])),
        targets = Targets(asJson(j['targets']));
  final Map<String, List<LogEntry>> meals;
  final Macros totals;
  final Targets targets;
}

class MealPlanItem extends Macros {
  MealPlanItem(super.j)
      : foodSlug = asString(j['foodSlug']) ?? '',
        name = asString(j['name']) ?? '',
        servingLabel = asString(j['servingLabel']) ?? '',
        servings = asDouble(j['servings']) ?? 1;
  final String foodSlug;
  final String name;
  final String servingLabel;
  final double servings;
}

class MealPlanMeal {
  MealPlanMeal(Json j)
      : meal = asString(j['meal']) ?? '',
        items = asJsonList(j['items']).map(MealPlanItem.new).toList(),
        totals = Macros(asJson(j['totals']));
  final String meal;
  final List<MealPlanItem> items;
  final Macros totals;
}

class MealPlan {
  MealPlan(Json j)
      : meals = asJsonList(j['meals']).map(MealPlanMeal.new).toList(),
        totals = Macros(asJson(j['totals']));
  final List<MealPlanMeal> meals;
  final Macros totals;
}

class HistoryDay extends Macros {
  HistoryDay(super.j) : date = asString(j['date']) ?? '';
  final String date;
}

Future<DayLog> fetchDayLog(String date) async => DayLog(await _api.request('/nutrition/log', auth: true, query: {'date': date, ..._tz()}));

Future<List<Food>> searchFoods(String search) async =>
    asJsonList((await _api.request('/nutrition/foods', auth: true, query: {'search': search}))['foods']).map(Food.new).toList();

Future<Json> logFood(Json entry) => _api.request('/nutrition/log', method: 'POST', auth: true, query: _tz(), body: entry);

Future<Json> deleteLogEntry(String id) => _api.request('/nutrition/log/${Uri.encodeComponent(id)}', method: 'DELETE', auth: true);

Future<MealPlan> fetchMealPlan(String date) async => MealPlan(await _api.request('/nutrition/meal-plan', auth: true, query: {'date': date, ..._tz()}));

Future<List<HistoryDay>> fetchNutritionHistory([int days = 14]) async =>
    asJsonList((await _api.request('/nutrition/history', auth: true, query: {'days': days, ..._tz()}))['days']).map(HistoryDay.new).toList();

// ── Reading a meal from a photo or a description (nutritionService.ts) ──────

typedef Allowance = ({int used, int max, int left});

Allowance _allowance(Object? j) {
  final m = asJson(j);
  return (used: asInt(m['used']) ?? 0, max: asInt(m['max']) ?? 0, left: asInt(m['left']) ?? 0);
}

class MealReadingStatus {
  MealReadingStatus(Json j)
      : available = asBool(j['available']),
        photos = _allowance(asJson(j['allowance'])['photos']),
        texts = _allowance(asJson(j['allowance'])['texts']);
  MealReadingStatus.copy(MealReadingStatus s, {required this.photos, required this.texts}) : available = s.available;
  final bool available;
  final Allowance photos;
  final Allowance texts;
}

/// One food read from the meal: a list food with servings ([foodSlug]), or a
/// one-off with its own estimate for one serving.
class ReadItem extends Macros {
  ReadItem(super.j)
      : name = asString(j['name']) ?? 'Food',
        portion = asString(j['portion']) ?? '',
        grams = asInt(j['grams']) ?? 0,
        confidence = asString(j['confidence']) ?? 'medium',
        foodSlug = asString(j['foodSlug']),
        servings = asDouble(j['servings']) ?? 1;
  final String name;
  final String portion;
  final int grams;
  final String confidence;
  final String? foodSlug;
  final double servings;
}

class MealReading {
  MealReading(Json j)
      : items = asJsonList(j['items']).map(ReadItem.new).toList(),
        note = asString(j['note']),
        photos = _allowance(asJson(j['allowance'])['photos']),
        texts = _allowance(asJson(j['allowance'])['texts']);
  final List<ReadItem> items;
  final String? note;
  final Allowance photos;
  final Allowance texts;
}

Future<MealReadingStatus> fetchMealReadingStatus() async => MealReadingStatus(await _api.request('/nutrition/recognize', auth: true));

Future<MealReading> readMealPhoto(List<int> bytes, String filename, String contentType) async => MealReading(await _api.request(
      '/nutrition/recognize/photo',
      method: 'POST',
      auth: true,
      files: [UploadFile(field: 'photo', bytes: bytes, filename: filename, contentType: contentType)],
      timeout: const Duration(seconds: 90),
    ));

Future<MealReading> readMealText(String text) async =>
    MealReading(await _api.request('/nutrition/recognize/text', method: 'POST', auth: true, body: {'text': text}, timeout: const Duration(seconds: 60)));
