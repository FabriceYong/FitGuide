import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../services/catalog_service.dart';
import '../../state/auth_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';

/// Reviews of one workout, under its details (reviews/components/WorkoutReviews.js).
class WorkoutReviews extends StatefulWidget {
  const WorkoutReviews({super.key, required this.workoutSlug, required this.workoutTitle});
  final String workoutSlug;
  final String workoutTitle;

  @override
  State<WorkoutReviews> createState() => _WorkoutReviewsState();
}

class _WorkoutReviewsState extends State<WorkoutReviews> {
  List<Review> _reviews = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await fetchReviews(widget.workoutSlug);
      if (mounted) setState(() => _reviews = list);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not connect to review service');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _like(Review review) async {
    if (!context.read<AuthController>().hasAccount) return;
    try {
      final likes = await likeReview(review.id);
      if (mounted) setState(() => _reviews = [for (final r in _reviews) r.id == review.id ? r.withLikes(likes) : r]);
    } catch (_) {}
  }

  Future<void> _add() async {
    final posted = await showFgModal<bool>(context, title: 'Write a Review', builder: (_) => _AddReview(workoutSlug: widget.workoutSlug, workoutTitle: widget.workoutTitle));
    if (posted == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final hasAccount = context.watch<AuthController>().hasAccount;
    final average = _reviews.isEmpty ? 0.0 : _reviews.fold<int>(0, (s, r) => s + r.rating) / _reviews.length;
    final summary = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(header: true, child: Text('Community Reviews', style: fg(size: 20, weight: FontWeight.w700))),
        const SizedBox(height: 4),
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          children: [
            Stars(average.round(), color: AppColors.limeLight, emptyColor: AppColors.white30),
            Text(
              '${average.toStringAsFixed(1)} (${_reviews.length} ${_reviews.length == 1 ? 'review' : 'reviews'})',
              style: fg(size: 14, color: AppColors.white70),
            ),
          ],
        ),
      ],
    );
    final addButton = hasAccount
        ? FgButton(label: 'Add Review', icon: LucideIcons.plus, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 40, padding: const EdgeInsets.symmetric(horizontal: 16), onPressed: _add)
        : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FgCard(
          padding: const EdgeInsets.all(20),
          // The button sits beside the heading on a tablet, under it on a
          // phone, where there's no room beside it.
          child: atLeast(context, Breakpoints.sm)
              ? Row(children: [Expanded(child: summary), if (addButton != null) ...[const SizedBox(width: 16), addButton]])
              : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [summary, if (addButton != null) ...[const SizedBox(height: 14), addButton]]),
        ),
        if (_error != null) ...[const SizedBox(height: 16), ErrorBox(_error!, compact: true)],
        const SizedBox(height: 16),
        if (_loading && _reviews.isEmpty)
          const LoadingRow('Loading reviews…')
        else if (_reviews.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 16),
            decoration: BoxDecoration(color: AppColors.obsidianWave.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.white30A(0.1))),
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.white30A(0.1)),
                  child: const Icon(LucideIcons.star, size: 32, color: AppColors.white30),
                ),
                const SizedBox(height: 16),
                Text('No reviews yet', style: fg(size: 18, weight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text('Be the first to share your experience with this workout!', textAlign: TextAlign.center, style: fg(size: 14, color: AppColors.white70)),
                if (hasAccount) ...[
                  const SizedBox(height: 16),
                  FgButton(label: 'Write First Review', radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: _add),
                ],
              ],
            ),
          )
        else
          ...spaced([for (final r in _reviews) _ReviewCard(review: r, onLike: () => _like(r))], 16),
      ],
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.review, required this.onLike});
  final Review review;
  final VoidCallback onLike;

  Widget _photo(String label, String src, {bool after = false}) {
    return Expanded(
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.noirEclipse,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: after ? AppColors.limeLight.withValues(alpha: 0.3) : AppColors.white30A(0.1)),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              NetImage(assetUrl(src), semanticLabel: label),
              Positioned(
                left: 8,
                bottom: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: after ? AppColors.limeLight : AppColors.noirEclipse.withValues(alpha: 0.8), borderRadius: BorderRadius.circular(4)),
                  child: Text(label, style: fg(size: 10, weight: FontWeight.w700, color: after ? AppColors.noirEclipse : AppColors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final r = review;
    return FgCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Avatar(url: r.userAvatar, size: 40, background: AppColors.noirEclipse, borderColor: AppColors.white30A(0.2), borderWidth: 1),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      children: [
                        Text(r.name, style: fg(size: 14, weight: FontWeight.w700)),
                        if (r.verified) const Pill('Verified', color: AppColors.emerald300, background: Color(0x2610B981), weight: FontWeight.w700),
                      ],
                    ),
                    Text(formatDate(r.createdAt), style: fg(size: 12, color: AppColors.white70)),
                  ],
                ),
              ),
              Stars(r.rating, color: AppColors.limeLight, emptyColor: AppColors.white30),
            ],
          ),
          const SizedBox(height: 16),
          Text(r.comment, style: fg(size: 14, color: AppColors.whiteA(0.9), height: 1.6)),
          if (r.beforeImage != null || r.afterImage != null) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                const Icon(LucideIcons.image, size: 16, color: AppColors.limeLight),
                const SizedBox(width: 8),
                Flexible(child: Text('TRANSFORMATION PHOTOS', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.limeLight))),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                if (r.beforeImage != null) _photo('Before', r.beforeImage!),
                if (r.beforeImage != null && r.afterImage != null) const SizedBox(width: 12),
                if (r.afterImage != null) _photo('After', r.afterImage!, after: true),
              ],
            ),
          ],
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(border: Border(top: BorderSide(color: AppColors.white30A(0.1)))),
            child: Align(
              alignment: Alignment.centerLeft,
              child: InkWell(
                onTap: onLike,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(LucideIcons.thumbsUp, size: 16, color: AppColors.white70),
                    const SizedBox(width: 6),
                    Text('Helpful (${r.likes})', style: fg(size: 12, color: AppColors.white70)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AddReview extends StatefulWidget {
  const _AddReview({required this.workoutSlug, required this.workoutTitle});
  final String workoutSlug;
  final String workoutTitle;

  @override
  State<_AddReview> createState() => _AddReviewState();
}

class _AddReviewState extends State<_AddReview> {
  final _comment = TextEditingController();
  int _rating = 5;
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

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await postReview(rating: _rating, comment: _comment.text.trim(), workoutSlug: widget.workoutSlug, workoutTitle: widget.workoutTitle);
      if (mounted) Navigator.of(context).pop(true);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Failed to submit review');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_error != null) ...[ErrorBox(_error!, compact: true), const SizedBox(height: 16)],
        const SmallLabel('Rating'),
        const SizedBox(height: 8),
        Row(
          children: [
            for (var n = 1; n <= 5; n++)
              IconButton(
                tooltip: '$n star${n > 1 ? 's' : ''}',
                onPressed: () => setState(() => _rating = n),
                icon: Icon(n <= _rating ? Icons.star_rounded : Icons.star_border_rounded, size: 34, color: n <= _rating ? AppColors.limeLight : AppColors.white30),
              ),
          ],
        ),
        const SizedBox(height: 16),
        const SmallLabel('Review'),
        const SizedBox(height: 8),
        FgTextField(controller: _comment, hint: 'Share details of your experience...', maxLines: 4, minLines: 4, fontSize: 14, radius: 12, border: AppColors.white30A(0.2)),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: FgButton(label: 'Cancel', style: FgButtonStyle.secondary, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: _submitting ? null : () => Navigator.of(context).pop(false)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FgButton(
                label: _submitting ? 'Submitting...' : 'Submit Review',
                radius: 12,
                fontSize: 14,
                fontWeight: FontWeight.w700,
                loading: _submitting,
                onPressed: _comment.text.trim().isEmpty ? null : _submit,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
