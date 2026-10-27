import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/json.dart';
import '../../navigation.dart';
import '../../state/auth_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';

// Same activity factors the Nutrition page uses for calorie targets.
const _activityLevels = [
  (1.2, 'Sedentary (little or no exercise)'),
  (1.375, 'Lightly active (exercise 1–3 days a week)'),
  (1.465, 'Moderately active (exercise 3–4 days a week)'),
  (1.55, 'Active (exercise 4–5 days a week)'),
  (1.725, 'Very active (hard exercise 6–7 days a week)'),
  (1.9, 'Extra active (physical job plus training)'),
];
const _profileActivity = {'Inactive': 1.2, 'Moderately Active': 1.465, 'Active': 1.55, 'Very Active': 1.725};

// Compendium of Physical Activities MET values.
const _metActivities = [
  ('Walking, slow (2 mph)', 2.5), ('Walking, brisk (3.5 mph)', 4.3), ('Running (5 mph)', 8.3), ('Running (7 mph)', 11.0),
  ('Running (9 mph)', 12.8), ('Cycling, moderate (12–14 mph)', 8.0), ('Cycling, vigorous (16–19 mph)', 12.0),
  ('Swimming laps, moderate', 5.8), ('Swimming laps, vigorous', 9.8), ('Jumping rope', 11.8), ('Weight training, moderate', 3.5),
  ('Weight training, vigorous', 6.0), ('Circuit training / HIIT', 8.0), ('Yoga (hatha)', 2.5), ('Pilates', 3.0),
  ('Dancing (aerobic)', 7.3), ('Rowing machine, moderate', 7.0), ('Elliptical, moderate', 5.0), ('Stair climbing', 8.8), ('Hiking', 6.0),
];

const _hrZones = [
  ('Zone 1 · Very light', 50, 60, Color(0xFF60A5FA), 'Warm-ups, recovery'),
  ('Zone 2 · Light', 60, 70, Color(0xFF34D399), 'Easy, long endurance work'),
  ('Zone 3 · Moderate', 70, 80, Color(0xFF00C4B4), 'Steady aerobic training'),
  ('Zone 4 · Hard', 80, 90, Color(0xFFFB923C), 'Tempo and threshold efforts'),
  ('Zone 5 · Maximum', 90, 100, Color(0xFFEF4444), 'Short all-out intervals'),
];

const _loadZones = [
  ('Strength', 85, 100, '1–5', Color(0xFFF87171)),
  ('Power', 75, 90, '1–5, moved fast', Color(0xFFFB923C)),
  ('Muscle growth', 67, 85, '6–12', Color(0xFF00C4B4)),
  ('Muscular endurance', 50, 67, '12–20+', Color(0xFF34D399)),
];

const _bmiCategories = [
  ('Underweight', 18.5, Color(0xFF93C5FD), 'under 18.5'),
  ('Healthy weight', 25.0, Color(0xFF00C4B4), '18.5–24.9'),
  ('Overweight', 30.0, Color(0xFFFB923C), '25–29.9'),
  ('Obesity', double.infinity, Color(0xFFFCA5A5), '30 or more'),
];

const _bpCategories = [
  ('Normal', 'under 120 and under 80', Color(0xFF34D399), 'Keep up your healthy habits.'),
  ('Elevated', '120–129 and under 80', Color(0xFF00C4B4), 'Lifestyle changes can bring it down.'),
  ('High, stage 1', '130–139 or 80–89', Color(0xFFFB923C), 'Talk to your doctor about it.'),
  ('High, stage 2', '140+ or 90+', Color(0xFFF87171), 'See your doctor; treatment is usually recommended.'),
  ('Hypertensive crisis', 'over 180 and/or over 120', Color(0xFFFCA5A5), 'Wait a few minutes and measure again. If still this high, get medical care now.'),
];

/// A number from a text field, or null when it's empty or not positive.
double? _num(String s) {
  final n = double.tryParse(s.trim());
  return n != null && n.isFinite && n > 0 ? n : null;
}

String _str(num? n) => n == null || n == 0 ? '' : numText(n);

const _calculators = [
  ('1rm', 'One-rep max', LucideIcons.dumbbell),
  ('tdee', 'Daily calories', LucideIcons.flame),
  ('bmi', 'BMI', LucideIcons.scale),
  ('hr', 'Heart rate zones', LucideIcons.heart),
  ('burn', 'Calories burned', LucideIcons.activity),
  ('whr', 'Waist-to-hip', LucideIcons.ruler),
  ('bp', 'Blood pressure', LucideIcons.gauge),
];

/// Fitness calculators, prefilled from the profile (CalculatorsTab.tsx).
class CalculatorsTab extends StatefulWidget {
  const CalculatorsTab({super.key});

  @override
  State<CalculatorsTab> createState() => _CalculatorsTabState();
}

class _CalculatorsTabState extends State<CalculatorsTab> {
  String _active = '1rm';

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;
    final age = user?.birthYear != null ? DateTime.now().year - user!.birthYear! : null;
    final sex = user?.gender == 'Female' ? 'female' : user?.gender == 'Male' ? 'male' : null;
    final profile = (age: _str(age), sex: sex, height: _str(user?.height), weight: _str(user?.weight), activity: _profileActivity[user?.activityStatus] ?? 1.465);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const PageTitle('Calculators'),
        const SizedBox(height: 4),
        Text("Estimates to guide your training. They're not medical advice.", style: fg(size: 14, color: AppColors.white70)),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.white30A(0.2))),
          child: FgGrid(
            columns: 4,
            md: 7,
            gap: 8,
            children: [
              for (final (id, label, icon) in _calculators)
                Semantics(
                  button: true,
                  selected: _active == id,
                  child: Material(
                    color: _active == id ? AppColors.limeLight : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () => setState(() => _active = id),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
                        child: Column(children: [
                          Icon(icon, size: 16, color: _active == id ? AppColors.noirEclipse : AppColors.white70),
                          const SizedBox(height: 6),
                          Text(label, textAlign: TextAlign.center, style: fg(size: 11, weight: FontWeight.w700, color: _active == id ? AppColors.noirEclipse : AppColors.white70, height: 1.2)),
                        ]),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        KeyedSubtree(
          key: ValueKey(_active),
          child: switch (_active) {
            'tdee' => _DailyCalories(age: profile.age, sex: profile.sex, height: profile.height, weight: profile.weight, activity: profile.activity),
            'bmi' => _Bmi(height: profile.height, weight: profile.weight),
            'hr' => _HeartRateZones(age: profile.age),
            'burn' => _CaloriesBurned(weight: profile.weight),
            'whr' => _WaistToHip(sex: profile.sex),
            'bp' => const _BloodPressure(),
            _ => const _OneRepMax(),
          },
        ),
      ],
    );
  }
}

// ─── Building blocks ─────────────────────────────────────────────────────────
class _Layout extends StatelessWidget {
  const _Layout({required this.title, required this.intro, required this.form, required this.result});
  final String title;
  final String intro;
  final Widget form;
  final Widget result;

  @override
  Widget build(BuildContext context) {
    final inputs = FgCard(
      radius: 24,
      padding: const EdgeInsets.all(20),
      borderColor: AppColors.white30A(0.2),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Semantics(header: true, child: Text(title, style: fg(size: 18, weight: FontWeight.w700))),
        const SizedBox(height: 16),
        Text(intro, style: fg(size: 12, color: AppColors.white70, height: 1.6)),
        const SizedBox(height: 16),
        form,
      ]),
    );
    final output = Semantics(
      liveRegion: true,
      label: '$title result',
      child: Container(
        constraints: const BoxConstraints(minHeight: 256),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.white30A(0.2))),
        child: result,
      ),
    );
    // Inputs and result side by side on a tablet, stacked on a phone.
    if (atLeast(context, Breakpoints.md)) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [Expanded(child: inputs), const SizedBox(width: 24), Expanded(child: output)],
      );
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [inputs, const SizedBox(height: 16), output]);
  }
}

class _Field extends StatelessWidget {
  const _Field({required this.label, required this.controller, this.unit, this.decimal = true});
  final String label;
  final String? unit;
  final TextEditingController controller;
  final bool decimal;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text.rich(TextSpan(children: [
          TextSpan(text: label.toUpperCase(), style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
          if (unit != null) TextSpan(text: ' ($unit)', style: fg(size: 12, color: AppColors.white70)),
        ])),
        const SizedBox(height: 8),
        NumberField(controller: controller, decimal: decimal, semanticLabel: unit == null ? label : '$label ($unit)'),
      ],
    );
  }
}

class _SexChoice extends StatelessWidget {
  const _SexChoice({required this.value, required this.onChanged});
  final String? value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text.rich(TextSpan(children: [
          TextSpan(text: 'SEX', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
          TextSpan(text: ' (the formulas differ)', style: fg(size: 12, color: AppColors.white70)),
        ])),
        const SizedBox(height: 8),
        Row(children: [
          for (final (i, s) in ['male', 'female'].indexed) ...[
            if (i > 0) const SizedBox(width: 8),
            Expanded(
              child: FgChip(
                label: s == 'male' ? 'Male' : 'Female',
                selected: value == s,
                radius: 12,
                height: 38,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                unselectedBackground: AppColors.noirEclipse,
                onTap: () => onChanged(s),
              ),
            ),
          ],
        ]),
      ],
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty(this.icon, this.text);
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(children: [
        Icon(icon, size: 48, color: AppColors.white70.withValues(alpha: 0.4)),
        const SizedBox(height: 12),
        Text(text, textAlign: TextAlign.center, style: fg(size: 14, color: AppColors.white70)),
      ]),
    );
  }
}

class _Big extends StatelessWidget {
  const _Big({required this.value, this.unit, this.color = AppColors.limeLight, this.caption});
  final String value;
  final String? unit;
  final Color color;
  final String? caption;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(children: [
        Text.rich(
          TextSpan(children: [
            TextSpan(text: value, style: fg(size: 60, weight: FontWeight.w800, color: color, height: 1.1)),
            if (unit != null) TextSpan(text: ' $unit', style: fg(size: 24, weight: FontWeight.w700, color: color)),
          ]),
          textAlign: TextAlign.center,
        ),
        if (caption != null) ...[const SizedBox(height: 8), Text(caption!, textAlign: TextAlign.center, style: fg(size: 14, color: AppColors.white70))],
      ]),
    );
  }
}

Widget _darkTile(Widget child) => Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.noirEclipse, borderRadius: BorderRadius.circular(10)),
      child: child,
    );

mixin _Controllers<T extends StatefulWidget> on State<T> {
  final _controllers = <TextEditingController>[];
  TextEditingController ctrl(String text) {
    final c = TextEditingController(text: text)..addListener(() => setState(() {}));
    _controllers.add(c);
    return c;
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }
}

// ─── Calculators ─────────────────────────────────────────────────────────────
class _OneRepMax extends StatefulWidget {
  const _OneRepMax();
  @override
  State<_OneRepMax> createState() => _OneRepMaxState();
}

class _OneRepMaxState extends State<_OneRepMax> with _Controllers {
  late final _weight = ctrl('80');
  late final _reps = ctrl('5');

  @override
  Widget build(BuildContext context) {
    final w = _num(_weight.text);
    final r = _num(_reps.text);
    final valid = w != null && r != null && r == r.roundToDouble() && r <= 12;
    // Average of the Epley and Brzycki formulas.
    final max = valid ? ((w * (1 + r / 30) + (r == 1 ? w : w / (1.0278 - 0.0278 * r))) / 2).round() : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Layout(
          title: 'Estimate your one-rep max',
          intro: 'Enter a set you did with good form. The estimate (average of the Epley and Brzycki formulas) is most accurate for sets of 10 reps or fewer.',
          form: Row(children: [
            Expanded(child: _Field(label: 'Weight lifted', unit: 'kg', controller: _weight)),
            const SizedBox(width: 12),
            Expanded(child: _Field(label: 'Reps done', controller: _reps, decimal: false)),
          ]),
          result: max != null
              ? Column(children: [
                  _Big(value: '$max', unit: 'kg', caption: 'Estimated one-rep max'),
                  const SizedBox(height: 12),
                  Row(children: [
                    for (final (i, (n, pct)) in [(3, 0.93), (5, 0.87), (10, 0.75)].indexed) ...[
                      if (i > 0) const SizedBox(width: 8),
                      Expanded(
                        child: _darkTile(Column(children: [
                          Text('$n reps', style: fg(size: 12, color: AppColors.white70)),
                          const SizedBox(height: 4),
                          Text('~${(max * pct).round()} kg', style: fg(size: 12, weight: FontWeight.w800)),
                        ])),
                      ),
                    ],
                  ]),
                ])
              : const _Empty(LucideIcons.dumbbell, 'Enter a weight and 1–12 reps.'),
        ),
        if (max != null) ...[
          const SizedBox(height: 16),
          FgCard(
            radius: 24,
            padding: const EdgeInsets.all(20),
            borderColor: AppColors.white30A(0.2),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text('Training loads for a $max kg max', style: fg(size: 16, weight: FontWeight.w800)),
              const SizedBox(height: 12),
              ...spaced([
                for (final (name, lo, hi, reps, color) in _loadZones)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(color: AppColors.whiteA(0.05), borderRadius: BorderRadius.circular(12)),
                    // Zone and its rule on the left, the load on the right, the same in every row.
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(name, style: fg(size: 14, weight: FontWeight.w800, color: color)),
                            const SizedBox(height: 2),
                            Text('$lo–$hi% · $reps reps', style: fg(size: 12, color: AppColors.white70)),
                          ]),
                        ),
                        const SizedBox(width: 12),
                        Text('${(max * lo / 100).round()}–${(max * hi / 100).round()} kg', style: fg(size: 14, weight: FontWeight.w700)),
                      ],
                    ),
                  ),
              ], 12),
            ]),
          ),
        ],
      ],
    );
  }
}

class _DailyCalories extends StatefulWidget {
  const _DailyCalories({required this.age, required this.sex, required this.height, required this.weight, required this.activity});
  final String age;
  final String? sex;
  final String height;
  final String weight;
  final double activity;
  @override
  State<_DailyCalories> createState() => _DailyCaloriesState();
}

class _DailyCaloriesState extends State<_DailyCalories> with _Controllers {
  late final _age = ctrl(widget.age);
  late final _height = ctrl(widget.height);
  late final _weight = ctrl(widget.weight);
  late String? _sex = widget.sex;
  late double _activity = widget.activity;

  @override
  Widget build(BuildContext context) {
    final a = _num(_age.text);
    final h = _num(_height.text);
    final w = _num(_weight.text);
    // Mifflin-St Jeor resting energy, times the activity factor.
    final bmr = a != null && h != null && w != null && _sex != null ? 10 * w + 6.25 * h - 5 * a + (_sex == 'male' ? 5 : -161) : null;
    final tdee = bmr != null ? (bmr * _activity).round() : null;
    return _Layout(
      title: 'Daily calories (TDEE)',
      intro: 'Total daily energy expenditure: the calories you burn in a day, from the Mifflin-St Jeor equation and your activity level. Filled in from your profile where possible.',
      form: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Expanded(child: _Field(label: 'Age', controller: _age, decimal: false)),
          const SizedBox(width: 12),
          Expanded(child: _Field(label: 'Height', unit: 'cm', controller: _height)),
          const SizedBox(width: 12),
          Expanded(child: _Field(label: 'Weight', unit: 'kg', controller: _weight)),
        ]),
        const SizedBox(height: 16),
        _SexChoice(value: _sex, onChanged: (s) => setState(() => _sex = s)),
        const SizedBox(height: 16),
        const SmallLabel('Activity level', tracking: 0),
        const SizedBox(height: 8),
        FgSelect<double>(value: _activity, semanticLabel: 'Activity level', options: [for (final (f, l) in _activityLevels) (f, l)], onChanged: (v) => setState(() => _activity = v)),
      ]),
      result: tdee != null && bmr != null
          ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              _Big(value: thousands(tdee), unit: 'kcal/day', caption: 'To keep your current weight'),
              const SizedBox(height: 20),
              Row(children: [
                Expanded(
                  child: _darkTile(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('To lose about 0.5 kg a week', style: fg(size: 12, color: AppColors.white70)),
                    const SizedBox(height: 4),
                    Text('${thousands(math.max(1200, tdee - 500))} kcal', style: fg(size: 14, weight: FontWeight.w800)),
                  ])),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _darkTile(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('To gain muscle slowly', style: fg(size: 12, color: AppColors.white70)),
                    const SizedBox(height: 4),
                    Text('${thousands(tdee + 300)} kcal', style: fg(size: 14, weight: FontWeight.w800)),
                  ])),
                ),
              ]),
              const SizedBox(height: 20),
              Text('At rest you burn about ${thousands(bmr.round())} kcal a day.', style: fg(size: 12, color: AppColors.white70)),
              const SizedBox(height: 20),
              FgCard(
                padding: const EdgeInsets.all(16),
                color: AppColors.limeLight.withValues(alpha: 0.1),
                borderColor: AppColors.limeLight.withValues(alpha: 0.3),
                onTap: () => openHref(context, '/nutrition'),
                child: Row(children: [
                  Expanded(child: Text('Set daily targets and log food on the Nutrition page', style: fg(size: 14, weight: FontWeight.w700, color: AppColors.limeLight))),
                  const Icon(LucideIcons.arrowRight, size: 16, color: AppColors.limeLight),
                ]),
              ),
            ])
          : const _Empty(LucideIcons.flame, 'Enter your age, height, weight and sex.'),
    );
  }
}

class _Bmi extends StatefulWidget {
  const _Bmi({required this.height, required this.weight});
  final String height;
  final String weight;
  @override
  State<_Bmi> createState() => _BmiState();
}

class _BmiState extends State<_Bmi> with _Controllers {
  late final _height = ctrl(widget.height);
  late final _weight = ctrl(widget.weight);

  @override
  Widget build(BuildContext context) {
    final h = _num(_height.text);
    final w = _num(_weight.text);
    final bmi = h != null && w != null ? (w / math.pow(h / 100, 2) * 10).round() / 10 : null;
    final category = bmi == null ? null : _bmiCategories.firstWhere((c) => bmi < c.$2);
    final marker = bmi == null ? 0.0 : ((bmi - 10) / 30).clamp(0.0, 1.0);
    return _Layout(
      title: 'Body mass index',
      intro: "BMI compares weight with height. It's a quick screening number for adults, not a measure of body fat: muscular people often score high.",
      form: Row(children: [
        Expanded(child: _Field(label: 'Height', unit: 'cm', controller: _height)),
        const SizedBox(width: 12),
        Expanded(child: _Field(label: 'Weight', unit: 'kg', controller: _weight)),
      ]),
      result: bmi != null && category != null
          ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              _Big(value: numText(bmi), color: category.$3, caption: category.$1),
              const SizedBox(height: 16),
              ExcludeSemantics(
                child: LayoutBuilder(
                  builder: (context, constraints) => SizedBox(
                    height: 16,
                    child: Stack(clipBehavior: Clip.none, children: [
                      Positioned.fill(
                        top: 2,
                        bottom: 2,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(999),
                            gradient: const LinearGradient(colors: [Color(0xFF60A5FA), Color(0xFF00C4B4), Color(0xFFFB923C), Color(0xFFEF4444)], stops: [0, 0.33, 0.66, 1]),
                          ),
                        ),
                      ),
                      Positioned(
                        left: marker * constraints.maxWidth - 8,
                        child: Container(
                          width: 16,
                          height: 16,
                          decoration: BoxDecoration(color: AppColors.white, shape: BoxShape.circle, border: Border.all(color: AppColors.noirEclipse, width: 2)),
                        ),
                      ),
                    ]),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              FgGrid(columns: 2, gap: 8, children: [
                for (final (label, _, color, range) in _bmiCategories)
                  _darkTile(Row(children: [
                    Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(range, style: fg(size: 12, color: AppColors.white70)),
                        Text(label, style: fg(size: 12, weight: FontWeight.w700)),
                      ]),
                    ),
                  ])),
              ]),
              const SizedBox(height: 16),
              Text('Categories from the World Health Organization.', style: fg(size: 12, color: AppColors.white70)),
            ])
          : const _Empty(LucideIcons.scale, 'Enter your height and weight.'),
    );
  }
}

class _HeartRateZones extends StatefulWidget {
  const _HeartRateZones({required this.age});
  final String age;
  @override
  State<_HeartRateZones> createState() => _HeartRateZonesState();
}

class _HeartRateZonesState extends State<_HeartRateZones> with _Controllers {
  late final _age = ctrl(widget.age);
  late final _resting = ctrl('');

  @override
  Widget build(BuildContext context) {
    final a = _num(_age.text);
    final rest = _num(_resting.text);
    final maxHr = a != null && a < 120 ? 220 - a.round() : null;
    final karvonen = maxHr != null && rest != null && rest < maxHr;
    // Karvonen: resting + % of heart-rate reserve. Without a resting pulse: % of max.
    int bpm(int pct) => (karvonen ? rest + (maxHr - rest) * pct / 100 : maxHr! * pct / 100).round();
    return _Layout(
      title: 'Heart rate zones',
      intro:
          'Max heart rate is estimated as 220 minus your age, which can be off by 10 or more beats for any one person. Add your resting pulse (taken in bed in the morning) for zones based on heart-rate reserve (the Karvonen method).',
      form: Row(children: [
        Expanded(child: _Field(label: 'Age', controller: _age, decimal: false)),
        const SizedBox(width: 12),
        Expanded(child: _Field(label: 'Resting pulse (optional)', unit: 'bpm', controller: _resting, decimal: false)),
      ]),
      result: maxHr != null
          ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text.rich(
                TextSpan(style: fg(size: 14, color: AppColors.white70), children: [
                  const TextSpan(text: 'Estimated max '),
                  TextSpan(text: '$maxHr', style: fg(size: 24, weight: FontWeight.w800, color: AppColors.limeLight)),
                  const TextSpan(text: ' bpm'),
                ]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(karvonen ? 'Zones use your heart-rate reserve (Karvonen).' : 'Zones are percentages of max heart rate.', textAlign: TextAlign.center, style: fg(size: 12, color: AppColors.white70)),
              const SizedBox(height: 12),
              ...spaced([
                for (final (name, lo, hi, color, use) in _hrZones)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: color.withAlpha(0x14), borderRadius: BorderRadius.circular(16)),
                    child: Row(children: [
                      Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(name, style: fg(size: 14, weight: FontWeight.w700)),
                          Text(use, style: fg(size: 12, color: AppColors.white70)),
                        ]),
                      ),
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text('${bpm(lo)}–${bpm(hi)}', style: fg(size: 14, weight: FontWeight.w800)),
                        Text('bpm', style: fg(size: 12, color: AppColors.white70)),
                      ]),
                    ]),
                  ),
              ], 8),
            ])
          : const _Empty(LucideIcons.heart, 'Enter your age to see your zones.'),
    );
  }
}

class _CaloriesBurned extends StatefulWidget {
  const _CaloriesBurned({required this.weight});
  final String weight;
  @override
  State<_CaloriesBurned> createState() => _CaloriesBurnedState();
}

class _CaloriesBurnedState extends State<_CaloriesBurned> with _Controllers {
  late final _weight = ctrl(widget.weight);
  late final _minutes = ctrl('30');
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final w = _num(_weight.text);
    final m = _num(_minutes.text);
    final (label, met) = _metActivities[_index];
    final kcal = w != null && m != null ? (met * w * (m / 60)).round() : null;
    return _Layout(
      title: 'Calories burned',
      intro: 'Calories ≈ MET × body weight (kg) × hours, using MET values from the Compendium of Physical Activities. Real burn varies with fitness, effort and terrain.',
      form: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const SmallLabel('Activity', tracking: 0),
        const SizedBox(height: 8),
        FgSelect<int>(
          value: _index,
          semanticLabel: 'Activity',
          options: [for (final (i, (l, met)) in _metActivities.indexed) (i, '$l (MET ${numText(met)})')],
          onChanged: (v) => setState(() => _index = v),
        ),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(child: _Field(label: 'Body weight', unit: 'kg', controller: _weight)),
          const SizedBox(width: 12),
          Expanded(child: _Field(label: 'Duration', unit: 'min', controller: _minutes, decimal: false)),
        ]),
      ]),
      result: kcal != null ? _Big(value: '$kcal', unit: 'kcal', caption: '$label for ${numText(m)} min') : const _Empty(LucideIcons.activity, 'Enter your weight and how long you trained.'),
    );
  }
}

class _WaistToHip extends StatefulWidget {
  const _WaistToHip({required this.sex});
  final String? sex;
  @override
  State<_WaistToHip> createState() => _WaistToHipState();
}

class _WaistToHipState extends State<_WaistToHip> with _Controllers {
  late String? _sex = widget.sex;
  late final _waist = ctrl('');
  late final _hip = ctrl('');

  @override
  Widget build(BuildContext context) {
    final wa = _num(_waist.text);
    final hi = _num(_hip.text);
    final ratio = wa != null && hi != null ? (wa / hi * 100).round() / 100 : null;
    // WHO: substantially increased risk at 0.90+ (men) or 0.85+ (women).
    final limit = _sex == 'female' ? 0.85 : 0.9;
    final high = ratio != null && ratio >= limit;
    return _Layout(
      title: 'Waist-to-hip ratio',
      intro:
          'Measure your waist midway between your lowest rib and hip bone, and your hips at the widest point. A high ratio means more fat around the middle, which is linked to heart and metabolic risk.',
      form: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _SexChoice(value: _sex, onChanged: (s) => setState(() => _sex = s)),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(child: _Field(label: 'Waist', unit: 'cm', controller: _waist)),
          const SizedBox(width: 12),
          Expanded(child: _Field(label: 'Hips', unit: 'cm', controller: _hip)),
        ]),
      ]),
      result: ratio != null && _sex != null
          ? Column(children: [
              _Big(value: ratio.toStringAsFixed(2), color: high ? AppColors.orange400 : AppColors.emerald400, caption: high ? 'Above the healthy limit' : 'Within the healthy range'),
              const SizedBox(height: 16),
              Text(
                'The World Health Organization links a ratio of ${limit.toStringAsFixed(2)} or more (${_sex == 'female' ? 'women' : 'men'}) with substantially higher health risk.',
                textAlign: TextAlign.center,
                style: fg(size: 14, color: AppColors.white70),
              ),
            ])
          : const _Empty(LucideIcons.ruler, 'Choose your sex and enter both measurements.'),
    );
  }
}

class _BloodPressure extends StatefulWidget {
  const _BloodPressure();
  @override
  State<_BloodPressure> createState() => _BloodPressureState();
}

class _BloodPressureState extends State<_BloodPressure> with _Controllers {
  late final _systolic = ctrl('');
  late final _diastolic = ctrl('');

  @override
  Widget build(BuildContext context) {
    final s = _num(_systolic.text);
    final d = _num(_diastolic.text);
    final index = s != null && d != null
        ? s > 180 || d > 120
            ? 4
            : s >= 140 || d >= 90
                ? 3
                : s >= 130 || d >= 80
                    ? 2
                    : s >= 120
                        ? 1
                        : 0
        : null;
    final result = index == null ? null : _bpCategories[index];
    return _Layout(
      title: 'Blood pressure',
      intro: "Enter a reading from a home or pharmacy monitor, taken seated after five minutes of rest. One reading isn't a diagnosis; your doctor looks at the average of several.",
      form: Row(children: [
        Expanded(child: _Field(label: 'Systolic (top)', unit: 'mmHg', controller: _systolic, decimal: false)),
        const SizedBox(width: 12),
        Expanded(child: _Field(label: 'Diastolic (bottom)', unit: 'mmHg', controller: _diastolic, decimal: false)),
      ]),
      result: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (result != null) ...[
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              decoration: BoxDecoration(color: result.$3.withAlpha(0x20), borderRadius: BorderRadius.circular(999)),
              child: Text(result.$1, style: fg(size: 18, weight: FontWeight.w800, color: result.$3)),
            ),
          ),
          const SizedBox(height: 8),
          Text(result.$4, textAlign: TextAlign.center, style: fg(size: 14, color: AppColors.white70)),
        ] else
          Text('Enter both numbers to see your category.', textAlign: TextAlign.center, style: fg(size: 14, color: AppColors.white70)),
        const SizedBox(height: 20),
        Text('AMERICAN HEART ASSOCIATION CATEGORIES (MMHG)', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70, letterSpacing: 0.6)),
        const SizedBox(height: 8),
        ...spaced([
          for (final (label, range, color, _) in _bpCategories)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: result?.$1 == label ? color.withAlpha(0x14) : null,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: result?.$1 == label ? color.withAlpha(0x80) : Colors.transparent),
              ),
              child: Row(children: [
                Expanded(child: Text(label, style: fg(size: 12, weight: FontWeight.w700, color: color))),
                Text(range, style: fg(size: 12, color: AppColors.white70)),
              ]),
            ),
        ], 6),
      ]),
    );
  }
}
