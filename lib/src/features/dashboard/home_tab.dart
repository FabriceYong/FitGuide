import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/shared/tailoring.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../models/training.dart';
import '../../models/user.dart';
import '../../navigation.dart';
import '../../services/catalog_service.dart';
import '../../services/training_service.dart';
import '../../state/auth_controller.dart';
import '../../state/dashboard_controller.dart';
import '../../state/workouts_controller.dart';
import '../../widgets/charts.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/ui.dart';
import '../../widgets/workout_card.dart';
import '../common/parq_modal.dart';
import '../plan/plan_suggestion.dart';
import '../progress/recap_story.dart';
import 'article_screen.dart';
import 'articles.dart';
import 'coach_notes.dart';
import 'hero_carousel.dart';
import 'readiness_card.dart';
import 'starter_journey.dart';
import 'today_panel.dart';

/// Days since 1970, used to rotate daily picks.
int _dayNumber() => DateTime.now().millisecondsSinceEpoch ~/ 86400000;

/// "Matched to your level (Beginner), goal (Weight) and focus areas", naming what the profile has.
String? _matchedTo(AppUser? user) {
  final parts = [
    if (user?.fitnessLevel != null) 'level (${user!.fitnessLevel})',
    if (user?.goal != null) 'goal (${user!.goal})',
    if (user?.focusAreas.isNotEmpty ?? false) 'focus areas',
    if (user?.equipment.isNotEmpty ?? false) 'equipment',
    if (user?.workoutMinutes != null) 'time',
    if (user?.limitations.isNotEmpty ?? false) 'limitations',
  ];
  if (parts.isEmpty) return null;
  final list = parts.length > 1 ? '${parts.sublist(0, parts.length - 1).join(', ')} and ${parts.last}' : parts.first;
  return 'Matched to your $list.';
}

const _tips = [
  'Adults benefit from at least 150 minutes of moderate activity a week, plus muscle-strengthening work on two days (WHO).',
  'Some activity is better than none. Even short walks count toward your weekly minutes (WHO).',
  'Warm up for 5–10 minutes before hard efforts: easy cardio and the movements you are about to load.',
  'Long static stretches of a minute or more right before lifting can briefly lower strength. Warm up with movement and stretch afterwards.',
  'Progress gradually: change one thing at a time, such as a little more weight or one more rep.',
  'Light weights build muscle too, as long as you take your sets close to failure.',
  'Resting 2–3 minutes between heavy sets lets you lift more than resting one minute does.',
  'Give a muscle group a day or two to recover after a hard session before training it hard again.',
  'Soreness that peaks a day or two after a new workout is normal. Sharp pain or joint pain is not: stop and get it checked.',
  'Most adults need 7–9 hours of sleep. It is when much of your recovery happens.',
  'Caffeine can boost performance, but it stays in your body for hours. Skip it within about 6 hours of bedtime.',
  'For people who lift, about 1.6 g of protein per kg of body weight a day covers what muscles can use for growth.',
  'Spread your protein over the day: 20–40 g per meal supports muscle repair better than one big serving.',
  'Most adults should aim for about 30 g of fibre a day. It keeps you full and helps digestion (NHS).',
  'Pale yellow urine is a simple sign that you are drinking enough.',
  'Thirsty during long or hot sessions? Drink regularly; you don’t need sports drinks for workouts under an hour.',
  'Breathe out as you push or lift, and breathe in as you lower, instead of holding your breath on every rep.',
  'Good form beats heavy weight. If your form breaks down, lower the load.',
  'You can’t burn fat from one spot. Crunches strengthen your abs, but fat loss happens across the whole body.',
  'Muscle doesn’t turn into fat when you stop training. They are different tissues: you lose one and may gain the other.',
  'Muscles you trained before grow back faster than they first grew. Muscle memory is real.',
  'A week or two off won’t erase your strength. Endurance fades sooner than strength does.',
  'Lifting weights helps keep your bones strong as you age.',
  'Balance exercises, such as standing on one leg, lower the risk of falls in older adults.',
  'Regular aerobic exercise strengthens your heart and can lower your resting heart rate.',
  'The 10,000-step goal began as a marketing slogan. Studies find big health benefits from around 7,000 steps a day.',
  'Sitting for hours? Getting up for a few minutes every half hour helps your body control blood sugar.',
  'Short sessions count. Ten minutes of movement is better than skipping a day.',
];

const _feeds = [('healthline', 'Healthline'), ('mnt', 'Medical News Today')];

/// The dashboard's start page: what to do next, your numbers, and ways into
/// the rest of FitGuide (dashboard/components/HomeTab.tsx).
class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  // Coaches' and admins' articles, newest first; the built-in guides show without them.
  List<Article> _written = const [];

  ProgressData? _progress;
  String? _progressError;
  int? _programCount;
  bool _parqDone = hasParqResult();
  String? _loadedFor;

  @override
  void initState() {
    super.initState();
    fetchPublishedArticles().then((list) {
      if (mounted) setState(() => _written = list);
    }).catchError((Object _) {});
    fetchPrograms().then((p) {
      if (mounted) setState(() => _programCount = p.length);
    }).catchError((_) {});
  }

  /// Load for this account, and again whenever training data changes.
  void _loadProgress(AuthController auth, int dataVersion) {
    final id = auth.hasAccount ? auth.user!.id : null;
    final key = id == null ? null : '$id:$dataVersion';
    if (key == _loadedFor) return;
    if (!(_loadedFor?.startsWith('$id:') ?? false)) _progress = null;
    _loadedFor = key;
    if (id == null) return;
    fetchProgressSummary().then((p) {
      if (mounted) setState(() => _progress = p);
    }).catchError((Object err) {
      if (mounted) setState(() => _progressError = '$err');
    });
  }

  List<HeroSlide> _slides(BuildContext context, List<Workout> recommended, int workoutCount) {
    final dashboard = context.read<DashboardController>();
    final enrollment = _progress?.summary.activeEnrollment;
    final nextDay = enrollment?.nextDay;
    final first = recommended.firstOrNull;
    return [
      if (nextDay != null && enrollment != null)
        HeroSlide(
          id: 'next',
          title: 'Up next: ${nextDay.title}',
          subtitle:
              'Week ${nextDay.week}, day ${nextDay.day} of ${enrollment.programTitle}${nextDay.date.isNotEmpty ? ', scheduled for ${formatDay(nextDay.date)}' : ''}.',
          photo: '1517836357463-d25dfeac3438',
          primary: HeroCta('Start session', () => openPlayer(context, nextDay.workoutSlug, program: ProgramContext.of(enrollment, nextDay))),
          secondary: HeroCta('See the schedule', () => openHref(context, enrollment.isPersonalPlan ? '/plan' : '/programs/${enrollment.programSlug}')),
        )
      else
        HeroSlide(
          id: 'start',
          title: 'Ready for today’s workout?',
          subtitle: '${workoutCount > 0 ? workoutCount : 'Dozens of'} guided workouts with step-by-step instructions, a timer and form tips.',
          photo: '1517836357463-d25dfeac3438',
          primary: first != null
              ? HeroCta('Start ${first.title}', () => openWorkout(context, first.slug))
              : HeroCta('Browse workouts', () => openHref(context, '/workouts')),
          secondary: HeroCta('Explore all workouts', () => dashboard.setTab(DashboardTab.explore)),
        ),
      HeroSlide(
        id: 'plan',
        title: 'A plan built around you',
        subtitle: 'Answer a few questions and FitGuide schedules your weeks. The AI coach can adjust the plan as you go.',
        photo: '1534438327276-14e5300c3a48',
        primary: HeroCta(enrollment != null ? 'Open my plan' : 'Build my plan', () => openHref(context, '/plan')),
        secondary: HeroCta('Browse programs', () => dashboard.setTab(DashboardTab.programs)),
      ),
      HeroSlide(
        id: 'nutrition',
        title: 'Eat for your goal',
        subtitle: 'Daily calorie and macro targets from your profile, a food log and simple meal plans.',
        photo: '1490645935967-10de6ba17061',
        primary: HeroCta('Open nutrition', () => openHref(context, '/nutrition')),
        secondary: HeroCta('Calculators', () => dashboard.setTab(DashboardTab.tools)),
      ),
      HeroSlide(
        id: 'community',
        title: 'Train with friends',
        subtitle: 'Add friends with a code, start a challenge and see who’s ahead on the leaderboard.',
        photo: '1571019614242-c5c5dee9f50b',
        primary: HeroCta('Go to community', () => openHref(context, '/community')),
        secondary: HeroCta('Read reviews', () => dashboard.setTab(DashboardTab.reviews)),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    _loadProgress(auth, context.select<DashboardController, int>((d) => d.dataVersion));
    final user = auth.user;
    final catalog = context.watch<WorkoutsController>();
    final dashboard = context.read<DashboardController>();
    final summary = _progress?.summary;
    final recentSlugs = [
      for (final s in _progress?.recentSessions ?? const <SessionRecord>[])
        if (DateTime.now().difference(DateTime.tryParse(s.completedAt) ?? DateTime(1970)).inDays < 7) s.workoutSlug,
    ];
    final picks = rankWorkouts(catalog.workouts, user, recentSlugs: recentSlugs, day: _dayNumber(), limit: 3);
    final enrollment = summary?.activeEnrollment;
    final List<ActivityDay> lastWeek = summary == null ? const [] : summary.days.sublist(summary.days.length > 7 ? summary.days.length - 7 : 0);
    final weeklySessions = summary == null
        ? <int>[]
        : [for (var i = 0; i < 12; i++) summary.days.skip(i * 7).take(7).fold<int>(0, (n, d) => n + d.sessions)];
    final matched = _matchedTo(user);
    final parqText = Text.rich(TextSpan(children: [
      TextSpan(text: 'New to exercise or returning after a break? ', style: fg(size: 14, weight: FontWeight.w700, color: AppColors.limeLight)),
      TextSpan(text: 'Take the one-minute PAR-Q health check first.', style: fg(size: 14)),
    ]));
    final parqButton = FgButton(
      label: 'Take the check',
      height: 30,
      radius: 999,
      fontSize: 12,
      fontWeight: FontWeight.w700,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      onPressed: () async {
        await showParqModal(context);
        if (mounted) setState(() => _parqDone = hasParqResult());
      },
    );

    final wide = atLeast(context, Breakpoints.md);
    final gutter = pageGutter(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (auth.isGuest)
          Container(
            padding: EdgeInsets.symmetric(horizontal: gutter, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.royalNebula.withValues(alpha: 0.2),
              border: Border(bottom: BorderSide(color: AppColors.royalNebula.withValues(alpha: 0.4))),
            ),
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 12,
              runSpacing: 8,
              children: [
                Text('You’re browsing as a guest. Create a free account to save workouts, favorites and progress.', style: fg(size: 14)),
                FgButton(
                  label: 'Create account',
                  height: 32,
                  radius: 999,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  onPressed: auth.startSignUp,
                ),
              ],
            ),
          ),
        if (!_parqDone)
          Container(
            padding: EdgeInsets.fromLTRB(gutter, 12, gutter - 12, 12),
            decoration: BoxDecoration(
              color: AppColors.limeLight.withValues(alpha: 0.1),
              border: Border(bottom: BorderSide(color: AppColors.limeLight.withValues(alpha: 0.2))),
            ),
            // The text gets the full width on a phone, with the button under
            // it; a tablet has room for both on one line.
            child: Row(
              crossAxisAlignment: wide ? CrossAxisAlignment.center : CrossAxisAlignment.start,
              children: [
                Padding(padding: EdgeInsets.only(top: wide ? 0 : 2), child: const Icon(LucideIcons.shieldCheck, size: 18, color: AppColors.limeLight)),
                const SizedBox(width: 10),
                if (wide) ...[
                  Expanded(child: parqText),
                  const SizedBox(width: 12),
                  parqButton,
                ] else
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [parqText, const SizedBox(height: 8), parqButton])),
                IconButton(
                  tooltip: 'Hide the health check reminder',
                  onPressed: () => setState(() => _parqDone = true),
                  icon: const Icon(LucideIcons.x, size: 16, color: AppColors.white70),
                ),
              ],
            ),
          ),
        HeroCarousel(
          slides: _slides(context, picks.map((p) => p.workout).toList(), catalog.workouts.length),
          greeting: (user?.name.isNotEmpty ?? false) ? 'Hello, ${user!.firstName}' : null,
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(gutter, wide ? 40 : 28, gutter, 32),
          child: MaxWidth(
            1600,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: spaced([
                // First-week steps, coach notes, readiness and a plan suggestion sit above Today.
                if (auth.hasAccount)
                  Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    StarterJourney(key: ValueKey('starter-${auth.user!.id}'), bottomGap: 16),
                    RecapOffers(key: ValueKey('recaps-${auth.user!.id}'), bottomGap: 16),
                    CoachNotes(key: ValueKey('notes-${auth.user!.id}'), bottomGap: 16),
                    ReadinessCard(
                      key: ValueKey('readiness-${auth.user!.id}'),
                      onPlanChanged: () => context.read<DashboardController>().dataChanged(),
                      bottomGap: 16,
                    ),
                    if (enrollment != null)
                      PlanSuggestionCard(
                        key: ValueKey('suggestion-${enrollment.id}'),
                        onApplied: (_) => context.read<DashboardController>().dataChanged(),
                        bottomGap: 16,
                      ),
                    TodayPanel(key: ValueKey('today-${auth.user!.id}'), summary: summary, suggestion: picks.firstOrNull?.workout),
                  ]),
                _section(
                  header: SectionHeader('Your progress', action: auth.hasAccount ? 'See all →' : null, onAction: () => dashboard.setTab(DashboardTab.progress)),
                  children: [
                    if (!auth.hasAccount)
                      FgCard(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('With an account, your sessions, streaks and personal records appear here.', style: fg(size: 16, color: AppColors.white70)),
                            const SizedBox(height: 16),
                            FgButton(label: 'Create an account', radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: auth.startSignUp),
                          ],
                        ),
                      )
                    else if (_progressError != null && summary == null)
                      ErrorLine(_progressError!, size: 16)
                    else if (summary == null)
                      FgGrid(columns: 2, lg: 4, gap: wide ? 16 : 12, children: [for (var i = 0; i < 4; i++) const Skeleton(height: 150)])
                    else ...[
                      FgGrid(columns: 2, lg: 4, gap: wide ? 16 : 12, children: [
                        StatCard(
                          icon: LucideIcons.dumbbell,
                          label: 'Total workouts',
                          value: '${summary.total('sessions')}',
                          color: const Color(0xFF00C4B4),
                          data: weeklySessions,
                          chartLabel: 'Workouts per week over the last 12 weeks',
                        ),
                        StatCard(
                          icon: LucideIcons.clock,
                          label: 'Minutes this week',
                          value: '${summary.week('minutes')}',
                          suffix: 'min',
                          color: const Color(0xFF8B7CF6),
                          data: [for (final d in lastWeek) d.minutes],
                          chartType: SparkType.line,
                          chartLabel: 'Minutes per day over the last 7 days',
                        ),
                        StatCard(
                          icon: LucideIcons.flame,
                          label: 'Calories this week',
                          value: '${summary.week('calories')}',
                          suffix: 'kcal',
                          color: const Color(0xFFEF4444),
                          data: [for (final d in lastWeek) d.calories],
                          chartType: SparkType.bar,
                          chartLabel: 'Calories per day over the last 7 days',
                        ),
                        StatCard(
                          icon: LucideIcons.target,
                          label: 'Week streak',
                          value: '${summary.weekStreak.weeks}',
                          suffix: summary.weekStreak.weeks == 1 ? 'week' : 'weeks',
                          footnote: summary.weekStreak.thisWeekText,
                          color: const Color(0xFF10B981),
                          data: [for (final d in lastWeek) d.sessions],
                          chartType: SparkType.bar,
                          chartLabel: 'Sessions per day over the last 7 days',
                        ),
                      ]),
                      if (enrollment == null) ...[
                        const SizedBox(height: 16),
                        FgCard(
                          padding: const EdgeInsets.all(16),
                          borderColor: AppColors.limeLight.withValues(alpha: 0.3),
                          onTap: () => openHref(context, '/plan'),
                          child: Row(
                            children: [
                              const Icon(LucideIcons.calendarDays, size: 20, color: AppColors.limeLight),
                              const SizedBox(width: 12),
                              Expanded(child: Text('No plan yet. Build one in a minute and get a weekly schedule.', style: fg(size: 14))),
                              const Icon(LucideIcons.arrowRight, size: 16, color: AppColors.limeLight),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ],
                ),
                _section(
                  header: SectionHeader(
                    'Recommended for you',
                    subtitle: matched == null
                        ? null
                        : Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text('$matched ', style: fg(size: 14, color: AppColors.white70)),
                              LinkText('Change these in your profile', color: AppColors.white70, weight: FontWeight.w400, underline: true, onTap: () => dashboard.setTab(DashboardTab.profile)),
                              Text('.', style: fg(size: 14, color: AppColors.white70)),
                            ],
                          ),
                    action: 'See all →',
                    onAction: () => dashboard.setTab(DashboardTab.explore),
                  ),
                  children: [
                    if (catalog.loading)
                      FgGrid(columns: 1, md: 3, gap: wide ? 24 : 16, children: [for (var i = 0; i < 3; i++) const Skeleton(height: 288, radius: 24)])
                    else if (picks.isEmpty)
                      Text('No workouts to recommend yet.', style: fg(size: 16, color: AppColors.white70))
                    else
                      FgGrid(columns: 1, md: 3, gap: wide ? 24 : 16, children: [
                        for (final p in picks)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              WorkoutCard(workout: p.workout, tall: true, calories: personalCalories(p.workout.calories, user)),
                              if (p.reasons.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Semantics(
                                  label: 'Why ${p.workout.title} suits you',
                                  child: Wrap(
                                    spacing: 6,
                                    runSpacing: 6,
                                    children: [
                                      for (final r in p.reasons)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: AppColors.limeLight.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(999),
                                            border: Border.all(color: AppColors.limeLight.withValues(alpha: 0.25)),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(LucideIcons.check, size: 12, color: AppColors.limeLight),
                                              const SizedBox(width: 4),
                                              Text(r, style: fg(size: 11, weight: FontWeight.w600)),
                                            ],
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                      ]),
                  ],
                ),
                const _TipOfTheDay(),
                // Ways into the rest of FitGuide, for visitors finding their way around (members have "Today").
                if (!auth.hasAccount)
                _section(
                  header: SectionHeader(
                    'Everything in FitGuide',
                    subtitle: Text(
                      '${catalog.workouts.isNotEmpty ? '${catalog.workouts.length} workouts' : 'Guided workouts'}${_programCount != null && _programCount! > 0 ? ', $_programCount multi-week programs' : ''}, personal plans, nutrition tracking and more.',
                      style: fg(size: 14, color: AppColors.white70),
                    ),
                  ),
                  children: [
                    FgGrid(columns: 1, sm: 2, lg: 4, gap: wide ? 16 : 10, children: [
                      _Feature(LucideIcons.sparkles, const Color(0xFF00C4B4), 'Personal plan & AI coach', 'A weekly schedule for your goal, level and equipment. Ask the coach to change it.', () => openHref(context, '/plan')),
                      _Feature(LucideIcons.calendarDays, const Color(0xFF8B7CF6), 'Programs', 'Multi-week programs that track how well you stick to the schedule.', () => dashboard.setTab(DashboardTab.programs)),
                      _Feature(LucideIcons.utensils, const Color(0xFF34D399), 'Nutrition', 'Calorie and macro targets, a food log and meal plans.', () => openHref(context, '/nutrition')),
                      _Feature(LucideIcons.trendingUp, const Color(0xFFFB923C), 'Progress', 'Streaks, personal records, body measurements and wearable data.', () => dashboard.setTab(DashboardTab.progress)),
                      _Feature(LucideIcons.users, const Color(0xFFF472B6), 'Community', 'Friends, challenges and leaderboards.', () => openHref(context, '/community')),
                      _Feature(LucideIcons.bookOpen, const Color(0xFF60A5FA), 'Exercise library', 'How to do each exercise, with form cues and common mistakes.', () => dashboard.setTab(DashboardTab.explore)),
                      _Feature(LucideIcons.calculator, const Color(0xFFFBBF24), 'Calculators', 'One-rep max, daily calories, heart rate zones and more.', () => dashboard.setTab(DashboardTab.tools)),
                      if (user?.isPlus ?? false)
                        _Feature(LucideIcons.crown, const Color(0xFFFCD34D), 'Your PLUS membership', 'Manage your subscription and see what’s included.', () => openHref(context, '/plus'))
                      else
                        _Feature(LucideIcons.crown, const Color(0xFFFCD34D), 'FitGuide PLUS', 'Every PLUS workout and program, and unlimited coach messages.', () => openHref(context, '/plus')),
                    ]),
                  ],
                ),
                _section(
                  header: SectionHeader('Articles & guides', subtitle: Text('Short reads by FitGuide coaches and the editorial team.', style: fg(size: 14, color: AppColors.white70))),
                  children: [
                    FgGrid(columns: 1, md: 3, gap: wide ? 20 : 12, children: [for (final a in [..._written, ...articles]) _ArticleCard(article: a)]),
                    SizedBox(height: wide ? 32 : 16),
                    const _LiveFeed(),
                  ],
                ),
                const _CommunityHighlights(),
              ], wide ? 56 : 36),
            ),
          ),
        ),
      ],
    );
  }

  Widget _section({required Widget header, required List<Widget> children}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [header, const SizedBox(height: 14), ...children]);
  }
}

class _Feature extends StatelessWidget {
  const _Feature(this.icon, this.color, this.title, this.text, this.onTap);
  final IconData icon;
  final Color color;
  final String title;
  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    // A card in the tablet grid: icon above the title and description.
    if (atLeast(context, Breakpoints.sm)) {
      return FgCard(
        padding: const EdgeInsets.all(20),
        borderColor: AppColors.whiteA(0.1),
        onTap: onTap,
        // Text at the card's full width, so it wraps the same when the grid
        // measures the row as when it lays it out.
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Align(alignment: Alignment.centerLeft, child: IconTile(icon, color: color, size: 44, radius: 12, alpha: 0x1F)),
            const SizedBox(height: 16),
            Text(title, style: fg(size: 16, weight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(text, style: fg(size: 14, color: AppColors.white70)),
          ],
        ),
      );
    }
    // A list row on a phone: icon beside the title and description.
    return FgCard(
      padding: const EdgeInsets.all(14),
      borderColor: AppColors.whiteA(0.1),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconTile(icon, color: color, size: 40, radius: 12, alpha: 0x1F),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: fg(size: 15, weight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(text, style: fg(size: 13, color: AppColors.white70)),
              ],
            ),
          ),
          const Padding(padding: EdgeInsets.only(top: 12), child: Icon(LucideIcons.chevronRight, size: 16, color: AppColors.white70)),
        ],
      ),
    );
  }
}

class _ArticleCard extends StatelessWidget {
  const _ArticleCard({required this.article});
  final Article article;

  @override
  Widget build(BuildContext context) {
    final color = articleColor(article.category);
    final image = article.image(600);
    return FgCard(
      padding: EdgeInsets.zero,
      borderColor: AppColors.whiteA(0.1),
      onTap: () => Navigator.of(context).push(pageRoute(ArticleScreen(article: article))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 160,
            child: image != null
                ? NetImage(image)
                : DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(colors: [color.withAlpha(0x40), Colors.transparent], begin: Alignment.topLeft, end: Alignment.bottomRight))),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${article.category} · ${article.readMinutes} MIN', style: fg(size: 10, weight: FontWeight.w900, color: color, letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Text(article.title, style: fg(size: 16, weight: FontWeight.w800, height: 1.35)),
                const SizedBox(height: 8),
                Text(article.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: fg(size: 12, color: AppColors.white70)),
                const SizedBox(height: 6),
                Text('By ${article.author}', maxLines: 1, overflow: TextOverflow.ellipsis, style: fg(size: 11, color: AppColors.white70)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// How long each tip stays before the next one.
const _tipDuration = Duration(seconds: 7);

/// Starts on the day's tip and moves to the next every few seconds. It pauses
/// while the pointer or keyboard focus is on it, so it can be read in full.
class _TipOfTheDay extends StatefulWidget {
  const _TipOfTheDay();

  @override
  State<_TipOfTheDay> createState() => _TipOfTheDayState();
}

class _TipOfTheDayState extends State<_TipOfTheDay> {
  int _index = _dayNumber() % _tips.length;
  Timer? _timer;
  bool _hovered = false;
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _schedule();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  /// Restarts after every change, so "Next tip" gives the new tip its full time.
  void _schedule() {
    _timer?.cancel();
    _timer = _hovered || _focused ? null : Timer(_tipDuration, _next);
  }

  void _next() {
    if (!mounted) return;
    setState(() => _index = (_index + 1) % _tips.length);
    _schedule();
  }

  void _pause({bool? hovered, bool? focused}) {
    _hovered = hovered ?? _hovered;
    _focused = focused ?? _focused;
    _schedule();
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => _pause(hovered: true),
      onExit: (_) => _pause(hovered: false),
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        onFocusChange: (focused) => _pause(focused: focused),
        child: _banner(context),
      ),
    );
  }

  Widget _banner(BuildContext context) {
    return Semantics(
      label: 'Tip of the day',
      container: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.limeLight.withValues(alpha: 0.2)),
          gradient: LinearGradient(colors: [AppColors.limeLight.withValues(alpha: 0.1), Colors.transparent]),
        ),
        child: Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 16,
          runSpacing: 12,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(color: AppColors.limeLight, borderRadius: BorderRadius.circular(999)),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(LucideIcons.lightbulb, size: 14, color: AppColors.noirEclipse),
                  const SizedBox(width: 6),
                  Text('TIP', style: fg(size: 10, weight: FontWeight.w900, color: AppColors.noirEclipse, letterSpacing: 1.5)),
                ],
              ),
            ),
            Text(_tips[_index], style: fg(size: 14, weight: FontWeight.w500)),
            LinkText('Next tip', size: 12, weight: FontWeight.w700, onTap: _next),
          ],
        ),
      ),
    );
  }
}

/// Latest health news from two RSS feeds (fetched through the API).
class _LiveFeed extends StatefulWidget {
  const _LiveFeed();

  @override
  State<_LiveFeed> createState() => _LiveFeedState();
}

class _LiveFeedState extends State<_LiveFeed> {
  String _feed = 'healthline';
  List<FeedArticle>? _articles;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final feed = _feed;
    fetchFeedArticles(feed).then((list) {
      if (mounted && feed == _feed) setState(() => _articles = list);
    }).catchError((Object err) {
      if (mounted && feed == _feed) setState(() => _error = '$err');
    });
  }

  void _choose(String id) {
    setState(() {
      _feed = id;
      _articles = null;
      _error = null;
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final label = _feeds.firstWhere((f) => f.$1 == _feed).$2;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 12,
          runSpacing: 12,
          children: [
            Semantics(header: true, child: Text('Health news', style: fg(size: 18, weight: FontWeight.w800))),
            Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.whiteA(0.2))),
              // Wraps onto a second line when large text doesn't fit.
              child: Wrap(
                children: [
                  for (final (id, name) in _feeds)
                    Semantics(
                      button: true,
                      selected: _feed == id,
                      child: Material(
                        color: _feed == id ? AppColors.limeLight : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(8),
                          onTap: () => _choose(id),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            child: Text(name, style: fg(size: 12, weight: FontWeight.w700, color: _feed == id ? AppColors.noirEclipse : AppColors.white70)),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (_error != null)
          FgCard(
            padding: const EdgeInsets.all(16),
            borderColor: AppColors.whiteA(0.1),
            child: Row(
              children: [
                Expanded(child: Text('The news feed is unavailable right now.', style: fg(size: 14, color: AppColors.white70))),
                InkWell(
                  onTap: () {
                    setState(() => _error = null);
                    _load();
                  },
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(LucideIcons.refreshCw, size: 14, color: AppColors.limeLight),
                      const SizedBox(width: 6),
                      Text('Try again', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.limeLight)),
                    ],
                  ),
                ),
              ],
            ),
          )
        else if (_articles == null)
          FgGrid(columns: 1, md: 3, gap: 20, children: [for (var i = 0; i < 3; i++) const Skeleton(height: 112)])
        else
          FgGrid(columns: 1, md: 3, gap: 20, children: [
            for (final a in _articles!)
              FgCard(
                padding: const EdgeInsets.all(16),
                borderColor: AppColors.whiteA(0.1),
                onTap: () => _preview(context, a, label),
                // Dates line up along the bottom of a row of cards.
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(a.title, maxLines: 3, overflow: TextOverflow.ellipsis, style: fg(size: 14, weight: FontWeight.w700, height: 1.35)),
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Row(
                        children: [
                          Expanded(child: Text(a.pubDate.isEmpty ? '' : _shortDate(a.pubDate), style: fg(size: 12, color: AppColors.white70))),
                          Text(label, style: fg(size: 12, color: AppColors.white70)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ]),
      ],
    );
  }

  /// The story's headline and summary from the feed, with a button that opens
  /// the full article in a browser sheet inside the app.
  void _preview(BuildContext context, FeedArticle a, String source) {
    final date = DateTime.tryParse(a.pubDate.replaceFirst(' ', 'T'));
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.obsidianWave,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheet) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(sheet).height * 0.85),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.whiteA(0.3), borderRadius: BorderRadius.circular(2)))),
                const SizedBox(height: 16),
                Text(source.toUpperCase(), style: fg(size: 11, weight: FontWeight.w900, color: AppColors.limeLight, letterSpacing: 1)),
                const SizedBox(height: 12),
                if (a.thumbnail.isNotEmpty) ...[
                  ClipRRect(borderRadius: BorderRadius.circular(12), child: SizedBox(height: 180, child: NetImage(a.thumbnail))),
                  const SizedBox(height: 16),
                ],
                Semantics(header: true, child: Text(a.title, style: fg(size: 20, weight: FontWeight.w800, height: 1.3))),
                const SizedBox(height: 8),
                Text([if (a.author.isNotEmpty) a.author, if (date != null) formatDate(date.toIso8601String())].join(' · '), style: fg(size: 12, color: AppColors.white70)),
                if (a.description.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(a.description, style: fg(size: 14, color: AppColors.white70, height: 1.5)),
                ],
                const SizedBox(height: 20),
                FgButton(
                  label: 'Read the full story',
                  icon: LucideIcons.bookOpen,
                  height: 48,
                  radius: 12,
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  onPressed: () {
                    Navigator.of(sheet).pop();
                    openInApp(a.link);
                  },
                ),
                const SizedBox(height: 12),
                Text('The full article is published by $source and opens here in the app. FitGuide shows its headline and summary from their news feed.', style: fg(size: 11, color: AppColors.white70)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static String _shortDate(String raw) {
    final d = DateTime.tryParse(raw.replaceFirst(' ', 'T'));
    return d == null ? '' : formatDayMonth(ymd(d));
  }
}

/// Real member reviews (verified first), and the way into the community page.
class _CommunityHighlights extends StatefulWidget {
  const _CommunityHighlights();

  @override
  State<_CommunityHighlights> createState() => _CommunityHighlightsState();
}

class _CommunityHighlightsState extends State<_CommunityHighlights> {
  List<Review>? _reviews;

  @override
  void initState() {
    super.initState();
    fetchReviews().then((r) {
      if (mounted) setState(() => _reviews = r);
    }).catchError((_) {
      if (mounted) setState(() => _reviews = []);
    });
  }

  @override
  Widget build(BuildContext context) {
    final titles = context.watch<WorkoutsController>().titles;
    final best = [...(_reviews ?? const <Review>[])].where((r) => r.rating >= 4).toList()
      ..sort((a, b) {
        final byVerified = (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
        return byVerified != 0 ? byVerified : b.likes - a.likes;
      });
    final top = best.take(3).toList();
    final wide = atLeast(context, Breakpoints.md);
    final intro = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(header: true, child: Text('From the community', style: fg(size: wide ? 30 : 24, weight: FontWeight.w800))),
        const SizedBox(height: 8),
        Text('Train with friends, join a challenge, and read what members say about the workouts.', style: fg(size: 16, color: AppColors.white70)),
      ],
    );
    final buttons = Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        FgButton(label: 'Friends & challenges', icon: LucideIcons.users, radius: 12, fontSize: 14, fontWeight: FontWeight.w800, height: 48, padding: const EdgeInsets.symmetric(horizontal: 24), onPressed: () => openHref(context, '/community')),
        FgButton(
          label: 'All reviews',
          style: FgButtonStyle.secondary,
          radius: 12,
          fontSize: 14,
          fontWeight: FontWeight.w700,
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 24),
          onPressed: () => context.read<DashboardController>().setTab(DashboardTab.reviews),
        ),
      ],
    );
    return Container(
      padding: EdgeInsets.all(wide ? 40 : 24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.whiteA(0.1)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color.alphaBlend(AppColors.royalNebula.withValues(alpha: 0.25), AppColors.obsidianWave), AppColors.obsidianWave, AppColors.obsidianWave],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Intro and buttons side by side on a tablet, the buttons under it on a phone.
          if (wide)
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(child: Align(alignment: Alignment.centerLeft, child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 576), child: intro))),
                const SizedBox(width: 24),
                buttons,
              ],
            )
          else ...[
            intro,
            const SizedBox(height: 16),
            buttons,
          ],
          SizedBox(height: wide ? 32 : 24),
          if (_reviews != null && top.isEmpty) Text('No reviews yet. Finish a workout and share how it went.', style: fg(size: 14, color: AppColors.white70)),
          FgGrid(columns: 1, md: 3, gap: 20, children: [
            for (final r in top)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.noirEclipse.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.whiteA(0.1)),
                ),
                // Names line up along the bottom of a row of reviews.
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Stars(r.rating),
                      const SizedBox(height: 16),
                      Text(r.comment, maxLines: 5, overflow: TextOverflow.ellipsis, style: fg(size: 14, height: 1.6)),
                      const SizedBox(height: 16),
                    ]),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(r.name, style: fg(size: 12, weight: FontWeight.w700)),
                        if (r.verified) Padding(padding: const EdgeInsets.only(left: 8), child: Text('Verified', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.emerald300))),
                        if (r.workoutId != null && titles.containsKey(r.workoutId)) ...[
                          Text(' · ', style: fg(size: 12, color: AppColors.white70)),
                          LinkText(titles[r.workoutId]!, size: 12, color: AppColors.white70, weight: FontWeight.w400, underline: true, onTap: () => openWorkout(context, r.workoutId!)),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
          ]),
          SizedBox(height: wide ? 32 : 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(padding: EdgeInsets.only(top: 2), child: Icon(LucideIcons.shieldCheck, size: 14, color: AppColors.white70)),
              const SizedBox(width: 8),
              Expanded(child: Text('Reviews marked verified come from members who completed that workout in FitGuide.', style: fg(size: 12, color: AppColors.white70))),
            ],
          ),
        ],
      ),
    );
  }
}
