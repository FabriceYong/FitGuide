import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/units.dart';
import '../../services/recap_service.dart';
import '../../state/auth_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/share_card.dart';
import '../../widgets/ui.dart';

const _smallCarKg = 1200;

typedef RecapSlide = ({String kicker, String big, String line});

/// The recap's slides; ones with nothing to show are left out (RecapStory.tsx).
List<RecapSlide> recapSlides(Recap r, Units units) {
  final period = r.isMonth ? r.label.split(' ').first : r.label;
  final change = r.workouts - r.previousWorkouts;
  final than = r.isMonth ? 'month' : 'year';
  final slides = <RecapSlide>[
    (
      kicker: 'Your $period',
      big: '${r.workouts}',
      line: '${r.workouts == 1 ? 'workout' : 'workouts'} finished'
          '${r.previousWorkouts > 0 ? ', ${change > 0 ? '$change more than' : change < 0 ? '${-change} fewer than' : 'the same as'} the $than before' : ''}.',
    ),
  ];
  if (r.minutes > 0) {
    final hours = r.minutes / 60;
    slides.add((kicker: 'Time well spent', big: hours >= 2 ? '${hours.round()} h' : '${r.minutes} min', line: 'across ${r.activeDays} active ${r.activeDays == 1 ? 'day' : 'days'}.'));
  }
  if (r.volumeKg > 0) {
    final cars = r.volumeKg / _smallCarKg;
    slides.add((
      kicker: 'Weight lifted',
      big: '${thousands(weightIn(r.volumeKg, units))} ${units.weight}',
      line: cars >= 1 ? 'About the weight of ${cars >= 2 ? '${cars.floor()} small cars' : 'a small car'}.' : 'Every rep counts.',
    ));
  }
  final record = r.topRecord;
  if (record != null) {
    slides.add((kicker: 'Best record', big: formatRecord(record, units), line: '${record.exerciseName}${r.records > 1 ? ', one of ${r.records} new personal records' : ''}.'));
  }
  final muscle = r.topMuscle;
  final favourite = r.favouriteWorkout;
  if (muscle != null || favourite != null) {
    slides.add((
      kicker: 'Your go-to',
      big: muscle?.region ?? favourite!.title,
      line: [
        if (muscle != null) 'Trained in ${muscle.workouts} ${muscle.workouts == 1 ? 'workout' : 'workouts'}.',
        if (favourite != null && favourite.times > 1) 'Favourite workout: ${favourite.title} (${favourite.times}×).',
      ].join(' '),
    ));
  }
  if (r.foodDays > 0) slides.add((kicker: 'Fuel', big: '${r.foodDays}', line: '${r.foodDays == 1 ? 'day' : 'days'} with meals logged.'));
  slides.add((kicker: r.label, big: 'Nice work', line: 'Here’s to the next $than.'));
  return slides;
}

Future<void> openRecap(BuildContext context, {String? month, int? year}) =>
    Navigator.of(context).push(MaterialPageRoute(fullscreenDialog: true, builder: (_) => RecapStoryScreen(month: month, year: year)));

/// The recap as swipeable slides: a month's (or a year's) training in a few
/// numbers, ending with a picture card to share (RecapStory.tsx).
class RecapStoryScreen extends StatefulWidget {
  const RecapStoryScreen({super.key, this.month, this.year});
  final String? month;
  final int? year;

  @override
  State<RecapStoryScreen> createState() => _RecapStoryScreenState();
}

class _RecapStoryScreenState extends State<RecapStoryScreen> {
  final _pages = PageController();
  Recap? _recap;
  String? _error;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    fetchRecap(month: widget.month, year: widget.year).then((r) {
      if (mounted) setState(() => _recap = r);
    }).catchError((Object err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : '$err');
    });
  }

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  void _go(int delta, int count) {
    final next = (_index + delta).clamp(0, count - 1);
    _pages.animateToPage(next, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
  }

  void _share(Recap r, Units units) {
    final record = r.topRecord;
    showShareCard(
      context,
      ShareCardData(
        label: r.isMonth ? 'MY MONTH' : 'MY YEAR',
        title: r.label,
        subtitle: '${r.workouts} workouts · ${r.activeDays} active days',
        stats: [
          ('${r.workouts}', 'Workouts'),
          (thousands(r.minutes), 'Minutes'),
          if (r.volumeKg > 0) ('${thousands(weightIn(r.volumeKg, units))} ${units.weight}', 'Lifted'),
          ('${r.activeDays}', 'Active days'),
        ],
        records: [if (record != null) '${record.exerciseName} · ${formatRecord(record, units)}'],
      ),
      filename: 'fitguide-${r.key}.png',
      text: 'My ${r.label} on FitGuide',
      kind: 'recap',
    );
  }

  @override
  Widget build(BuildContext context) {
    final units = context.watch<AuthController>().user?.units ?? Units.metric;
    final r = _recap;
    final slides = r == null ? <RecapSlide>[] : recapSlides(r, units);
    return Scaffold(
      backgroundColor: AppColors.noirEclipse,
      body: SafeArea(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 4, 0),
            child: Row(children: [
              for (final (i, _) in slides.indexed) ...[
                if (i > 0) const SizedBox(width: 4),
                Expanded(child: Container(height: 4, decoration: BoxDecoration(color: i <= _index ? AppColors.limeLight : AppColors.whiteA(0.2), borderRadius: BorderRadius.circular(2)))),
              ],
              if (slides.isEmpty) const Spacer(),
              IconButton(tooltip: 'Close the recap', icon: const Icon(LucideIcons.x, color: AppColors.white70), onPressed: () => Navigator.of(context).pop()),
            ]),
          ),
          Expanded(
            child: r == null
                ? Center(child: _error != null ? Padding(padding: const EdgeInsets.all(24), child: ErrorLine(_error!)) : const LoadingRow('Putting it together…'))
                : PageView(
                    controller: _pages,
                    onPageChanged: (i) => setState(() => _index = i),
                    children: [
                      for (final (i, s) in slides.indexed)
                        Semantics(
                          liveRegion: true,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 28),
                            child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(s.kicker.toUpperCase(), style: fg(size: 12, weight: FontWeight.w800, color: AppColors.limeLight, letterSpacing: 1.5)),
                              const SizedBox(height: 10),
                              Text(s.big, style: fg(size: 44, weight: FontWeight.w900, height: 1.05)),
                              const SizedBox(height: 10),
                              Text(s.line, style: fg(size: 17, color: AppColors.whiteA(0.8))),
                              if (i == slides.length - 1) ...[
                                const SizedBox(height: 20),
                                FgButton(label: 'Share my recap', icon: LucideIcons.share2, style: FgButtonStyle.ghost, radius: 12, fontSize: 14, onPressed: () => _share(r, units)),
                              ],
                            ]),
                          ),
                        ),
                    ],
                  ),
          ),
          if (slides.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                IconButton.filledTonal(tooltip: 'Previous', onPressed: _index == 0 ? null : () => _go(-1, slides.length), icon: const Icon(LucideIcons.chevronLeft)),
                Expanded(child: Text('${_index + 1} / ${slides.length}', textAlign: TextAlign.center, style: fg(size: 12, color: AppColors.white70))),
                IconButton.filled(
                  tooltip: _index == slides.length - 1 ? 'Done' : 'Next',
                  style: IconButton.styleFrom(backgroundColor: AppColors.limeLight, foregroundColor: AppColors.noirEclipse),
                  onPressed: _index == slides.length - 1 ? () => Navigator.of(context).pop() : () => _go(1, slides.length),
                  icon: const Icon(LucideIcons.chevronRight),
                ),
              ]),
            ),
        ]),
      ),
    );
  }
}

/// On the home tab: "Your October recap is ready" at the start of a month (and of a year).
class RecapOffers extends StatefulWidget {
  const RecapOffers({super.key, this.bottomGap = 0});
  final double bottomGap;

  @override
  State<RecapOffers> createState() => _RecapOffersState();
}

class _RecapOffersState extends State<RecapOffers> {
  List<Recap> _offers = [];

  @override
  void initState() {
    super.initState();
    fetchRecapOffers().then((o) {
      if (mounted) setState(() => _offers = o);
    }).catchError((Object _) {});
  }

  @override
  Widget build(BuildContext context) {
    if (_offers.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: EdgeInsets.only(bottom: widget.bottomGap),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: spaced([
        for (final o in _offers)
          FgCard(
            borderColor: AppColors.limeLight.withValues(alpha: 0.3),
            child: Row(children: [
              const IconTile(LucideIcons.sparkles, color: AppColors.limeLight, radius: 12),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Semantics(header: true, child: Text('Your ${o.isMonth ? o.label.split(' ').first : o.label} recap is ready', style: fg(size: 15, weight: FontWeight.w800))),
                  Text('${o.workouts} ${o.workouts == 1 ? 'workout' : 'workouts'}, in a few slides.', style: fg(size: 12, color: AppColors.white70)),
                ]),
              ),
              FgButton(
                label: 'Watch',
                height: 38,
                radius: 10,
                fontSize: 13,
                fontWeight: FontWeight.w700,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                onPressed: () => o.isMonth ? openRecap(context, month: o.key) : openRecap(context, year: int.tryParse(o.key)),
              ),
            ]),
          ),
      ], 12)),
    );
  }
}

/// On Progress: watch any of the last 12 months' recaps, or the year so far.
class RecapPicker extends StatefulWidget {
  const RecapPicker({super.key});

  @override
  State<RecapPicker> createState() => _RecapPickerState();
}

class _RecapPickerState extends State<RecapPicker> {
  late final List<String> _months = () {
    final now = DateTime.now();
    return [for (var i = 0; i < 12; i++) ymd(DateTime(now.year, now.month - i, 1)).substring(0, 7)];
  }();
  late String _month = _months[1];

  static const _names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  @override
  Widget build(BuildContext context) {
    String label(String key) => '${_names[int.parse(key.substring(5)) - 1]} ${key.substring(0, 4)}';
    return Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.end, children: [
      SizedBox(
        width: 220,
        child: FormFieldLabel(
          label: 'Month',
          child: FgSelect<String>(
            value: _month,
            semanticLabel: 'Month',
            options: [for (final (i, m) in _months.indexed) (m, '${label(m)}${i == 0 ? ' (so far)' : ''}')],
            onChanged: (m) => setState(() => _month = m),
          ),
        ),
      ),
      FgButton(label: 'Watch the recap', icon: LucideIcons.film, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: () => openRecap(context, month: _month)),
      FgButton(label: '${DateTime.now().year} so far', style: FgButtonStyle.ghost, radius: 12, fontSize: 14, onPressed: () => openRecap(context, year: DateTime.now().year)),
    ]);
  }
}
