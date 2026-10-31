import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../navigation.dart';
import '../../services/catalog_service.dart';
import '../../state/auth_controller.dart';
import '../../state/workouts_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/image_pick.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/ui.dart';

/// Member reviews of workouts, newest first; verified reviews come from
/// people who finished the workout in FitGuide (ReviewsTab.tsx).
class ReviewsTab extends StatefulWidget {
  const ReviewsTab({super.key});

  @override
  State<ReviewsTab> createState() => _ReviewsTabState();
}

class _ReviewsTabState extends State<ReviewsTab> {
  List<Review>? _reviews;
  String? _error;
  String _filter = '';
  bool _showForm = false;

  @override
  void initState() {
    super.initState();
    fetchReviews().then((r) {
      if (mounted) setState(() => _reviews = r);
    }).catchError((Object err) {
      if (mounted) setState(() => _error = '$err');
    });
  }

  Future<void> _like(String id) async {
    try {
      final likes = await likeReview(id);
      if (mounted) setState(() => _reviews = [for (final r in _reviews!) r.id == id ? r.withLikes(likes) : r]);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not like the review.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final catalog = context.watch<WorkoutsController>();
    final titles = catalog.titles;
    final shown = (_reviews ?? const <Review>[]).where((r) => _filter.isEmpty || r.workoutId == _filter).toList();
    final average = shown.isEmpty ? '–' : (shown.fold<int>(0, (s, r) => s + r.rating) / shown.length).toStringAsFixed(1);
    final verified = shown.where((r) => r.verified).length;
    final reviewed = {for (final r in _reviews ?? const <Review>[]) if (r.workoutId != null && titles.containsKey(r.workoutId)) r.workoutId!}.toList();

    final wide = atLeast(context, Breakpoints.md);
    final intro = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const PageTitle('Reviews'),
        const SizedBox(height: 4),
        Text('What members say about FitGuide workouts.', style: fg(size: 14, color: AppColors.white70)),
      ],
    );
    final action = auth.hasAccount
        ? FgButton(
            label: _showForm ? 'Cancel' : 'Write a review',
            icon: LucideIcons.sparkles,
            uppercase: true,
            radius: 999,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            onPressed: () => setState(() => _showForm = !_showForm),
          )
        : FgButton(
            label: 'Create an account to write a review',
            style: FgButtonStyle.ghost,
            radius: 999,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            onPressed: auth.startSignUp,
          );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: spaced([
        // The button beside the title on a tablet, under it on a phone.
        if (wide)
          Row(children: [Expanded(child: intro), const SizedBox(width: 16), action])
        else
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [intro, const SizedBox(height: 16), action]),
        FgGrid(columns: 1, sm: 3, gap: 16, children: [
          _Summary(icon: Icons.star_rounded, color: AppColors.amber300, value: '$average / 5', label: 'Average rating'),
          _Summary(icon: LucideIcons.messageSquare, color: AppColors.purple400, value: '${shown.length}', label: shown.length == 1 ? 'Review' : 'Reviews'),
          _Summary(icon: LucideIcons.badgeCheck, color: AppColors.emerald400, value: '$verified', label: 'From members who did the workout'),
        ]),
        if (_showForm)
          _ReviewForm(
            workouts: catalog.workouts,
            onCancel: () => setState(() => _showForm = false),
            onPosted: (review) => setState(() {
              _reviews = [review, ...?_reviews];
              _showForm = false;
            }),
          ),
        if (reviewed.isNotEmpty)
          Row(children: [
            Text('Show reviews for', style: fg(size: 14, weight: FontWeight.w700, color: AppColors.white70)),
            const SizedBox(width: 12),
            Expanded(
              child: FgSelect<String>(
                value: _filter,
                fill: AppColors.obsidianWave,
                semanticLabel: 'Show reviews for',
                options: [('', 'All workouts'), for (final slug in reviewed) (slug, titles[slug]!)],
                onChanged: (v) => setState(() => _filter = v),
              ),
            ),
          ]),
        if (_error != null) ErrorBox(_error!),
        if (_reviews == null && _error == null)
          const LoadingRow('Loading reviews…', padding: EdgeInsets.symmetric(vertical: 40))
        else if (shown.isEmpty)
          const EmptyState(
            icon: LucideIcons.messageSquare,
            color: AppColors.purple400,
            title: 'No reviews yet',
            text: 'Finish a workout and tell others how it went. Reviews from people who did the workout are marked verified.',
          )
        else
          Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: spaced([for (final r in shown) _ReviewItem(review: r, title: titles[r.workoutId], canLike: auth.hasAccount, onLike: () => _like(r.id))], 16)),
      ], wide ? 32 : 24),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.icon, required this.color, required this.value, required this.label});
  final IconData icon;
  final Color color;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return FgCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(9),
          decoration: BoxDecoration(color: color.withAlpha(0x1A), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, size: 18, color: color),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value, style: fg(size: 20, weight: FontWeight.w800)),
            Text(label, style: fg(size: 12, color: AppColors.white70)),
          ]),
        ),
      ]),
    );
  }
}

class _ReviewItem extends StatelessWidget {
  const _ReviewItem({required this.review, required this.title, required this.canLike, required this.onLike});
  final Review review;
  final String? title;
  final bool canLike;
  final VoidCallback onLike;

  @override
  Widget build(BuildContext context) {
    final r = review;
    final photos = [('Before', r.beforeImage), ('After', r.afterImage)].where((p) => p.$2 != null).toList();
    return FgCard(
      radius: 24,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Avatar(url: r.userAvatar, size: 48, initial: r.name.isEmpty ? '?' : r.name[0].toUpperCase(), background: AppColors.noirEclipse, borderColor: AppColors.white30, borderWidth: 1),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, children: [
                    Text(r.name, style: fg(size: 16, weight: FontWeight.w700)),
                    if (r.verified) const Pill('Verified', color: AppColors.emerald300, background: Color(0x2610B981), weight: FontWeight.w700),
                  ]),
                  Text(formatDate(r.createdAt), style: fg(size: 12, color: AppColors.white70)),
                ]),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Stars(r.rating),
          if (title != null) ...[
            const SizedBox(height: 16),
            Material(
              color: AppColors.royalNebula.withValues(alpha: 0.2),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999), side: BorderSide(color: AppColors.royalNebula.withValues(alpha: 0.4))),
              child: InkWell(
                borderRadius: BorderRadius.circular(999),
                onTap: () => openWorkout(context, r.workoutId!),
                child: Padding(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4), child: Text(title!, style: fg(size: 12, weight: FontWeight.w700, color: AppColors.purple200))),
              ),
            ),
          ] else if (r.workoutRegiment != null) ...[
            const SizedBox(height: 16),
            Pill(r.workoutRegiment!, color: AppColors.white70, background: AppColors.whiteA(0.05), uppercase: false, size: 12, weight: FontWeight.w700),
          ],
          const SizedBox(height: 16),
          Text(r.comment, style: fg(size: 14, color: AppColors.white70, height: 1.6)),
          if (photos.isNotEmpty) ...[
            const SizedBox(height: 16),
            Row(children: [
              for (final (i, (label, src)) in photos.indexed) ...[
                if (i > 0) const SizedBox(width: 16),
                Expanded(
                  child: AspectRatio(
                    aspectRatio: 4 / 3,
                    child: Container(
                      decoration: BoxDecoration(color: AppColors.noirEclipse, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.white30A(0.1))),
                      clipBehavior: Clip.antiAlias,
                      child: Stack(fit: StackFit.expand, children: [
                        NetImage(assetUrl(src), semanticLabel: '$label, shared by ${r.name}'),
                        Positioned(
                          left: 8,
                          top: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.7), borderRadius: BorderRadius.circular(4)),
                            child: Text(label.toUpperCase(), style: fg(size: 10, weight: FontWeight.w700)),
                          ),
                        ),
                      ]),
                    ),
                  ),
                ),
              ],
              if (photos.length == 1) const Expanded(child: SizedBox.shrink()),
            ]),
          ],
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(border: Border(top: BorderSide(color: AppColors.white30A(0.1)))),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Tooltip(
                message: canLike ? '' : 'Sign in to like reviews',
                child: InkWell(
                  onTap: canLike ? onLike : null,
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(LucideIcons.thumbsUp, size: 16, color: AppColors.white70),
                    const SizedBox(width: 8),
                    Text('Helpful · ${r.likes}', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
                  ]),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewForm extends StatefulWidget {
  const _ReviewForm({required this.workouts, required this.onCancel, required this.onPosted});
  final List<Workout> workouts;
  final VoidCallback onCancel;
  final ValueChanged<Review> onPosted;

  @override
  State<_ReviewForm> createState() => _ReviewFormState();
}

class _ReviewFormState extends State<_ReviewForm> {
  final _comment = TextEditingController();
  String _workoutSlug = '';
  int _rating = 5;
  PickedImage? _before;
  PickedImage? _after;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _comment.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _pick(bool before) async {
    try {
      final picked = await pickImage();
      if (picked == null) return;
      setState(() {
        _error = null;
        if (before) {
          _before = picked;
        } else {
          _after = picked;
        }
      });
    } on ImagePickError catch (err) {
      setState(() => _error = err.message.contains('5 MB') ? 'Photos must be under 5 MB.' : 'Photos must be JPEG, PNG, WebP or GIF.');
    }
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final review = await postReview(
        rating: _rating,
        comment: _comment.text.trim(),
        workoutSlug: _workoutSlug,
        workoutTitle: widget.workouts.where((w) => w.slug == _workoutSlug).firstOrNull?.title,
        beforeImage: _before,
        afterImage: _after,
      );
      widget.onPosted(review);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not post the review.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Widget _photoSlot(String which, PickedImage? image, VoidCallback onPick, VoidCallback onRemove) {
    return Expanded(
      child: Column(children: [
        SmallLabel(which, tracking: 0.1),
        const SizedBox(height: 8),
        SizedBox(
          height: 160,
          child: image != null
              ? Container(
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.white30)),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(fit: StackFit.expand, children: [
                    Image.memory(Uint8List.fromList(image.bytes), fit: BoxFit.cover, semanticLabel: 'Selected ${which.toLowerCase()} upload'),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Material(
                        color: Colors.black.withValues(alpha: 0.7),
                        shape: const CircleBorder(),
                        child: IconButton(
                          tooltip: 'Remove the ${which.toLowerCase()} photo',
                          visualDensity: VisualDensity.compact,
                          onPressed: onRemove,
                          icon: const Icon(LucideIcons.x, size: 16),
                        ),
                      ),
                    ),
                  ]),
                )
              : Material(
                  color: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: AppColors.white30, width: 2)),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: onPick,
                    child: Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(LucideIcons.upload, size: 24, color: AppColors.white70),
                        const SizedBox(height: 8),
                        Text('ADD ${which.toUpperCase()} PHOTO', textAlign: TextAlign.center, style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70, letterSpacing: 0.6)),
                      ]),
                    ),
                  ),
                ),
        ),
      ]),
    );
  }

  Widget _split(BuildContext context, {required List<Widget> left, required List<Widget> right}) {
    if (!atLeast(context, Breakpoints.md)) return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [...left, const SizedBox(height: 8), ...right]);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: left)),
        const SizedBox(width: 24),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: right)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;
    return FgCard(
      radius: 24,
      padding: const EdgeInsets.all(20),
      borderColor: AppColors.white30A(0.2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Expanded(child: Semantics(header: true, child: Text('Review a workout', style: fg(size: 18, weight: FontWeight.w700)))),
            IconButton(tooltip: 'Close the review form', onPressed: widget.onCancel, icon: const Icon(LucideIcons.x, size: 20, color: AppColors.white70)),
          ]),
          Divider(color: AppColors.white30A(0.15), height: 24),
          if (_error != null) ...[ErrorBox(_error!, compact: true), const SizedBox(height: 16)],
          // Two columns on a tablet: the workout and rating, then the text and photos.
          _split(context, left: [
            Text.rich(TextSpan(style: fg(size: 14, color: AppColors.white70), children: [
              const TextSpan(text: 'Posting as '),
              TextSpan(text: user?.name ?? '', style: fg(size: 14, weight: FontWeight.w700)),
            ])),
            const SizedBox(height: 16),
            const SmallLabel('Workout', tracking: 0.1),
            const SizedBox(height: 8),
            FgSelect<String>(
              value: _workoutSlug,
              radius: 16,
              semanticLabel: 'Workout',
              options: [('', 'FitGuide in general'), for (final w in widget.workouts) (w.slug, w.title)],
              onChanged: (v) => setState(() => _workoutSlug = v),
            ),
            const SizedBox(height: 6),
            Text('Reviews of a workout you finished in FitGuide are marked verified.', style: fg(size: 12, color: AppColors.white70)),
            const SizedBox(height: 16),
            const SmallLabel('Rating', tracking: 0.1),
            Row(children: [
              for (var n = 1; n <= 5; n++)
                IconButton(
                  tooltip: '$n star${n > 1 ? 's' : ''}',
                  onPressed: () => setState(() => _rating = n),
                  icon: Icon(n <= _rating ? Icons.star_rounded : Icons.star_border_rounded, size: 34, color: n <= _rating ? AppColors.amber300 : AppColors.white70),
                ),
            ]),
          ], right: [
            const SmallLabel('Your review', tracking: 0.1),
            const SizedBox(height: 8),
            FgTextField(
              controller: _comment,
              hint: 'How did the workout go? What would you tell someone about to try it?',
              maxLines: 4,
              minLines: 4,
              maxLength: 1000,
              fontSize: 14,
              radius: 16,
            ),
            const SizedBox(height: 4),
            Align(alignment: Alignment.centerRight, child: Text('${_comment.text.length} / 1000 characters', style: fg(size: 12, color: AppColors.white70))),
            const SizedBox(height: 16),
            const SmallLabel('Progress photos (optional)', tracking: 0.1),
            const SizedBox(height: 12),
            Row(children: [
              _photoSlot('Before', _before, () => _pick(true), () => setState(() => _before = null)),
              const SizedBox(width: 16),
              _photoSlot('After', _after, () => _pick(false), () => setState(() => _after = null)),
            ]),
            const SizedBox(height: 12),
            Text('Photos are public on your review.', style: fg(size: 12, color: AppColors.white70)),
          ]),
          Divider(color: AppColors.white30A(0.15), height: 32),
          Align(
            alignment: Alignment.centerRight,
            child: FgButton(
              label: 'Post review',
              uppercase: true,
              radius: 999,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              height: 48,
              padding: const EdgeInsets.symmetric(horizontal: 32),
              loading: _submitting,
              onPressed: _submitting || _comment.text.trim().isEmpty ? null : _submit,
            ),
          ),
        ],
      ),
    );
  }
}
