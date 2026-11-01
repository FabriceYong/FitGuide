import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../services/training_service.dart';
import '../../widgets/ui.dart';

/// Unread notes from the coaches of programs the member shares their progress
/// with, on the home tab until they mark them read
/// (dashboard/components/CoachNotes.tsx).
class CoachNotes extends StatefulWidget {
  const CoachNotes({super.key, this.bottomGap = 0});

  /// Space below the notes when there are any.
  final double bottomGap;

  @override
  State<CoachNotes> createState() => _CoachNotesState();
}

class _CoachNotesState extends State<CoachNotes> {
  List<CoachNote> _notes = [];

  @override
  void initState() {
    super.initState();
    fetchCoachNotes()
        .then((notes) {
          if (mounted) setState(() => _notes = notes);
        })
        .catchError((Object _) {});
  }

  void _read(CoachNote note) {
    setState(() => _notes = _notes.where((n) => n.id != note.id).toList());
    markCoachNoteRead(note.id).catchError((Object _) => <String, dynamic>{});
  }

  @override
  Widget build(BuildContext context) {
    if (_notes.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: EdgeInsets.only(bottom: widget.bottomGap),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: spaced([
          for (final n in _notes)
            FgCard(
              padding: const EdgeInsets.all(16),
              borderColor: AppColors.limeLight.withValues(alpha: 0.3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const IconTile(LucideIcons.messageSquare, color: AppColors.limeLight, radius: 12),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Semantics(
                              header: true,
                              child: Text('A note from ${n.coachName}', style: fg(size: 16, weight: FontWeight.w800)),
                            ),
                            Text('${n.programTitle} · ${formatDateTime(n.createdAt)}', style: fg(size: 12, color: AppColors.white70)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(n.text, style: fg(size: 14)),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: FgButton(label: 'Got it', icon: LucideIcons.check, style: FgButtonStyle.ghost, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 40, onPressed: () => _read(n)),
                  ),
                ],
              ),
            ),
        ], 12),
      ),
    );
  }
}
