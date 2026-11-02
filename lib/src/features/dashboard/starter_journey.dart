import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/json.dart';
import '../../navigation.dart';
import '../../widgets/ui.dart';

final _api = ApiClient.instance;

class StarterStep {
  StarterStep(Json j)
      : id = asString(j['id']) ?? '',
        title = asString(j['title']) ?? '',
        done = asBool(j['done']),
        href = asString(j['href']);
  final String id;
  final String title;
  final bool done;

  /// The page that does it; null for the home page itself.
  final String? href;
}

class Starter {
  Starter(Json j)
      : show = asBool(j['show']),
        done = asInt(j['done']) ?? 0,
        total = asInt(j['total']) ?? 7,
        steps = asJsonList(j['steps']).map(StarterStep.new).toList();
  final bool show;
  final int done;
  final int total;
  final List<StarterStep> steps;
}

/// The first-week starter journey on the home tab: seven small first steps,
/// ticked off from what the member has done, for an account's first two
/// weeks (dashboard/components/StarterJourney.tsx).
class StarterJourney extends StatefulWidget {
  const StarterJourney({super.key, this.bottomGap = 0});

  /// Space below it when it shows.
  final double bottomGap;

  @override
  State<StarterJourney> createState() => _StarterJourneyState();
}

class _StarterJourneyState extends State<StarterJourney> {
  Starter? _starter;

  @override
  void initState() {
    super.initState();
    _api.request('/progress/starter', auth: true).then((d) {
      if (mounted) setState(() => _starter = Starter(asJson(d['starter'])));
    }).catchError((Object _) {});
  }

  void _hide() {
    setState(() => _starter = null);
    _api.request('/progress/starter/hide', method: 'POST', auth: true).catchError((Object _) => <String, dynamic>{});
  }

  @override
  Widget build(BuildContext context) {
    final s = _starter;
    if (s == null || !s.show) return const SizedBox.shrink();
    final complete = s.done == s.total;
    return Padding(
      padding: EdgeInsets.only(bottom: widget.bottomGap),
      child: FgCard(
        borderColor: AppColors.limeLight.withValues(alpha: 0.3),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(LucideIcons.rocket, size: 20, color: AppColors.limeLight),
            const SizedBox(width: 8),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Semantics(header: true, child: Text(complete ? 'You’re all set up' : 'Your first week', style: fg(size: 16, weight: FontWeight.w800))),
                Text(complete ? 'Every first step done. Great start!' : '${s.done} of ${s.total} first steps done', style: fg(size: 13, color: AppColors.white70)),
              ]),
            ),
            IconButton(
              tooltip: 'Hide your first week steps',
              visualDensity: VisualDensity.compact,
              icon: const Icon(LucideIcons.x, size: 16, color: AppColors.white70),
              onPressed: _hide,
            ),
          ]),
          const SizedBox(height: 10),
          FgProgressBar(percent: s.done / s.total * 100, label: 'First week steps done'),
          const SizedBox(height: 12),
          ...spaced([
            for (final step in s.steps)
              Semantics(
                button: !step.done && step.href != null,
                label: '${step.title} (${step.done ? 'done' : 'to do'})',
                excludeSemantics: true,
                child: Material(
                  color: AppColors.noirEclipse.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(10),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: step.done || step.href == null ? null : () => openHref(context, step.href!),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      child: Row(children: [
                        Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: step.done ? AppColors.limeLight : null,
                            border: step.done ? null : Border.all(color: AppColors.white30A(0.4)),
                          ),
                          child: step.done ? const Icon(LucideIcons.check, size: 13, color: AppColors.noirEclipse) : null,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(step.title,
                              style: fg(size: 14, color: step.done ? AppColors.white70 : AppColors.white).copyWith(decoration: step.done ? TextDecoration.lineThrough : null)),
                        ),
                        if (!step.done && step.href != null) const Icon(LucideIcons.chevronRight, size: 16, color: AppColors.white70),
                      ]),
                    ),
                  ),
                ),
              ),
          ], 6),
        ]),
      ),
    );
  }
}
