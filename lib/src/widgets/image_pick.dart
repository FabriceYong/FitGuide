import 'package:image_picker/image_picker.dart';

import '../services/catalog_service.dart';

const _imageTypes = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp', 'gif': 'image/gif'};
const maxImageBytes = 5 * 1024 * 1024;

class ImagePickError implements Exception {
  ImagePickError(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Pick a photo from the library. Null when cancelled. Throws [ImagePickError]
/// for files the API won't take (only JPEG, PNG, WebP or GIF, up to 5 MB).
Future<PickedImage?> pickImage({ImageSource source = ImageSource.gallery}) async {
  final file = await ImagePicker().pickImage(source: source, maxWidth: 2000, imageQuality: 90);
  if (file == null) return null;
  final ext = file.name.split('.').last.toLowerCase();
  final type = file.mimeType ?? _imageTypes[ext];
  if (type == null || !_imageTypes.containsValue(type)) throw ImagePickError('Only image files are allowed (JPEG, PNG, WebP, GIF).');
  final bytes = await file.readAsBytes();
  if (bytes.length > maxImageBytes) throw ImagePickError('Image must be under 5 MB.');
  return PickedImage(bytes, file.name.contains('.') ? file.name : '${file.name}.jpg', type);
}
