import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/shared/profile_options.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/json.dart';
import '../../services/nutrition_service.dart';
import '../../state/auth_controller.dart';
import '../../state/dashboard_controller.dart';
import '../../navigation.dart';
import '../../widgets/charts.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';
import '../common/site_page.dart';
import 'food_picker.dart';

const _mealLabels = {'breakfast': 'Breakfast', 'lunch': 'Lunch', 'dinner': 'Dinner', 'snack': 'Snacks'};

/// /nutrition: daily targets, the food log, a suggested meal plan and recent
/// history (features/nutrition/NutritionView.tsx).
class NutritionScreen extends StatefulWidget {
  const NutritionScreen({super.key});

  @override
  State<NutritionScreen> createState() => _NutritionScreenState();
}

class _NutritionScreenState extends State<NutritionScreen> {
  String _date = localToday();
  DayLog? _log;
  MealPlan? _plan;
  List<HistoryDay> _history = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    if (context.read<AuthController>().hasAccount) _refresh(_date);
  }

  Future<void> _refresh(String day) async {
    try {
      final results = await Future.wait([fetchDayLog(day), fetchMealPlan(day), fetchNutritionHistory(14)]);
      if (!mounted || day != _date) return;
      setState(() {
        _log = results[0] as DayLog;
        _plan = results[1] as MealPlan;
        _history = results[2] as List<HistoryDay>;
      });
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    }
  }

  void _go(int days) {
    final next = shiftDate(_date, days);
    if (next.compareTo(localToday()) > 0) return;
    setState(() {
      _date = next;
      _log = null;
    });
    _refresh(next);
  }

  Future<void> _remove(String id) async {
    try {
      await deleteLogEntry(id);
      await _refresh(_date);
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    }
  }

  Future<void> _addSuggested(String meal) async {
    final suggestion = _plan?.meals.where((m) => m.meal == meal).firstOrNull;
    if (suggestion == null) return;
    try {
      for (final item in suggestion.items) {
        await logFood({'date': _date, 'meal': meal, 'foodSlug': item.foodSlug, 'servings': item.servings});
      }
      await _refresh(_date);
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    }
  }

  Future<void> _add(String meal) async {
    final added = await showFgModal<bool>(context, title: 'Add to $meal', sheet: true, builder: (_) => FoodPicker(meal: meal, date: _date));
    if (added == true) _refresh(_date);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    if (!auth.hasAccount) {
      return SitePage(
        active: '/nutrition',
        child: FgCard(
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            Text('Sign in to get calorie and macro targets and log what you eat.', textAlign: TextAlign.center, style: fg(size: 16, color: AppColors.white70)),
            const SizedBox(height: 16),
            FgButton(label: 'Sign in', radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: auth.startSignUp),
          ]),
        ),
      );
    }
    final today = _date == localToday();
    final log = _log;
    final wide = atLeast(context, Breakpoints.md);
    final day = Text(today ? 'Today' : formatDayLong(_date), textAlign: TextAlign.center, style: fg(size: 14, weight: FontWeight.w700));
    final dayNav = Row(
      mainAxisSize: wide ? MainAxisSize.min : MainAxisSize.max,
      children: [
        _DayButton(icon: LucideIcons.chevronLeft, label: 'Previous day', onTap: () => _go(-1)),
        if (wide) SizedBox(width: 190, child: day) else Expanded(child: day),
        _DayButton(icon: LucideIcons.chevronRight, label: 'Next day', onTap: today ? null : () => _go(1)),
      ],
    );
    final title = PageTitle('Nutrition', icon: LucideIcons.utensils, size: wide ? 36 : 30);
    return SitePage(
      active: '/nutrition',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: spaced([
          // The day picker beside the title on a tablet.
          if (wide) Row(children: [Expanded(child: title), const SizedBox(width: 16), dayNav]) else ...[title, dayNav],
          if (_error != null) ErrorLine(_error!),
          if (log == null)
            const LoadingRow('Loading your day…')
          else
            // Targets and meals, with suggestions and history in a side
            // column on a wide tablet (`lg:grid-cols-[1fr_360px]`).
            ...withSidebar(context, width: 360, [
              FgCard(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('EATEN', style: fgLabel()),
                    Text.rich(TextSpan(children: [
                      TextSpan(text: '${log.totals.calories.round()}', style: fg(size: 36, weight: FontWeight.w800)),
                      TextSpan(text: ' / ${log.targets.calories.round()} kcal', style: fg(size: 16, weight: FontWeight.w600, color: AppColors.white70)),
                    ])),
                    Text('${(log.targets.calories - log.totals.calories).clamp(0, double.infinity).round()} kcal left', style: fg(size: 14, color: AppColors.white70)),
                    const SizedBox(height: 16),
                    _MacroBar(label: 'Protein', value: log.totals.protein, target: log.targets.protein, unit: 'g'),
                    const SizedBox(height: 12),
                    _MacroBar(label: 'Carbs', value: log.totals.carbs, target: log.targets.carbs, unit: 'g'),
                    const SizedBox(height: 12),
                    _MacroBar(label: 'Fat', value: log.totals.fat, target: log.targets.fat, unit: 'g'),
                    const SizedBox(height: 16),
                    // The link's 48px touch area is centred on the line, so the text beside it lines up.
                    Wrap(crossAxisAlignment: WrapCrossAlignment.center, children: [
                      Text(
                        'Targets for your goal (${log.targets.goal.toLowerCase()}) and diet (${log.targets.diet}), estimated from your profile. ${log.targets.notes.join(' ')} ',
                        style: fg(size: 12, color: AppColors.white70),
                      ),
                      if (log.targets.ageIsEstimate)
                        LinkText('Update your profile', size: 12, color: AppColors.white70, weight: FontWeight.w400, underline: true, onTap: () => toDashboard(context, DashboardTab.profile)),
                      Text('${log.targets.ageIsEstimate ? '. ' : ''}These are estimates, not medical advice.', style: fg(size: 12, color: AppColors.white70)),
                    ]),
                  ],
                ),
              ),
              for (final meal in Nutrition.meals)
                FgCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Meal name left and button right; the button wraps under it with large text.
                      Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, runSpacing: 8, children: [
                        Semantics(header: true, child: Text(_mealLabels[meal]!, style: fg(size: 16, weight: FontWeight.w800))),
                        FgButton(
                          label: 'Add food',
                          icon: LucideIcons.plus,
                          style: FgButtonStyle.ghost,
                          height: 34,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          onPressed: () => _add(meal),
                        ),
                      ]),
                      const SizedBox(height: 12),
                      if ((log.meals[meal] ?? const []).isEmpty)
                        Text('Nothing logged.', style: fg(size: 14, color: AppColors.white70))
                      else
                        for (final (i, e) in log.meals[meal]!.indexed)
                          Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: AppColors.white30A(0.1)))),
                            child: Row(children: [
                              Expanded(
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text.rich(TextSpan(children: [
                                    TextSpan(text: e.name, style: fg(size: 14, weight: FontWeight.w600)),
                                    TextSpan(text: ' × ${numText(e.servings)}', style: fg(size: 14, color: AppColors.white70)),
                                  ]), overflow: TextOverflow.ellipsis),
                                  Text(e.line, style: fg(size: 12, color: AppColors.white70)),
                                ]),
                              ),
                              IconButton(tooltip: 'Remove ${e.name}', onPressed: () => _remove(e.id), icon: const Icon(LucideIcons.trash2, size: 16, color: AppColors.white70)),
                            ]),
                          ),
                    ],
                  ),
                ),
            ], [
              if (_plan != null)
                FgCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Suggested meals', style: fg(size: 16, weight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      Text('A sample day for your diet, about ${_plan!.totals.calories.round()} kcal. A new mix each day.', style: fg(size: 12, color: AppColors.white70)),
                      for (final m in _plan!.meals) ...[
                        const SizedBox(height: 16),
                        Row(children: [
                          Expanded(child: Text('${_mealLabels[m.meal] ?? m.meal} · ${m.totals.calories.round()} kcal'.toUpperCase(), style: fgLabel())),
                          LinkText('Log these', size: 12, weight: FontWeight.w700, onTap: () => _addSuggested(m.meal)),
                        ]),
                        const SizedBox(height: 4),
                        for (final item in m.items)
                          Text.rich(TextSpan(children: [
                            TextSpan(text: item.name, style: fg(size: 14)),
                            TextSpan(text: ' · ${numText(item.servings)} × ${item.servingLabel}', style: fg(size: 14, color: AppColors.white70)),
                          ])),
                      ],
                    ],
                  ),
                ),
              if (_history.isNotEmpty)
                FgCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Last 14 days', style: fg(size: 16, weight: FontWeight.w800)),
                      const SizedBox(height: 12),
                      DayBarChart(
                        labels: [for (final d in _history) d.date.length >= 10 ? d.date.substring(8) : d.date],
                        values: [for (final d in _history) d.calories],
                        target: log.targets.calories,
                        unit: ' kcal',
                        height: 192,
                        label: 'Calories per day for the last 14 days',
                      ),
                      const SizedBox(height: 8),
                      Text('Dashed line: your daily target.', style: fg(size: 12, color: AppColors.white70)),
                    ],
                  ),
                ),
            ]),
        ], 16),
      ),
    );
  }
}

class _DayButton extends StatelessWidget {
  const _DayButton({required this.icon, required this.label, this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: onTap == null ? 0.4 : 1,
      child: Semantics(
        button: true,
        label: label,
        excludeSemantics: true,
        child: Material(
          color: AppColors.whiteA(0.1),
          borderRadius: BorderRadius.circular(12),
          child: InkWell(borderRadius: BorderRadius.circular(12), onTap: onTap, child: SizedBox(width: 40, height: 40, child: Icon(icon, size: 16))),
        ),
      ),
    );
  }
}

class _MacroBar extends StatelessWidget {
  const _MacroBar({required this.label, required this.value, required this.target, required this.unit});
  final String label;
  final double value;
  final double target;
  final String unit;

  @override
  Widget build(BuildContext context) {
    final pct = target > 0 ? (value / target * 100).clamp(0, 100).toDouble() : 0.0;
    final over = value > target * 1.05;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        Expanded(child: Text(label.toUpperCase(), style: fgLabel())),
        Text('${value.round()} / ${target.round()} $unit', style: fg(size: 12, color: over ? AppColors.amber300 : AppColors.white)),
      ]),
      const SizedBox(height: 4),
      FgProgressBar(percent: pct, color: over ? AppColors.amber400 : AppColors.limeLight, label: label),
    ]);
  }
}
