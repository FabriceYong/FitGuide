import 'package:flutter/material.dart';

import 'theme/app_colors.dart';

/// Workout pictures and category colours (utils/unsplashImages.ts and
/// features/workout/categoryColor.ts on the website).

String unsplash(String id, {String query = 'w=800&h=600&fit=crop&q=80'}) => 'https://images.unsplash.com/photo-$id?$query';

enum ImageSize { small, medium, large }

const _dimensions = {ImageSize.small: 'w=400&h=300', ImageSize.medium: 'w=800&h=600', ImageSize.large: 'w=1200&h=900'};

String _photo(String id, ImageSize size) => unsplash(id, query: '${_dimensions[size]}&fit=crop&q=80');

// A few photos per category, each checked by eye; a workout's title picks one
// so it always shows the same photo and neighbouring cards differ.
const _categoryPhotos = {
  'HIIT': ['1517836357463-d25dfeac3438', '1517838277536-f5f99be501cd', '1599058917212-d750089bc07e', '1599901860904-17e6ed7083a0', '1594737625785-a6cbdabd333c', '1566241142559-40e1dab266c6', '1518644961665-ed172691aaa1'],
  'Strength': ['1517836477839-7072aaa8b121', '1534438327276-14e5300c3a48', '1581009146145-b5ef050c2e1e', '1574680096145-d05b474e2155', '1583454110551-21f2fa2afe61', '1434682881908-b43d0467b798', '1576678927484-cc907957088c', '1596357395217-80de13130e92', '1549060279-7e168fcee0c2'],
  'Cardio': ['1476480862126-209bfaa8edc8', '1538805060514-97d9cc17730c', '1502904550040-7534597429ae', '1607962837359-5e7e89f86776', '1546483875-ad9014c88eba'],
  'Yoga': ['1544367567-0f2fcb009e0b', '1575052814086-f385e2e2ad1b', '1506126613408-eca07ce68773'],
  'Pilates': ['1518611012118-696072aa579a', '1571019613454-1cb2f99b2d8b', '1599447421416-3414500d18a5'],
  'Flexibility': ['1552196563-55cd4e45efb3', '1591258370814-01609b341790', '1506126613408-eca07ce68773'],
  'CrossFit': ['1517963879433-6ad2b056d712', '1541534741688-6078c6bfb5c5', '1571019614242-c5c5dee9f50b', '1554284126-aa88f22d8b74', '1526506118085-60ce8714f8c5'],
  'Dance': ['1518310383802-640c2de311b2', '1524594152303-9fd13543fe6e', '1535525153412-5a42439a210d', '1517130038641-a774d04afb3c'],
  'Martial Arts': ['1461897104016-0b3b00cc81ee', '1555597673-b21d5c935865', '1517438322307-e67111335449', '1555597408-26bc8e548a46'],
  'Swimming': ['1519315901367-f34ff9154487', '1560090995-01632a28895b'],
};

// A title that names an activity uses that activity's photos.
const _titleCategories = [
  (['yoga', 'sun salutation'], 'Yoga'),
  (['core', 'abs', 'pilates'], 'Pilates'),
  (['run', 'stair'], 'Cardio'),
];

/// A stable number for a text (djb2), the same as the website's textHash.
int textHash(String text) {
  var h = 5381;
  for (final c in text.codeUnits) {
    h = (h * 33 + c) & 0xFFFFFFFF;
  }
  return h;
}

/// A photo for a workout category, chosen by [seed].
String workoutImageUrl(String category, [ImageSize size = ImageSize.medium, String seed = '']) {
  final photos = _categoryPhotos[category] ?? _categoryPhotos['HIIT']!;
  return _photo(photos[textHash(seed) % photos.length], size);
}

/// The photo for a workout: its own image if it has one, else one from the
/// set its title or category points to, the same every time for that title.
String workoutSpecificImage(String title, String category, {ImageSize size = ImageSize.medium, String? customImageUrl}) {
  if (customImageUrl != null && customImageUrl.isNotEmpty) return customImageUrl;
  final lower = title.toLowerCase();
  final match = _titleCategories.where((t) => t.$1.any(lower.contains)).firstOrNull;
  return workoutImageUrl(match?.$2 ?? category, size, lower);
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
