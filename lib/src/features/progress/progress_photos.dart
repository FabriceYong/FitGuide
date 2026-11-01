import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/json.dart';
import '../../widgets/forms.dart';
import '../../widgets/image_pick.dart';
import '../../widgets/ui.dart';

final _api = ApiClient.instance;

class ProgressPhoto {
  ProgressPhoto(Json j)
      : id = asString(j['id']) ?? '',
        date = asString(j['date']) ?? '',
        note = asString(j['note']) ?? '',
        url = asString(j['url']) ?? '';
  final String id;
  final String date;
  final String note;

  /// Under the API, loaded with the session.
  final String url;
}

// Images loaded or on their way, by photo id: the big view and its
// thumbnail share one download.
final _images = <String, Future<Uint8List>>{};

/// A private photo's image, loaded with the session.
class _PhotoImage extends StatefulWidget {
  const _PhotoImage({super.key, required this.photo, required this.width, required this.height});
  final ProgressPhoto photo;
  final double width;
  final double height;

  @override
  State<_PhotoImage> createState() => _PhotoImageState();
}

class _PhotoImageState extends State<_PhotoImage> {
  Uint8List? _bytes;

  @override
  void initState() {
    super.initState();
    final id = widget.photo.id;
    final loading = _images[id] ??= _api.download(widget.photo.url);
    loading.then((b) {
      if (mounted) setState(() => _bytes = b);
    }).catchError((Object _) {
      _images.remove(id); // try again next time
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.photo;
    return Semantics(
      image: true,
      label: 'Progress photo, ${formatDay(p.date)}${p.note.isNotEmpty ? ': ${p.note}' : ''}',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: _bytes == null
            ? Container(width: widget.width, height: widget.height, color: AppColors.whiteA(0.05))
            : Image.memory(_bytes!, width: widget.width, height: widget.height, fit: BoxFit.cover),
      ),
    );
  }
}

/// Private progress photos by date (progress/ProgressPhotos.tsx): add one,
/// compare any two side by side, delete. Only the member can see them.
class ProgressPhotos extends StatefulWidget {
  const ProgressPhotos({super.key});

  @override
  State<ProgressPhotos> createState() => _ProgressPhotosState();
}

class _ProgressPhotosState extends State<ProgressPhotos> {
  List<ProgressPhoto>? _photos;
  String? _beforeId;
  String? _afterId;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _api.request('/progress-photos', auth: true).then((d) {
      if (mounted) setState(() => _photos = asJsonList(d['photos']).map(ProgressPhoto.new).toList());
    }).catchError((Object err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : '$err');
    });
  }

  Future<void> _add(ImageSource source) async {
    setState(() => _error = null);
    try {
      final picked = await pickImage(source: source);
      if (picked == null || !mounted) return;
      final day = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime(2000), lastDate: DateTime.now(), helpText: 'When was it taken?');
      if (day == null) return;
      setState(() => _busy = true);
      final data = await _api.request('/progress-photos', method: 'POST', auth: true, query: {'tzOffset': tzOffset()}, fields: {'date': ymd(day)}, files: [
        UploadFile(field: 'photo', bytes: picked.bytes, filename: picked.filename, contentType: picked.contentType),
      ]);
      final photo = ProgressPhoto(asJson(data['photo']));
      _images[photo.id] = Future.value(Uint8List.fromList(picked.bytes));
      if (mounted) setState(() => _photos = [...?_photos, photo]..sort((a, b) => a.date.compareTo(b.date)));
    } on ImagePickError catch (err) {
      if (mounted) setState(() => _error = err.message);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not add the photo.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete(ProgressPhoto photo) async {
    try {
      await _api.request('/progress-photos/${photo.id}', method: 'DELETE', auth: true);
      _images.remove(photo.id);
      if (mounted) {
        setState(() {
          _photos = _photos!.where((p) => p.id != photo.id).toList();
          _beforeId = _afterId = null;
        });
      }
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not delete the photo.');
    }
  }

  Widget _side(String label, ProgressPhoto photo, ValueChanged<String> onPick) {
    final photos = _photos!;
    return Expanded(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        LayoutBuilder(builder: (context, c) => _PhotoImage(key: ValueKey(photo.id), photo: photo, width: c.maxWidth, height: c.maxWidth * 4 / 3)),
        const SizedBox(height: 8),
        FormFieldLabel(
          label: label,
          child: FgSelect<String>(
            value: photo.id,
            semanticLabel: label,
            dense: true,
            options: [for (final p in photos) (p.id, '${formatDay(p.date)}${p.note.isNotEmpty ? ' · ${p.note}' : ''}')],
            onChanged: onPick,
          ),
        ),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final photos = _photos;
    final before = photos == null || photos.isEmpty ? null : photos.firstWhere((p) => p.id == _beforeId, orElse: () => photos.first);
    final after = photos == null || photos.isEmpty ? null : photos.firstWhere((p) => p.id == _afterId, orElse: () => photos.last);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        const Icon(LucideIcons.lock, size: 14, color: AppColors.white70),
        const SizedBox(width: 6),
        Text('Only you can see these.', style: fg(size: 12, color: AppColors.white70)),
      ]),
      const SizedBox(height: 12),
      if (photos != null && photos.length >= 2) ...[
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _side('Before', before!, (id) => setState(() {
            _beforeId = id;
            _afterId = after!.id;
          })),
          const SizedBox(width: 12),
          _side('After', after!, (id) => setState(() {
            _afterId = id;
            _beforeId = before.id;
          })),
        ]),
        const SizedBox(height: 12),
      ],
      if (photos != null && photos.isNotEmpty)
        SizedBox(
          height: 118,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: photos.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (context, i) => Column(children: [
              Stack(children: [
                _PhotoImage(photo: photos[i], width: 76, height: 92),
                Positioned(
                  top: 2,
                  right: 2,
                  child: IconButton(
                    tooltip: 'Delete the photo from ${formatDay(photos[i].date)}',
                    visualDensity: VisualDensity.compact,
                    style: IconButton.styleFrom(backgroundColor: Colors.black54),
                    onPressed: () => _delete(photos[i]),
                    icon: const Icon(LucideIcons.trash2, size: 14, color: AppColors.white),
                  ),
                ),
              ]),
              const SizedBox(height: 4),
              Text(formatDay(photos[i].date), style: fg(size: 10, color: AppColors.white70)),
            ]),
          ),
        ),
      if (photos != null && photos.isEmpty) Text('Add a photo every few weeks to see changes the scale doesn’t show.', style: fg(size: 14, color: AppColors.white70)),
      if (_error != null) ...[const SizedBox(height: 8), ErrorLine(_error!)],
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: FgButton(label: 'Take a photo', icon: LucideIcons.camera, style: FgButtonStyle.secondary, loading: _busy, onPressed: _busy ? null : () => _add(ImageSource.camera))),
        const SizedBox(width: 8),
        Expanded(child: FgButton(label: 'Choose one', icon: LucideIcons.image, style: FgButtonStyle.secondary, onPressed: _busy ? null : () => _add(ImageSource.gallery))),
      ]),
    ]);
  }
}
