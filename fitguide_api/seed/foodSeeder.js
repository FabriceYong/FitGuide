/**
 * Starter food catalog. Values are per listed serving, rounded from USDA
 * FoodData Central entries for the common form of each food (cooked where
 * noted). `diets` lists the diets a food fits, used by meal plans and search.
 *
 * Categories: protein, legume, grain, fruit, vegetable, fat, dairy, snack.
 */
const ALL = ['mediterranean', 'flexible'];
const food = (slug, name, category, servingLabel, servingSize, servingUnit, calories, protein, carbs, fat, fiber, diets) => ({
  slug, name, category, servingLabel, servingSize, servingUnit, calories, protein, carbs, fat, fiber, diets,
});

module.exports = [
  // Protein
  food('egg', 'Egg', 'protein', '1 large egg', 50, 'g', 72, 6.3, 0.4, 4.8, 0, [...ALL, 'keto', 'paleo', 'vegetarian']),
  food('chicken-breast', 'Chicken breast, cooked', 'protein', '100 g', 100, 'g', 165, 31, 0, 3.6, 0, [...ALL, 'keto', 'paleo']),
  food('salmon', 'Salmon, cooked', 'protein', '100 g', 100, 'g', 208, 20, 0, 13, 0, [...ALL, 'keto', 'paleo']),
  food('tuna-canned', 'Tuna, canned in water', 'protein', '100 g', 100, 'g', 116, 26, 0, 0.8, 0, [...ALL, 'keto', 'paleo']),
  food('lean-beef', 'Lean ground beef (90%), cooked', 'protein', '100 g', 100, 'g', 217, 26, 0, 12, 0, ['flexible', 'keto', 'paleo']),
  food('turkey-breast', 'Turkey breast, cooked', 'protein', '100 g', 100, 'g', 135, 30, 0, 1, 0, [...ALL, 'keto', 'paleo']),
  food('shrimp', 'Shrimp, cooked', 'protein', '100 g', 100, 'g', 99, 24, 0.2, 0.3, 0, [...ALL, 'keto', 'paleo']),
  food('tofu', 'Tofu, firm', 'protein', '100 g', 100, 'g', 144, 17, 3, 9, 2, [...ALL, 'keto', 'vegetarian', 'vegan']),
  food('tempeh', 'Tempeh', 'protein', '100 g', 100, 'g', 192, 20, 8, 11, 0, [...ALL, 'vegetarian', 'vegan']),
  food('greek-yogurt', 'Greek yogurt, plain nonfat', 'dairy', '1 cup (170 g)', 170, 'g', 100, 17, 6, 0.7, 0, [...ALL, 'vegetarian']),
  food('cottage-cheese', 'Cottage cheese, low-fat', 'dairy', '½ cup (113 g)', 113, 'g', 81, 14, 3, 1.1, 0, [...ALL, 'keto', 'vegetarian']),
  food('whey-protein', 'Whey protein powder', 'protein', '1 scoop (30 g)', 30, 'g', 120, 24, 3, 1.5, 0, ['flexible', 'vegetarian']),

  // Legumes
  food('lentils', 'Lentils, cooked', 'legume', '100 g', 100, 'g', 116, 9, 20, 0.4, 7.9, [...ALL, 'vegetarian', 'vegan']),
  food('chickpeas', 'Chickpeas, cooked', 'legume', '100 g', 100, 'g', 164, 8.9, 27, 2.6, 7.6, [...ALL, 'vegetarian', 'vegan']),
  food('black-beans', 'Black beans, cooked', 'legume', '100 g', 100, 'g', 132, 8.9, 24, 0.5, 8.7, [...ALL, 'vegetarian', 'vegan']),
  food('hummus', 'Hummus', 'legume', '2 tbsp (30 g)', 30, 'g', 70, 2, 4, 5, 1.8, [...ALL, 'vegetarian', 'vegan']),

  // Grains and starches
  food('oats', 'Rolled oats, dry', 'grain', '½ cup (40 g)', 40, 'g', 152, 5.3, 27, 2.6, 4, [...ALL, 'vegetarian', 'vegan']),
  food('brown-rice', 'Brown rice, cooked', 'grain', '150 g', 150, 'g', 185, 4.1, 38, 1.5, 2.7, [...ALL, 'vegetarian', 'vegan']),
  food('white-rice', 'White rice, cooked', 'grain', '150 g', 150, 'g', 195, 4, 42, 0.4, 0.6, ['flexible', 'vegetarian', 'vegan']),
  food('quinoa', 'Quinoa, cooked', 'grain', '150 g', 150, 'g', 180, 6.6, 32, 2.9, 4.2, [...ALL, 'vegetarian', 'vegan']),
  food('wholewheat-bread', 'Whole-wheat bread', 'grain', '1 slice (32 g)', 32, 'g', 80, 4, 14, 1, 2, [...ALL, 'vegetarian', 'vegan']),
  food('wholewheat-pasta', 'Whole-wheat pasta, cooked', 'grain', '140 g', 140, 'g', 174, 7.5, 37, 0.8, 4.5, [...ALL, 'vegetarian', 'vegan']),
  food('sweet-potato', 'Sweet potato, baked', 'grain', '150 g', 150, 'g', 135, 3, 31, 0.2, 5, [...ALL, 'paleo', 'vegetarian', 'vegan']),
  food('potato', 'Potato, baked', 'grain', '150 g', 150, 'g', 140, 3.8, 32, 0.2, 3.3, ['flexible', 'vegetarian', 'vegan']),
  food('rice-cakes', 'Rice cakes', 'snack', '2 cakes (18 g)', 18, 'g', 70, 1.4, 15, 0.5, 0.7, ['flexible', 'vegetarian', 'vegan']),

  // Fruit
  food('banana', 'Banana', 'fruit', '1 medium (118 g)', 118, 'g', 105, 1.3, 27, 0.4, 3.1, [...ALL, 'paleo', 'vegetarian', 'vegan']),
  food('apple', 'Apple', 'fruit', '1 medium (182 g)', 182, 'g', 95, 0.5, 25, 0.3, 4.4, [...ALL, 'paleo', 'vegetarian', 'vegan']),
  food('blueberries', 'Blueberries', 'fruit', '1 cup (148 g)', 148, 'g', 84, 1.1, 21, 0.5, 3.6, [...ALL, 'paleo', 'vegetarian', 'vegan']),
  food('raspberries', 'Raspberries', 'fruit', '½ cup (62 g)', 62, 'g', 32, 0.7, 7.3, 0.4, 4, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('orange', 'Orange', 'fruit', '1 medium (131 g)', 131, 'g', 62, 1.2, 15.4, 0.2, 3.1, [...ALL, 'paleo', 'vegetarian', 'vegan']),

  // Vegetables
  food('broccoli', 'Broccoli, cooked', 'vegetable', '100 g', 100, 'g', 35, 2.4, 7, 0.4, 3.3, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('spinach', 'Spinach, raw', 'vegetable', '2 cups (60 g)', 60, 'g', 14, 1.7, 2.2, 0.2, 1.3, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('salad-greens', 'Mixed salad greens', 'vegetable', '3 cups (85 g)', 85, 'g', 17, 1.2, 3, 0.2, 1.8, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('bell-pepper', 'Bell pepper', 'vegetable', '1 medium (120 g)', 120, 'g', 31, 1, 7, 0.4, 2.5, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('carrots', 'Carrots', 'vegetable', '100 g', 100, 'g', 41, 0.9, 10, 0.2, 2.8, [...ALL, 'paleo', 'vegetarian', 'vegan']),
  food('zucchini', 'Zucchini', 'vegetable', '100 g', 100, 'g', 17, 1.2, 3.1, 0.3, 1, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('tomato', 'Tomato', 'vegetable', '1 medium (123 g)', 123, 'g', 22, 1.1, 4.8, 0.2, 1.5, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('cauliflower', 'Cauliflower', 'vegetable', '100 g', 100, 'g', 25, 1.9, 5, 0.3, 2, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('green-beans', 'Green beans, cooked', 'vegetable', '100 g', 100, 'g', 35, 1.9, 7.9, 0.3, 3.2, [...ALL, 'paleo', 'vegetarian', 'vegan']),

  // Fats, nuts and seeds
  food('olive-oil', 'Olive oil', 'fat', '1 tbsp (13.5 g)', 13.5, 'g', 119, 0, 0, 13.5, 0, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('avocado', 'Avocado', 'fat', '½ avocado (100 g)', 100, 'g', 160, 2, 8.5, 14.7, 6.7, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('almonds', 'Almonds', 'fat', '1 oz (28 g)', 28, 'g', 164, 6, 6, 14, 3.5, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('walnuts', 'Walnuts', 'fat', '1 oz (28 g)', 28, 'g', 185, 4.3, 3.9, 18.5, 1.9, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('peanut-butter', 'Peanut butter', 'fat', '2 tbsp (32 g)', 32, 'g', 188, 8, 6, 16, 1.9, ['flexible', 'vegetarian', 'vegan']),
  food('chia-seeds', 'Chia seeds', 'fat', '2 tbsp (28 g)', 28, 'g', 138, 4.7, 12, 8.7, 9.8, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('butter', 'Butter', 'fat', '1 tbsp (14 g)', 14, 'g', 102, 0.1, 0, 11.5, 0, ['flexible', 'keto', 'vegetarian']),
  food('cheddar', 'Cheddar cheese', 'dairy', '1 oz (28 g)', 28, 'g', 114, 7, 0.4, 9.4, 0, ['flexible', 'keto', 'vegetarian']),
  food('feta', 'Feta cheese', 'dairy', '1 oz (28 g)', 28, 'g', 75, 4, 1.2, 6, 0, [...ALL, 'keto', 'vegetarian']),

  // Drinks and snacks
  food('milk', 'Milk, 2%', 'dairy', '1 cup (244 g)', 244, 'ml', 122, 8, 12, 4.8, 0, [...ALL, 'vegetarian']),
  food('almond-milk', 'Almond milk, unsweetened', 'dairy', '1 cup (240 ml)', 240, 'ml', 30, 1, 1, 2.5, 0.5, [...ALL, 'keto', 'paleo', 'vegetarian', 'vegan']),
  food('dark-chocolate', 'Dark chocolate, 85%', 'snack', '20 g', 20, 'g', 120, 2, 4.6, 10, 2, ['flexible', 'keto', 'vegetarian', 'vegan']),
  food('protein-bar', 'Protein bar', 'snack', '1 bar (60 g)', 60, 'g', 210, 20, 22, 7, 3, ['flexible', 'vegetarian']),
];
