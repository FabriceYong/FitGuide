import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/units.dart';
import '../../services/social_service.dart';
import '../../state/auth_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';

/// "5 min ago", "3 h ago", "2 days ago".
String timeAgo(String iso, DateTime now) {
  final at = DateTime.tryParse(iso);
  if (at == null) return '';
  final minutes = now.difference(at).inMinutes;
  if (minutes < 60) return minutes <= 1 ? 'just now' : '$minutes min ago';
  final hours = (minutes / 60).round();
  if (hours < 24) return '$hours h ago';
  final days = (hours / 24).round();
  return days == 1 ? 'yesterday' : '$days days ago';
}

String? _cheeredText(FeedItem item) {
  if (item.cheers == 0) return null;
  final names = item.cheeredBy;
  final others = item.cheers - names.length;
  final list = others > 0
      ? '${names.join(', ')} and $others more'
      : names.length > 1
          ? '${names.sublist(0, names.length - 1).join(', ')} and ${names.last}'
          : names.first;
  return '$list cheered';
}

/// Friends' activity on the community screen: your and your friends'
/// workouts from the last 30 days with records set, and cheers
/// (community/ActivityFeed.tsx).
class ActivityFeed extends StatefulWidget {
  const ActivityFeed({super.key});

  @override
  State<ActivityFeed> createState() => _ActivityFeedState();
}

class _ActivityFeedState extends State<ActivityFeed> {
  List<FeedItem>? _items;
  String? _nextBefore;
  bool _sharing = true;
  bool _more = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    fetchFeed().then((page) {
      if (!mounted) return;
      setState(() {
        _items = page.items;
        _nextBefore = page.nextBefore;
        _sharing = page.shareActivity;
      });
    }).catchError((Object err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : '$err');
    });
  }

  Future<void> _loadMore() async {
    final before = _nextBefore;
    if (before == null) return;
    setState(() => _more = true);
    try {
      final page = await fetchFeed(before: before);
      if (mounted) {
        setState(() {
          _items = [...?_items, ...page.items];
          _nextBefore = page.nextBefore;
        });
      }
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : '$err');
    } finally {
      if (mounted) setState(() => _more = false);
    }
  }

  /// Shown at once; put back if the API says no.
  void _toggleCheer(FeedItem item) {
    final on = !item.cheeredByYou;
    void show(bool cheered) => setState(() => _items = [for (final i in _items ?? <FeedItem>[]) i.id == item.id ? i.withCheer(cheered) : i]);
    show(on);
    cheerWorkout(item.id, on).catchError((Object err) {
      if (!mounted) return <String, dynamic>{};
      show(!on);
      setState(() => _error = err is ApiError ? err.message : '$err');
      return <String, dynamic>{};
    });
  }

  Future<void> _share(bool on) async {
    setState(() => _sharing = on);
    try {
      await setShareActivity(on);
    } catch (err) {
      if (mounted) {
        setState(() {
          _sharing = !on;
          _error = err is ApiError ? err.message : '$err';
        });
      }
    }
  }

  Widget _card(FeedItem item, Units units, DateTime now) {
    final who = item.isYou ? 'You' : item.name;
    final cheered = _cheeredText(item);
    final stats = [
      formatSeconds(item.durationSec),
      if (item.setCount > 0) '${item.setCount} ${item.setCount == 1 ? 'set' : 'sets'}',
      if (item.volumeKg > 0) '${thousands(weightIn(item.volumeKg, units))} ${units.weight} lifted',
      if (item.calories > 0) '${item.calories} kcal',
    ];
    return Semantics(
      container: true,
      label: '$who: ${item.workoutTitle}',
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            CircleAvatar(
              radius: 17,
              backgroundColor: AppColors.limeLight.withValues(alpha: 0.15),
              child: Text(who.isEmpty ? '?' : who[0], style: fg(size: 14, weight: FontWeight.w800, color: AppColors.limeLight)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text.rich(TextSpan(style: fg(size: 14), children: [
                  TextSpan(text: who, style: fg(size: 14, weight: FontWeight.w700)),
                  const TextSpan(text: ' finished '),
                  TextSpan(text: item.workoutTitle, style: fg(size: 14, weight: FontWeight.w700)),
                ])),
                Text(timeAgo(item.completedAt, now), style: fg(size: 12, color: AppColors.white70)),
              ]),
            ),
          ]),
          const SizedBox(height: 8),
          Text(stats.join('  ·  '), style: fg(size: 12, color: AppColors.white70)),
          if (item.records.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(spacing: 6, runSpacing: 6, children: [
              for (final r in item.records.take(3))
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.amber300.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: AppColors.amber300.withValues(alpha: 0.3)),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(LucideIcons.trophy, size: 12, color: AppColors.amber300),
                    const SizedBox(width: 4),
                    Text('${r.exerciseName}: ${formatRecord(r, units)}', style: fg(size: 11, weight: FontWeight.w700, color: AppColors.amber300)),
                  ]),
                ),
            ]),
          ],
          if (cheered != null || !item.isYou) ...[
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: Text(cheered ?? '', style: fg(size: 12, color: AppColors.white70))),
              if (!item.isYou)
                Semantics(
                  toggled: item.cheeredByYou,
                  child: FgButton(
                    label: item.cheeredByYou ? 'Cheered' : 'Cheer',
                    icon: LucideIcons.hand,
                    style: item.cheeredByYou ? FgButtonStyle.primary : FgButtonStyle.ghost,
                    height: 34,
                    radius: 10,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    onPressed: () => _toggleCheer(item),
                  ),
                ),
            ]),
          ],
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final units = context.watch<AuthController>().user?.units ?? Units.metric;
    final items = _items;
    final now = DateTime.now();
    return FgCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Icon(LucideIcons.activity, size: 20, color: AppColors.limeLight),
          const SizedBox(width: 8),
          Expanded(child: Semantics(header: true, child: Text('Friends’ activity', style: fg(size: 20, weight: FontWeight.w800)))),
        ]),
        const SizedBox(height: 12),
        CheckRow(value: _sharing, onChanged: _share, title: 'Show my workouts to friends'),
        const SizedBox(height: 12),
        if (_error != null) ...[ErrorLine(_error!), const SizedBox(height: 8)],
        if (items == null && _error == null) const LoadingRow('Loading…', padding: EdgeInsets.symmetric(vertical: 8)),
        if (items != null && items.isEmpty)
          Text('Nothing here yet. Finish a workout or add friends with your friend code, and workouts show up here.', style: fg(size: 14, color: AppColors.white70)),
        if (items != null && items.isNotEmpty) ...spaced([for (final item in items) _card(item, units, now)], 10),
        if (_nextBefore != null) ...[
          const SizedBox(height: 12),
          FgButton(label: 'Show older', style: FgButtonStyle.ghost, loading: _more, radius: 12, fontSize: 14, onPressed: _more ? null : _loadMore),
        ],
      ]),
    );
  }
}
