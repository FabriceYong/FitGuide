import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../services/ai_service.dart';
import '../../widgets/ui.dart';

/// "Coach's take" on the end-of-workout sheet (WorkoutFeedback.tsx): how
/// this session compares with earlier ones and one thing to try next time.
/// Loads by itself once the session is saved; hidden when AI isn't set up,
/// the allowance is used up, or it fails.
class WorkoutFeedbackCard extends StatefulWidget {
  const WorkoutFeedbackCard({super.key, required this.sessionId, required this.tint});
  final String sessionId;
  final Color tint;

  @override
  State<WorkoutFeedbackCard> createState() => _WorkoutFeedbackCardState();
}

class _WorkoutFeedbackCardState extends State<WorkoutFeedbackCard> {
  WorkoutFeedbackNote? _feedback;
  bool _hidden = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final status = await fetchAiStatus();
      if (!status.available || status.left('feedback').left == 0) throw StateError('unavailable');
      final feedback = await fetchWorkoutFeedback(widget.sessionId);
      if (mounted) setState(() => _feedback = feedback);
    } catch (_) {
      if (mounted) setState(() => _hidden = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_hidden) return const SizedBox.shrink();
    final tint = widget.tint;
    final f = _feedback;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: tint.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: tint.withValues(alpha: 0.25)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(LucideIcons.sparkles, size: 14, color: tint),
                const SizedBox(width: 6),
                Text(
                  "COACH'S TAKE",
                  style: fg(size: 11, weight: FontWeight.w700, color: tint, letterSpacing: 0.8),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (f == null) ...[
              const Skeleton(height: 16, width: 200),
              const SizedBox(height: 8),
              const Skeleton(height: 12),
            ] else ...[
              Text(f.headline, style: fg(size: 16, weight: FontWeight.w800)),
              for (final n in f.notes)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(n, style: fg(size: 14, color: AppColors.whiteA(0.8))),
                ),
              if (f.nextTime.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Icon(LucideIcons.arrowRight, size: 16, color: tint),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: 'Next time: ',
                                style: fg(size: 14, weight: FontWeight.w700),
                              ),
                              TextSpan(text: f.nextTime),
                            ],
                          ),
                          style: fg(size: 14),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
