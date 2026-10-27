import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/shared/tailoring.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/json.dart';
import '../../widgets/ui.dart';
import '../auth/auth_page.dart';
import 'steps/activity_level_step.dart';
import 'steps/biometrics_step.dart';
import 'steps/diet_step.dart';
import 'steps/focus_step.dart';
import 'steps/goal_step.dart';
import 'steps/interactive_concept_step.dart';
import 'steps/profile_step.dart';
import 'steps/training_setup_step.dart';
import 'steps/weight_step.dart';
import 'steps/welcome_step.dart';

typedef OnboardingFinish = void Function(Json? response, {bool registered});

/// The ten-step sign-up (features/onboarding/OnboardingWizard.js).
class OnboardingWizard extends StatefulWidget {
  const OnboardingWizard({super.key, required this.onFinish, required this.onBackToLogin});

  final OnboardingFinish onFinish;
  final VoidCallback onBackToLogin;

  @override
  State<OnboardingWizard> createState() => _OnboardingWizardState();
}

class _OnboardingWizardState extends State<OnboardingWizard> {
  static const _totalSteps = 10;
  final _scroll = ScrollController();
  int _step = 0;

  // Accumulated answers. focusAreas stays null until the user changes it:
  // until then it follows the suggestions for the goal and gender.
  final Json _answers = {
    'gender': 'Prefer not to say',
    'height': 170,
    'weight': 70,
    'targetWeight': 70,
    'fitnessLevel': 'Beginner',
    'activityStatus': 'Active',
    'goal': 'Vitality',
    'diet': 'Mediterranean Diet',
    'focusAreas': null,
    'equipment': <String>[],
    'workoutMinutes': null,
    'daysPerWeek': null,
    'limitations': <String>[],
  };

  List<String> get _suggestedFocus => suggestedFocusAreas(goal: _answers['goal'] as String?, gender: _answers['gender'] as String?);

  Json get _data => {..._answers, 'focusAreas': _answers['focusAreas'] ?? _suggestedFocus};

  bool get _isLastStep => _step == _totalSteps - 1;

  void _goTo(int next) {
    setState(() => _step = next);
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  void _update(Json changes) => setState(() => _answers.addAll(changes));

  /// Skip to the account step, or on it, continue as a guest.
  void _skip() {
    if (!_isLastStep) {
      _goTo(_totalSteps - 1);
    } else {
      widget.onFinish({'name': 'Fitness Enthusiast', 'email': null, ..._data});
    }
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  Widget _stepBody() {
    final data = _data;
    switch (_step) {
      case 0:
        return const WelcomeStep();
      case 1:
        return const InteractiveConceptStep();
      case 2:
        return BiometricsStep(
          gender: data['gender'] as String,
          height: (data['height'] as num).toInt(),
          weight: (data['weight'] as num).toInt(),
          onChanged: _update,
        );
      case 3:
        return ActivityLevelStep(fitnessLevel: data['fitnessLevel'] as String, activityStatus: data['activityStatus'] as String, onChanged: _update);
      case 4:
        return GoalStep(goal: data['goal'] as String, onChanged: (goal) => _update({'goal': goal}));
      case 5:
        return WeightStep(targetWeight: (data['targetWeight'] as num).toInt(), onChanged: (w) => _update({'targetWeight': w}));
      case 6:
        return DietStep(diet: data['diet'] as String, onChanged: (diet) => _update({'diet': diet}));
      case 7:
        return FocusStep(selected: List<String>.from(data['focusAreas'] as List), suggested: _suggestedFocus, onChanged: (areas) => _update({'focusAreas': areas}));
      case 8:
        return TrainingSetupStep(
          equipment: List<String>.from(data['equipment'] as List),
          workoutMinutes: data['workoutMinutes'] as int?,
          daysPerWeek: data['daysPerWeek'] as int?,
          limitations: List<String>.from(data['limitations'] as List),
          onChanged: _update,
        );
      default:
        return ProfileStep(
          onboardingData: data,
          onComplete: (response) => widget.onFinish(response, registered: true),
          onBack: () => _goTo(_step - 1),
        );
    }
  }

  /// The system back button steps back through the questions, and from the
  /// first step returns to sign-in, instead of closing the app.
  void _onSystemBack(bool didPop, Object? _) {
    if (didPop) return;
    if (_step > 0) {
      _goTo(_step - 1);
    } else {
      widget.onBackToLogin();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(canPop: false, onPopInvokedWithResult: _onSystemBack, child: _page());
  }

  Widget _page() {
    return AuthPage(
      scrollController: _scroll,
      header: LinkText('Sign in', onTap: widget.onBackToLogin),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Semantics(liveRegion: true, child: Text('Step ${_step + 1} of $_totalSteps', style: fg(size: 14, color: AppColors.white70)))),
              LinkText(_isLastStep ? 'Continue as a guest' : 'Skip the questions', onTap: _skip, color: AppColors.white70, weight: FontWeight.w400),
            ],
          ),
          const SizedBox(height: 8),
          FgProgressBar(percent: (_step + 1) / _totalSteps * 100, height: 6, label: 'Sign-up progress'),
          const SizedBox(height: 24),
          AnimatedSwitcher(duration: const Duration(milliseconds: 200), child: KeyedSubtree(key: ValueKey(_step), child: _stepBody())),
          if (!_isLastStep) ...[
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.only(top: 24),
              decoration: BoxDecoration(border: Border(top: BorderSide(color: AppColors.white30A(0.15)))),
              // Back on the left and Continue on the right, or stacked with
              // Continue on top when large text doesn't fit both.
              child: OverflowBar(
                alignment: _step > 0 ? MainAxisAlignment.spaceBetween : MainAxisAlignment.end,
                overflowAlignment: OverflowBarAlignment.end,
                overflowDirection: VerticalDirection.up,
                overflowSpacing: 12,
                children: [
                  if (_step > 0) FgButton(label: 'Back', style: FgButtonStyle.secondary, icon: LucideIcons.arrowLeft, onPressed: () => _goTo(_step - 1)),
                  FgButton(label: _step == 0 ? 'Get started' : 'Continue', trailingIcon: LucideIcons.arrowRight, onPressed: () => _goTo(_step + 1)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
