import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/shared/profile_options.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/json.dart';
import '../../services/nutrition_service.dart';
import '../../widgets/forms.dart';
import '../../widgets/image_pick.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';

const _mealLabels = {'breakfast': 'Breakfast', 'lunch': 'Lunch', 'dinner': 'Dinner', 'snack': 'Snack'};
const _confidence = {'medium': 'Check the portion', 'low': 'Rough guess: check it'};

/// The meal that fits the time of day.
String _mealNow() {
  final h = DateTime.now().hour;
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

/// "Snap a meal" and "Type a meal" on the Nutrition screen (MealReader.tsx):
/// FitGuide reads the foods and portions, the member checks and adjusts them,
/// and only then are they logged. Hidden when the server can't read meals.
class MealReader extends StatefulWidget {
  const MealReader({super.key, required this.date, required this.onLogged});
  final String date;
  final VoidCallback onLogged;

  @override
  State<MealReader> createState() => _MealReaderState();
}

class _MealReaderState extends State<MealReader> {
  final _text = TextEditingController();
  MealReadingStatus? _status;
  bool _typing = false;
  String? _busy;
  String? _error;

  @override
  void initState() {
    super.initState();
    fetchMealReadingStatus().then((s) {
      if (mounted) setState(() => _status = s);
    }).catchError((Object _) {});
    _text.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _read(Future<MealReading> Function() run, String kind, {Uint8List? photo}) async {
    setState(() {
      _busy = kind;
      _error = null;
    });
    try {
      final reading = await run();
      if (!mounted) return;
      setState(() => _status = MealReadingStatus.copy(_status!, photos: reading.photos, texts: reading.texts));
      final logged = await showFgModal<bool>(context, title: 'Check your meal', sheet: true, maxWidth: 640, builder: (_) => _Review(reading: reading, date: widget.date, photo: photo));
      if (logged == true) widget.onLogged();
      if (kind == 'text' && mounted) {
        _text.clear();
        setState(() => _typing = false);
      }
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _snap() async {
    try {
      // The camera on a phone; a photo from the library elsewhere.
      final mobile = !kIsWeb && (defaultTargetPlatform == TargetPlatform.android || defaultTargetPlatform == TargetPlatform.iOS);
      final picked = await pickImage(source: mobile ? ImageSource.camera : ImageSource.gallery);
      if (picked == null) return;
      final bytes = Uint8List.fromList(picked.bytes);
      await _read(() => readMealPhoto(bytes, picked.filename, picked.contentType), 'photo', photo: bytes);
    } on ImagePickError catch (err) {
      setState(() => _error = err.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = _status;
    if (status == null || !status.available) return const SizedBox.shrink();
    final photos = status.photos, texts = status.texts;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.limeLight.withValues(alpha: 0.25)),
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [AppColors.limeLight.withValues(alpha: 0.1), AppColors.obsidianWave]),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            const Icon(LucideIcons.sparkles, size: 16, color: AppColors.limeLight),
            const SizedBox(width: 8),
            Expanded(child: Semantics(header: true, child: Text('Log a meal in seconds', style: fg(size: 16, weight: FontWeight.w800)))),
          ]),
          const SizedBox(height: 4),
          Text('Snap your plate or describe it, then check what FitGuide found before logging.', style: fg(size: 12, color: AppColors.white70)),
          const SizedBox(height: 4),
          Text('${photos.left} of ${photos.max} photos · ${texts.left} of ${texts.max} descriptions left today', style: fg(size: 11, color: AppColors.white70)),
          const SizedBox(height: 14),
          Wrap(spacing: 8, runSpacing: 8, children: [
            FgButton(
              label: _busy == 'photo' ? 'Reading your meal…' : 'Snap a meal',
              icon: LucideIcons.camera,
              loading: _busy == 'photo',
              height: 42,
              radius: 12,
              fontSize: 14,
              fontWeight: FontWeight.w700,
              onPressed: _busy != null || photos.left == 0 ? null : _snap,
            ),
            FgButton(
              label: 'Type a meal',
              icon: LucideIcons.penLine,
              style: FgButtonStyle.secondary,
              height: 42,
              radius: 12,
              fontSize: 14,
              fontWeight: FontWeight.w700,
              onPressed: _busy != null || texts.left == 0 ? null : () => setState(() => _typing = !_typing),
            ),
          ]),
          if (_typing) ...[
            const SizedBox(height: 12),
            FgTextField(
              controller: _text,
              hint: 'e.g. 2 scrambled eggs, a slice of toast with butter and a flat white',
              maxLines: 3,
              minLines: 2,
              maxLength: 500,
              semanticLabel: 'What did you eat?',
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: FgButton(
                label: 'Find the foods',
                loading: _busy == 'text',
                height: 40,
                radius: 12,
                fontSize: 14,
                fontWeight: FontWeight.w700,
                onPressed: _busy != null || _text.text.trim().length < 2 ? null : () => _read(() => readMealText(_text.text.trim()), 'text'),
              ),
            ),
          ],
          if (_error != null) ...[const SizedBox(height: 10), ErrorLine(_error!)],
          if (photos.left == 0 || texts.left == 0) ...[
            const SizedBox(height: 8),
            Text(
              '${photos.left == 0 ? 'No photos left today. ' : ''}${texts.left == 0 ? 'No descriptions left today. ' : ''}They refresh over the next 24 hours; you can still add foods by hand.',
              style: fg(size: 12, color: AppColors.white70),
            ),
          ],
        ],
      ),
    );
  }
}

/// An item with the member's edits: kept or not, and how many servings.
class _Row {
  _Row(this.item) : amount = item.servings;
  final ReadItem item;
  bool keep = true;
  double amount;

  double get _k => item.servings > 0 ? amount / item.servings : 1;
  int get calories => (item.calories * _k).round();
  double get protein => (item.protein * _k * 10).round() / 10;
}

class _Review extends StatefulWidget {
  const _Review({required this.reading, required this.date, this.photo});
  final MealReading reading;
  final String date;
  final Uint8List? photo;

  @override
  State<_Review> createState() => _ReviewState();
}

class _ReviewState extends State<_Review> {
  late final List<_Row> _rows = [for (final i in widget.reading.items) _Row(i)];
  String _meal = _mealNow();
  bool _logging = false;
  String? _error;

  Future<void> _log() async {
    setState(() {
      _logging = true;
      _error = null;
    });
    try {
      for (final r in _rows.where((r) => r.keep && r.amount > 0)) {
        final i = r.item;
        await logFood({
          'date': widget.date,
          'meal': _meal,
          'servings': r.amount,
          if (i.foodSlug != null) 'foodSlug': i.foodSlug else ...{'name': i.name, 'calories': i.calories, 'protein': i.protein, 'carbs': i.carbs, 'fat': i.fat},
        });
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    } finally {
      if (mounted) setState(() => _logging = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final kept = _rows.where((r) => r.keep && r.amount > 0).toList();
    final total = kept.fold<int>(0, (n, r) => n + r.calories);
    final note = widget.reading.note;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.photo != null) ...[
          ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.memory(widget.photo!, height: 180, fit: BoxFit.cover, semanticLabel: 'Your meal')),
          const SizedBox(height: 14),
        ],
        if (_rows.isEmpty)
          Text(note ?? 'No food found. Try another photo or describe the meal in words.', style: fg(size: 14, color: AppColors.white70))
        else ...[
          if (note != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(color: AppColors.amber400.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.amber400.withValues(alpha: 0.2))),
              child: Text(note, style: fg(size: 12, color: AppColors.amber300)),
            ),
            const SizedBox(height: 12),
          ],
          for (final (i, r) in _rows.indexed) ...[
            if (i > 0) const SizedBox(height: 8),
            Opacity(
              opacity: r.keep ? 1 : 0.5,
              child: Container(
                padding: const EdgeInsets.fromLTRB(4, 8, 4, 8),
                decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.white30A(0.15))),
                child: Row(children: [
                  Checkbox(value: r.keep, onChanged: (v) => setState(() => r.keep = v ?? false), activeColor: AppColors.limeLight, checkColor: AppColors.noirEclipse, semanticLabel: 'Log ${r.item.name}'),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(r.item.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: fg(size: 14, weight: FontWeight.w700)),
                      Text.rich(
                        TextSpan(children: [
                          TextSpan(text: '${r.item.portion} · ~${r.item.grams} g · ${r.calories} kcal · P ${numText(r.protein)} g'),
                          if (_confidence[r.item.confidence] != null) TextSpan(text: ' · ${_confidence[r.item.confidence]}', style: fg(size: 12, color: AppColors.amber300)),
                        ]),
                        style: fg(size: 12, color: AppColors.white70),
                      ),
                    ]),
                  ),
                  // Servings, in quarters.
                  IconButton(
                    tooltip: 'Less ${r.item.name}',
                    onPressed: r.amount > 0.25 ? () => setState(() => r.amount -= 0.25) : null,
                    icon: const Icon(LucideIcons.minus, size: 16, color: AppColors.white70),
                  ),
                  Text('${numText(r.amount)}×', style: fg(size: 13, weight: FontWeight.w700)),
                  IconButton(
                    tooltip: 'More ${r.item.name}',
                    onPressed: r.amount < Nutrition.maxServings ? () => setState(() => r.amount += 0.25) : null,
                    icon: const Icon(LucideIcons.plus, size: 16, color: AppColors.white70),
                  ),
                ]),
              ),
            ),
          ],
          const SizedBox(height: 14),
          Row(children: [
            Text('Add to ', style: fg(size: 14, color: AppColors.white70)),
            const SizedBox(width: 8),
            Expanded(
              child: FgSelect<String>(
                value: _meal,
                dense: true,
                semanticLabel: 'Meal',
                options: [for (final m in Nutrition.meals) (m, _mealLabels[m] ?? m)],
                onChanged: (m) => setState(() => _meal = m),
              ),
            ),
            const SizedBox(width: 12),
            Text('$total kcal', style: fg(size: 14, weight: FontWeight.w800)),
          ]),
          const SizedBox(height: 10),
          Text(
            'Portions and nutrition are estimates from the ${widget.photo != null ? 'photo' : 'description'}. Sauces and oil can be hard to see. Adjust anything that looks off.',
            style: fg(size: 11, color: AppColors.white70),
          ),
          if (_error != null) ...[const SizedBox(height: 10), ErrorLine(_error!)],
          const SizedBox(height: 14),
          FgButton(
            label: 'Log ${kept.length} ${kept.length == 1 ? 'item' : 'items'}',
            icon: LucideIcons.check,
            loading: _logging,
            expand: true,
            height: 50,
            radius: 12,
            fontSize: 14,
            fontWeight: FontWeight.w800,
            onPressed: _logging || kept.isEmpty ? null : _log,
          ),
        ],
      ],
    );
  }
}
