/// Values the API, the website and the app agree on (packages/shared/index.js).
library;

class Profile {
  static const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
  static const fitnessLevels = ['Beginner', 'Intermediate', 'Advanced'];
  static const activityStatuses = ['Active', 'Inactive', 'Moderately Active', 'Very Active'];
  static const goals = ['Vitality', 'Muscle', 'Weight', 'Flexibility'];
  static const diets = ['Keto Diet', 'Mediterranean Diet', 'Paleo Diet', 'Intermittent Fasting', 'Flexible Balanced Plan'];
  static const heightCm = [50, 250];
  static const weightKg = [30, 250];
  static const nameMax = 100;
  static const passwordMin = 6;
  static const minBirthYear = 1900;
  static const minAge = 13;
  static const workoutMinutes = [10, 120];
  static const daysPerWeek = [1, 7];

  static List<String> get focusAreas => focusAreaMuscles.keys.toList();
  static List<String> get equipmentKits => equipmentKitOptions.keys.toList();
  static List<String> get limitations => limitationLabels.keys.toList();
}

/// Focus areas offered to users, and the catalog target muscles each covers.
const focusAreaMuscles = <String, List<String>>{
  'Full Body': ['Full Body'],
  'Core': ['Core', 'Abs', 'Obliques', 'Lower Back'],
  'Glutes': ['Glutes', 'Hips', 'Posterior Chain'],
  'Legs': ['Legs', 'Quads', 'Hamstrings', 'Calves'],
  'Back': ['Back', 'Lower Back', 'Spine'],
  'Chest': ['Chest'],
  'Shoulders': ['Shoulders'],
  'Arms': ['Arms'],
};

class EquipmentKit {
  const EquipmentKit(this.label, this.items);
  final String label;
  final List<String> items;
}

/// What users say they have, as kits of catalog equipment. "none" means
/// bodyweight only; an empty list means the user hasn't said.
const equipmentKitOptions = <String, EquipmentKit>{
  'none': EquipmentKit('No equipment', []),
  'yoga-props': EquipmentKit('Yoga props (blocks, bolster, strap)', ['Blocks', 'Bolster', 'Strap']),
  'weights': EquipmentKit('Dumbbells or kettlebells', ['Dumbbells', 'Kettlebell', 'Light Weights', 'Medicine Ball']),
  'bands': EquipmentKit('Bands or suspension straps', ['Resistance Band', 'TRX Straps']),
  'gym': EquipmentKit('A gym', [
    'Barbell', 'Bench', 'Squat Rack', 'Leg Press', 'Pull-up Bar', 'Box', 'Battle Ropes', 'Dumbbells', 'Kettlebell',
    'Light Weights', 'Medicine Ball', 'Resistance Band', 'TRX Straps', 'Blocks', 'Strap',
  ]),
  'pool': EquipmentKit('A pool', ['Pool', 'Goggles']),
  'boxing': EquipmentKit('Boxing gloves and a bag', ['Boxing Gloves', 'Heavy Bag']),
};

const limitationLabels = <String, String>{
  'knees': 'Knees',
  'lower-back': 'Lower back',
  'shoulders': 'Shoulders',
  'wrists': 'Wrists',
  'low-impact': 'No jumping (low impact)',
};

class Catalog {
  static const workoutCategories = ['HIIT', 'Yoga', 'Strength', 'Cardio', 'Flexibility', 'Pilates', 'CrossFit', 'Dance', 'Martial Arts', 'Swimming'];
  static const difficulties = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
}

class Nutrition {
  static const meals = ['breakfast', 'lunch', 'dinner', 'snack'];
}
