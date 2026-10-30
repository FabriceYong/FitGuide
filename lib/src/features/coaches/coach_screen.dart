import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../navigation.dart';
import '../../services/coach_service.dart';
import '../../state/auth_controller.dart';
import '../../widgets/ui.dart';
import '../common/site_page.dart';
import 'coach_widgets.dart';

/// A coach's bio, contact details and published programs
/// (app/coaches/[id] → CoachProfileView.tsx).
class CoachScreen extends StatefulWidget {
  const CoachScreen({super.key, required this.id});
  final String id;

  @override
  State<CoachScreen> createState() => _CoachScreenState();
}

class _CoachScreenState extends State<CoachScreen> {
  CoachPage? _page;
  String? _error;
  bool? _loadedSignedIn;

  void _load(bool signedIn) {
    if (_loadedSignedIn == signedIn) return;
    _loadedSignedIn = signedIn;
    fetchCoach(widget.id).then((page) {
      if (mounted) setState(() => _page = page);
    }).catchError((Object err) {
      if (mounted) setState(() => _error = '$err');
    });
  }

  @override
  Widget build(BuildContext context) {
    _load(context.watch<AuthController>().hasAccount);
    final page = _page;
    if (page == null) {
      return SitePage(active: '/programs', child: _error != null ? ErrorBox(_error!) : const LoadingRow('Loading coach…'));
    }
    final coach = page.coach;
    return SitePage(
      active: '/programs',
      maxWidth: 1100,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(alignment: Alignment.centerLeft, child: LinkText('← ALL PROGRAMS', size: 12, color: AppColors.white70, weight: FontWeight.w700, onTap: () => openHref(context, '/programs'))),
          const SizedBox(height: 16),
          Row(children: [
            Avatar(url: coach.avatarUrl, size: 64, borderColor: AppColors.white30A(0.3), borderWidth: 1),
            const SizedBox(width: 16),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('FITGUIDE COACH', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.limeLight, letterSpacing: 0.6)),
                PageTitle(coach.name, size: atLeast(context, Breakpoints.md) ? 30 : 24),
                if (coach.specialties.isNotEmpty) Text(coach.specialties.join(' · '), style: fg(size: 14, color: AppColors.white70)),
              ]),
            ),
          ]),
          const SizedBox(height: 16),
          Text(coach.bio, style: fg(size: 15, color: AppColors.white70, height: 1.6)),
          const SizedBox(height: 24),
          FgCard(
            padding: const EdgeInsets.all(20),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Semantics(header: true, child: Text('Contact', style: fg(size: 16, weight: FontWeight.w800))),
              const SizedBox(height: 12),
              CoachContactView(coach: coach),
            ]),
          ),
          const SizedBox(height: 24),
          Semantics(header: true, child: Text('Programs', style: fg(size: 20, weight: FontWeight.w800))),
          const SizedBox(height: 12),
          if (page.programs.isEmpty)
            Text('No published programs yet.', style: fg(size: 14, color: AppColors.white70))
          else
            FgGrid(
              columns: 1,
              sm: 2,
              gap: 12,
              children: [
                for (final p in page.programs)
                  FgCard(
                    onTap: () => openProgram(context, p.slug),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(p.title, style: fg(size: 16, weight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text('${p.level} · ${p.weeks} weeks · ${p.totalDays} sessions', style: fg(size: 12, color: AppColors.white70)),
                      if (p.inPerson) ...[
                        const SizedBox(height: 4),
                        Row(children: [
                          const Icon(LucideIcons.users, size: 14, color: AppColors.limeLight),
                          const SizedBox(width: 6),
                          Text('In person', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.limeLight)),
                        ]),
                      ],
                    ]),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}
