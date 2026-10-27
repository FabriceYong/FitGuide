import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/images.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../navigation.dart';
import '../../widgets/ui.dart';

/// Summary card linking to a program (features/programs/ProgramCard.tsx).
class ProgramCard extends StatelessWidget {
  const ProgramCard({super.key, required this.program, this.badge});
  final ProgramSummary program;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    final color = levelColors[program.level] ?? AppColors.limeLight;
    return FgCard(
      padding: EdgeInsets.zero,
      onTap: () => openProgram(context, program.slug),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(height: 4, color: color),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Pill(program.level, color: color, background: color.withAlpha(0x20)),
                    const Spacer(),
                    if (badge != null) Pill(badge!, background: AppColors.limeLight, textColor: AppColors.noirEclipse),
                  ],
                ),
                const SizedBox(height: 12),
                Text.rich(
                  TextSpan(children: [
                    TextSpan(text: program.title, style: fg(size: 20, weight: FontWeight.w800)),
                    if (program.isPremium)
                      const WidgetSpan(
                        alignment: PlaceholderAlignment.middle,
                        child: Padding(padding: EdgeInsets.only(left: 8), child: Pill('PLUS', color: AppColors.amber300, background: Color(0x26FBBF24))),
                      ),
                  ]),
                ),
                const SizedBox(height: 8),
                Text(program.description, maxLines: 3, overflow: TextOverflow.ellipsis, style: fg(size: 14, color: AppColors.white70)),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  children: [
                    _meta(LucideIcons.calendarDays, '${program.weeks} weeks · ${program.daysPerWeek} days/week'),
                    if (program.averageMinutes != null && program.averageMinutes! > 0) _meta(LucideIcons.clock, '~${program.averageMinutes} min/session'),
                    _meta(LucideIcons.target, program.goal),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _meta(IconData icon, String text) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [Icon(icon, size: 16, color: AppColors.white70), const SizedBox(width: 6), Text(text, style: fg(size: 12, color: AppColors.white70))],
      );
}
