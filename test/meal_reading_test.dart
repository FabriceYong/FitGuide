import 'package:fitguide/src/services/nutrition_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('reads a meal reading from the API', () {
    final reading = MealReading({
      'items': [
        {'name': 'Grilled chicken breast', 'portion': '1 breast', 'grams': 150, 'confidence': 'high', 'foodSlug': 'chicken-breast', 'servings': 1.5, 'calories': 248, 'protein': 46.5, 'carbs': 0, 'fat': 5.4},
        {'name': 'Peri-peri sauce', 'portion': '2 tbsp', 'grams': 30, 'confidence': 'low', 'foodSlug': null, 'servings': 1, 'calories': 45, 'protein': 0.4, 'carbs': 3.2, 'fat': 3.6},
      ],
      'note': 'Oil not visible',
      'allowance': {
        'photos': {'used': 1, 'max': 3, 'left': 2},
        'texts': {'used': 0, 'max': 10, 'left': 10},
      },
    });
    expect(reading.items, hasLength(2));
    expect(reading.items.first.foodSlug, 'chicken-breast');
    expect(reading.items.first.servings, 1.5);
    expect(reading.items.last.foodSlug, isNull);
    expect(reading.items.last.confidence, 'low');
    expect(reading.note, 'Oil not visible');
    expect(reading.photos, (used: 1, max: 3, left: 2));
    expect(reading.texts.left, 10);
  });
}
