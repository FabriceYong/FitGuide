import 'package:flutter/material.dart';

import 'theme/app_colors.dart';

/// Workout pictures and category colours (utils/unsplashImages.ts and
/// features/workout/categoryColor.ts on the website).

String unsplash(String id, {String query = 'w=800&h=600&fit=crop&q=80'}) => 'https://images.unsplash.com/photo-$id?$query';

enum ImageSize { small, medium, large }

const _dimensions = {ImageSize.small: 'w=400&h=300', ImageSize.medium: 'w=800&h=600', ImageSize.large: 'w=1200&h=900'};

String _photo(String id, ImageSize size) => unsplash(id, query: '${_dimensions[size]}&fit=crop&q=80');

const _categoryPhotos = {
  'HIIT': '1517836357463-d25dfeac3438',
  'Yoga': '1544367567-0f2fcb009e0b',
  'Strength': '1534438327276-14e5300c3a48',
  'Cardio': '1476480862126-209bfaa8edc8',
  'Pilates': '1518611012118-696072aa579a',
  'Flexibility': '1506126613408-eca07ce68773',
  'CrossFit': '1517836477839-7072aaa8b121',
  'Dance': '1508700115892-45ecd05ae2ad',
  'Martial Arts': '1555597408-26bc8e548a46',
  'Swimming': '1519315901367-f34ff9154487',
};

// Checked in order; the first keyword found in the title wins.
const _titlePhotos = [
  (['tabata', 'hiit'], '1517838277536-f5f99be501cd'),
  (['yoga', 'sun salutation'], '1544367567-0f2fcb009e0b'),
  (['core', 'abs'], '1571019613454-1cb2f99b2d8b'),
  (['pilates'], '1518611012118-696072aa579a'),
  (['strength', 'weight'], '1534438327276-14e5300c3a48'),
  (['cardio', 'running'], '1476480862126-209bfaa8edc8'),
];

String workoutImageUrl(String category, [ImageSize size = ImageSize.medium]) =>
    _photo(_categoryPhotos[category] ?? _categoryPhotos['HIIT']!, size);

/// The photo for a workout: its own image if it has one, else one matching
/// its title, else its category's.
String workoutSpecificImage(String title, String category, {ImageSize size = ImageSize.medium, String? customImageUrl}) {
  if (customImageUrl != null && customImageUrl.isNotEmpty) return customImageUrl;
  final lower = title.toLowerCase();
  for (final (words, id) in _titlePhotos) {
    if (words.any(lower.contains)) return _photo(id, size);
  }
  return workoutImageUrl(category, size);
}

const _categoryColors = {
  'HIIT': Color(0xFF00C4B4),
  'Yoga': Color(0xFF3E25F5),
  'Strength': Color(0xFFC084FC),
  'Cardio': Color(0xFFFB923C),
  'Flexibility': Color(0xFF14B8A6),
  'Pilates': Color(0xFFEC4899),
  'CrossFit': Color(0xFFEF4444),
  'Dance': Color(0xFFF59E0B),
  'Martial Arts': Color(0xFF10B981),
  'Swimming': Color(0xFF06B6D4),
};

Color categoryColor(String category) => _categoryColors[category] ?? AppColors.limeLight;

const levelColors = {
  'Beginner': Color(0xFF00C4B4),
  'Intermediate': Color(0xFFFB923C),
  'Advanced': Color(0xFFEF4444),
  'All Levels': Color(0xFFC084FC),
};
