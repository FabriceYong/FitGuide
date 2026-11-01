import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/shared/profile_options.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/units.dart';
import '../../models/json.dart';
import '../../models/user.dart';
import '../../navigation.dart';
import '../../services/training_service.dart';
import '../../state/auth_controller.dart';
import '../../state/dashboard_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/image_pick.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';
import '../coaches/become_coach.dart';
import '../common/brand.dart';
import '../common/parq_modal.dart';
import 'data_export.dart';
import 'reminders_form.dart';

double? _bmiOf(double? weight, double? height) => weight != null && height != null && height > 0 ? (weight / ((height / 100) * (height / 100)) * 10).round() / 10 : null;

({String label, Color color}) _bmiLabel(double? bmi) {
  if (bmi == null) return (label: '', color: const Color(0xFF9CA3AF));
  if (bmi < 18.5) return (label: 'Underweight', color: const Color(0xFF93C5FD));
  if (bmi < 25) return (label: 'Healthy', color: const Color(0xFF00C4B4));
  if (bmi < 30) return (label: 'Overweight', color: const Color(0xFFFB923C));
  return (label: 'Obesity', color: const Color(0xFFFCA5A5));
}

const _activityText = {
  'Inactive': 'Little daily movement',
  'Moderately Active': 'Light exercise most days',
  'Active': 'Exercise 3+ days a week',
  'Very Active': 'Hard training most days',
};

String _workoutHabit(AppUser? u) => [if (u?.workoutMinutes != null) '${u!.workoutMinutes} min', if (u?.daysPerWeek != null) '${u!.daysPerWeek} a week'].join(' · ');

/// The user's profile and account links (features/profile/components/ProfileTab.tsx).
class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key, required this.onLogout});
  final VoidCallback onLogout;

  Future<void> _confirmDelete(BuildContext context, AppUser user) async {
    final ok = await confirmDialog(
      context,
      title: 'Delete your account?',
      message:
          'This permanently deletes your profile, workout history, plans, progress, reviews and photos.${user.isPlus ? ' Your PLUS subscription is cancelled right away.' : ''} It can’t be undone.',
      confirmText: 'Continue',
      danger: true,
      icon: LucideIcons.triangleAlert,
    );
    if (ok && context.mounted) showFgModal<void>(context, title: 'Delete account', maxWidth: 448, builder: (_) => const _DeleteAccount());
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final user = auth.user;
    final dashboard = context.read<DashboardController>();
    final bmi = _bmiOf(user?.weight, user?.height);
    final bmiInfo = _bmiLabel(bmi);
    final toGo = user?.weight != null && user?.targetWeight != null ? (user!.weight! - user.targetWeight!).abs() : null;
    final units = user?.units ?? Units.metric;
    String kg(double? v) => v == null ? '—' : weightText(v, units);

    // A single readable column on a tablet (`max-w-3xl`).
    return MaxWidth(
      768,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: spaced([
          Column(
            children: [
              const SizedBox(height: 16),
              Avatar(url: user?.avatarUrl, size: 96, borderColor: AppColors.limeLight),
              const SizedBox(height: 16),
              Text(user?.name.isNotEmpty ?? false ? user!.name : 'Your profile', textAlign: TextAlign.center, style: fg(size: 24, weight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text(
                '${auth.isGuest ? 'Guest (saved on this device only)' : (user?.email ?? '')}${user?.createdAt != null ? ' · Member since ${DateTime.tryParse(user!.createdAt!)?.year ?? ''}' : ''}',
                textAlign: TextAlign.center,
                style: fg(size: 14, color: AppColors.white70),
              ),
              const SizedBox(height: 12),
              Wrap(spacing: 8, runSpacing: 8, alignment: WrapAlignment.center, children: [
                if (user?.fitnessLevel != null) Pill(user!.fitnessLevel!),
                if (user?.isPlus ?? false) const Pill('PLUS', color: AppColors.amber300),
                if (user != null && user.role != 'user') Pill(user.role == 'creator' ? 'coach' : user.role, color: AppColors.purple400),
              ]),
              const SizedBox(height: 16),
              Wrap(spacing: 12, runSpacing: 12, alignment: WrapAlignment.center, children: [
                FgButton(
                  label: 'Edit profile',
                  icon: LucideIcons.pencilLine,
                  style: FgButtonStyle.secondary,
                  color: AppColors.obsidianWave,
                  radius: 12,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  height: 40,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  onPressed: user == null ? null : () => showFgModal<void>(context, title: 'Edit profile', maxWidth: 672, builder: (_) => _EditProfile(user: user)),
                ),
                if (auth.isGuest)
                  FgButton(label: 'Create an account', radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 40, padding: const EdgeInsets.symmetric(horizontal: 16), onPressed: auth.startSignUp),
              ]),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const _Heading('Body'),
              FgGrid(columns: 2, sm: 4, gap: 8, children: [
                _Stat(LucideIcons.ruler, AppColors.cyan400, 'Height', user?.height != null ? heightText(user!.height!, units) : '—'),
                _Stat(LucideIcons.scale, AppColors.emerald400, 'Weight', kg(user?.weight)),
                _Stat(LucideIcons.target, const Color(0xFFA78BFA), 'Target', kg(user?.targetWeight), sub: toGo != null && weightIn(toGo, units) > 0 ? '${weightText(toGo, units)} to go' : null),
                _Stat(LucideIcons.activity, bmiInfo.color, 'BMI', bmi != null ? numText(bmi) : '—', sub: bmiInfo.label.isEmpty ? null : bmiInfo.label),
              ]),
              const SizedBox(height: 8),
              Wrap(crossAxisAlignment: WrapCrossAlignment.center, children: [
                Text('Log your weight over time on the ', style: fg(size: 12, color: AppColors.white70)),
                LinkText('Progress tab', size: 12, color: AppColors.white70, weight: FontWeight.w400, underline: true, onTap: () => dashboard.setTab(DashboardTab.progress)),
                Text('.', style: fg(size: 12, color: AppColors.white70)),
              ]),
            ],
          ),
          FgCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const _Heading('Training & nutrition', bottom: 12),
                ...spaced([
                  _Row(LucideIcons.target, 'Goal', user?.goal ?? 'Not set'),
                  _Row(LucideIcons.trendingUp, 'Level', user?.fitnessLevel ?? 'Not set'),
                  _Row(LucideIcons.activity, 'Activity', user?.activityStatus != null ? '${user!.activityStatus} · ${_activityText[user.activityStatus] ?? ''}' : 'Not set'),
                  _Row(LucideIcons.utensils, 'Diet', user?.diet ?? 'Not set'),
                  _Row(LucideIcons.crosshair, 'Focus', user?.focusAreas.isNotEmpty ?? false ? user!.focusAreas.join(', ') : 'Not set'),
                  _Row(LucideIcons.dumbbell, 'Equipment', user?.equipment.isNotEmpty ?? false ? user!.equipment.map((k) => equipmentKitOptions[k]?.label ?? k).join(', ') : 'Not set'),
                  _Row(LucideIcons.clock, 'Workouts', _workoutHabit(user).isEmpty ? 'Not set' : _workoutHabit(user)),
                  _Row(LucideIcons.shieldAlert, 'Go easy on', user?.limitations.isNotEmpty ?? false ? user!.limitations.map((l) => limitationLabels[l] ?? l).join(', ') : 'Nothing'),
                ], 12),
                const SizedBox(height: 12),
                Text('These shape your recommendations, generated plans and calorie targets.', style: fg(size: 12, color: AppColors.white70)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const _Heading('Account'),
              ...spaced([
                _NavRow(LucideIcons.crown, user?.isPlus ?? false ? 'Your PLUS subscription' : 'FitGuide PLUS', () => openHref(context, '/plus')),
                if (!auth.isGuest) _NavRow(LucideIcons.bell, 'Reminders', () => showFgModal<void>(context, title: 'Reminders', maxWidth: 448, builder: (_) => const RemindersForm())),
                _NavRow(LucideIcons.watch, 'Connected apps and health data', () => dashboard.setTab(DashboardTab.progress)),
                _NavRow(LucideIcons.heartPulse, 'Health check (PAR-Q)', () => showParqModal(context)),
                if (user?.isCreator ?? false) _NavRow(LucideIcons.penTool, 'Coach studio', () => openWebPage('/studio')),
                if (!auth.isGuest && user?.role == 'user') _NavRow(LucideIcons.megaphone, 'Become a coach', () => showBecomeCoach(context)),
                if (user?.isAdmin ?? false) _NavRow(LucideIcons.shield, 'Admin', () => openWebPage('/admin')),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(16)),
                  child: Row(children: [
                    const Icon(LucideIcons.globe, size: 16),
                    const SizedBox(width: 12),
                    Expanded(child: Text('Language', style: fg(size: 14, weight: FontWeight.w700))),
                    const LanguageSwitcher(),
                  ]),
                ),
                if (!auth.isGuest) ...[
                  _NavRow(LucideIcons.download, 'Download my data', () => showFgModal<void>(context, title: 'Download my data', maxWidth: 448, builder: (_) => const DataExport())),
                  _NavRow(LucideIcons.keyRound, 'Change password', () => showFgModal<void>(context, title: 'Change password', maxWidth: 448, builder: (_) => const _ChangePassword())),
                  _NavRow(LucideIcons.trash2, 'Delete account', () => _confirmDelete(context, user!), danger: true),
                ],
              ], 8),
            ],
          ),
          FgButton(
            label: auth.isGuest ? 'Leave guest mode' : 'Sign out',
            icon: LucideIcons.logOut,
            style: FgButtonStyle.dangerOutline,
            expand: true,
            height: 54,
            radius: 16,
            fontSize: 14,
            fontWeight: FontWeight.w700,
            onPressed: onLogout,
          ),
        ], 16),
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text, {this.bottom = 12});
  final String text;
  final double bottom;

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.only(bottom: bottom),
        child: Semantics(header: true, child: Text(text.toUpperCase(), style: fg(size: 12, weight: FontWeight.w800, color: AppColors.white70, letterSpacing: 1.5))),
      );
}

class _Stat extends StatelessWidget {
  const _Stat(this.icon, this.color, this.label, this.value, {this.sub});
  final IconData icon;
  final Color color;
  final String label;
  final String value;
  final String? sub;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(16)),
      child: Column(children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(height: 4),
        Text(value, style: fg(size: 18, weight: FontWeight.w800)),
        Text(label, style: fg(size: 11, color: AppColors.white70)),
        if (sub != null) Text(sub!, style: fg(size: 11, color: color)),
      ]),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.icon, this.label, this.value);
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final valueText = Text(value, style: fg(size: 14, weight: FontWeight.w700));
    // Label in an 84px column beside the value, or above it with large system text.
    final large = largeText(context);
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.only(top: 2), child: Icon(icon, size: 16, color: AppColors.limeLight)),
      const SizedBox(width: 12),
      if (large)
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: fg(size: 14, color: AppColors.white70)), valueText]))
      else ...[
        SizedBox(width: 84, child: Text(label, style: fg(size: 14, color: AppColors.white70))),
        Expanded(child: valueText),
      ],
    ]);
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow(this.icon, this.title, this.onTap, {this.danger = false});
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? AppColors.red300 : AppColors.white;
    return Material(
      color: AppColors.obsidianWave,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 12),
            Expanded(child: Text(title, style: fg(size: 14, weight: FontWeight.w700, color: color))),
            const Icon(LucideIcons.chevronRight, size: 16, color: AppColors.white70),
          ]),
        ),
      ),
    );
  }
}

// ─── Password and account ────────────────────────────────────────────────────
class _ChangePassword extends StatefulWidget {
  const _ChangePassword();
  @override
  State<_ChangePassword> createState() => _ChangePasswordState();
}

class _ChangePasswordState extends State<_ChangePassword> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _repeat = TextEditingController();
  bool _saving = false;
  String? _error;
  bool _done = false;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _repeat.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _error = null);
    if (_current.text.isEmpty) return setState(() => _error = 'Enter your current password.');
    if (_next.text.length < Profile.passwordMin) return setState(() => _error = 'The new password needs at least ${Profile.passwordMin} characters.');
    if (_next.text != _repeat.text) return setState(() => _error = 'The new passwords don’t match.');
    setState(() => _saving = true);
    try {
      await ApiClient.instance.request('/auth/password', method: 'PUT', auth: true, body: {'currentPassword': _current.text, 'newPassword': _next.text});
      if (mounted) setState(() => _done = true);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not change your password.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_done) {
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.limeLight.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.limeLight.withValues(alpha: 0.3))),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Padding(padding: EdgeInsets.only(top: 2), child: Icon(LucideIcons.circleCheck, size: 16, color: AppColors.limeLight)),
            const SizedBox(width: 8),
            Expanded(child: Text('Password changed. You’re still signed in here; other devices will need to sign in again.', style: fg(size: 14))),
          ]),
        ),
        const SizedBox(height: 20),
        FgButton(label: 'Done', uppercase: true, expand: true, height: 52, radius: 16, fontSize: 12, fontWeight: FontWeight.w800, onPressed: () => Navigator.of(context).pop()),
      ]);
    }
    return AutofillGroup(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _PasswordInput(label: 'Current password', controller: _current),
        const SizedBox(height: 16),
        _PasswordInput(label: 'New password', controller: _next, isNew: true, hint: 'At least ${Profile.passwordMin} characters.'),
        const SizedBox(height: 16),
        _PasswordInput(label: 'Repeat new password', controller: _repeat, isNew: true),
        if (_error != null) ...[const SizedBox(height: 16), ErrorBox(_error!, compact: true)],
        const SizedBox(height: 16),
        FgButton(label: _saving ? 'Saving…' : 'Change password', loading: _saving, uppercase: true, expand: true, height: 52, radius: 16, fontSize: 12, fontWeight: FontWeight.w800, onPressed: _saving ? null : _save),
      ]),
    );
  }
}

class _PasswordInput extends StatelessWidget {
  const _PasswordInput({required this.label, required this.controller, this.isNew = false, this.hint});
  final String label;
  final TextEditingController controller;
  final bool isNew;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SmallLabel(label),
      const SizedBox(height: 6),
      FgTextField(
        controller: controller,
        obscure: true,
        fontSize: 14,
        radius: 12,
        border: AppColors.white30A(0.2),
        autofillHints: [isNew ? AutofillHints.newPassword : AutofillHints.password],
        semanticLabel: label,
      ),
      if (hint != null) ...[const SizedBox(height: 6), Text(hint!, style: fg(size: 12, color: AppColors.white70))],
    ]);
  }
}

class _DeleteAccount extends StatefulWidget {
  const _DeleteAccount();
  @override
  State<_DeleteAccount> createState() => _DeleteAccountState();
}

class _DeleteAccountState extends State<_DeleteAccount> {
  final _password = TextEditingController();
  bool _deleting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _password.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _remove() async {
    final auth = context.read<AuthController>();
    setState(() {
      _error = null;
      _deleting = true;
    });
    try {
      await ApiClient.instance.request('/auth/account', method: 'DELETE', auth: true, body: {'password': _password.text});
      final user = auth.user;
      if (user != null) await discardQueuedSessions(user.id);
      if (mounted) Navigator.of(context).pop();
      auth.logout();
    } catch (err) {
      if (mounted) {
        setState(() {
          _error = err is ApiError ? err.message : 'Could not delete your account.';
          _deleting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text('Enter your password to permanently delete your FitGuide account and everything in it.', style: fg(size: 14, color: AppColors.white70)),
      const SizedBox(height: 16),
      _PasswordInput(label: 'Password', controller: _password),
      if (_error != null) ...[const SizedBox(height: 16), ErrorBox(_error!, compact: true)],
      const SizedBox(height: 16),
      FgButton(
        label: _deleting ? 'Deleting…' : 'Delete my account',
        loading: _deleting,
        style: FgButtonStyle.danger,
        uppercase: true,
        expand: true,
        height: 52,
        radius: 16,
        fontSize: 12,
        fontWeight: FontWeight.w800,
        onPressed: _deleting || _password.text.isEmpty ? null : _remove,
      ),
    ]);
  }
}

// ─── Edit form ───────────────────────────────────────────────────────────────
class _EditProfile extends StatefulWidget {
  const _EditProfile({required this.user});
  final AppUser user;
  @override
  State<_EditProfile> createState() => _EditProfileState();
}

class _EditProfileState extends State<_EditProfile> {
  late final AppUser u = widget.user;
  late final _name = TextEditingController(text: u.name);
  // Body fields are shown in the chosen units: cm, or feet and inches; kg or lb.
  late Units _units = u.units;
  final _height = TextEditingController();
  final _feet = TextEditingController();
  final _inches = TextEditingController();
  late final _weight = TextEditingController(text: u.weight == null ? '' : numText(weightIn(u.weight!, _units)));
  late final _target = TextEditingController(text: u.targetWeight == null ? '' : numText(weightIn(u.targetWeight!, _units)));
  late final _birthYear = TextEditingController(text: u.birthYear?.toString() ?? '');
  late final _minutes = TextEditingController(text: u.workoutMinutes?.toString() ?? '');
  late final _days = TextEditingController(text: u.daysPerWeek?.toString() ?? '');
  late String _gender = u.gender ?? 'Prefer not to say';
  late String _level = u.fitnessLevel ?? 'Beginner';
  late String _activity = u.activityStatus ?? 'Active';
  late String _goal = u.goal ?? 'Vitality';
  late String _diet = u.diet ?? 'Flexible Balanced Plan';
  late String? _avatarUrl = u.avatarUrl;
  late bool _leaderboards = u.showOnLeaderboards;
  late List<String> _focus = [...u.focusAreas];
  late List<String> _equipment = [...u.equipment];
  late List<String> _limitations = [...u.limitations];
  bool _saving = false;
  bool _uploading = false;
  bool _saved = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fillHeight(u.height);
  }

  double? _heightCm() {
    if (!_units.isImperial) return double.tryParse(_height.text.trim());
    final feet = int.tryParse(_feet.text.trim());
    final inches = double.tryParse(_inches.text.trim());
    if (feet == null && inches == null) return null;
    return (((feet ?? 0) * 12 + (inches ?? 0)) * cmPerInch * 10).round() / 10;
  }

  void _fillHeight(double? cm) {
    _height.text = cm == null ? '' : numText(cm);
    final inches = cm == null ? null : (cm / cmPerInch).round();
    _feet.text = inches == null ? '' : '${inches ~/ 12}';
    _inches.text = inches == null ? '' : '${inches % 12}';
  }

  double? _kg(TextEditingController c) {
    final value = double.tryParse(c.text.trim());
    return value == null ? null : kgFrom(value, _units);
  }

  /// Switch units, converting what's in the body fields.
  void _setUnits(Units next) {
    final height = _heightCm();
    final weight = _kg(_weight);
    final target = _kg(_target);
    setState(() {
      _units = next;
      _fillHeight(height);
      _weight.text = weight == null ? '' : numText(weightIn(weight, next));
      _target.text = target == null ? '' : numText(weightIn(target, next));
    });
  }

  @override
  void dispose() {
    for (final c in [_name, _height, _feet, _inches, _weight, _target, _birthYear, _minutes, _days]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final auth = context.read<AuthController>();
    setState(() => _error = null);
    try {
      final picked = await pickImage();
      if (picked == null) return;
      if (auth.isGuest) {
        // Guests keep no server copy; the website shows a local preview only.
        setState(() => _error = 'Create an account to add a profile photo.');
        return;
      }
      setState(() => _uploading = true);
      final data = await ApiClient.instance.request('/upload/avatar', method: 'POST', auth: true, files: [
        UploadFile(field: 'avatar', bytes: picked.bytes, filename: picked.filename, contentType: picked.contentType),
      ]);
      if (mounted) setState(() => _avatarUrl = asString(data['avatarUrl']));
    } on ImagePickError catch (err) {
      if (mounted) setState(() => _error = err.message);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not upload the photo.');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _save() async {
    final auth = context.read<AuthController>();
    if (_name.text.trim().isEmpty) return setState(() => _error = 'Name cannot be empty');
    setState(() {
      _error = null;
      _saving = true;
    });
    num? numberOrNull(String s) => s.trim().isEmpty ? null : num.tryParse(s.trim());
    final changes = <String, dynamic>{
      'name': _name.text.trim(),
      'gender': _gender,
      'height': _heightCm(),
      'weight': _kg(_weight),
      'targetWeight': _kg(_target),
      'units': _units.name,
      'birthYear': numberOrNull(_birthYear.text),
      'fitnessLevel': _level,
      'activityStatus': _activity,
      'goal': _goal,
      'diet': _diet,
      'avatarUrl': _avatarUrl,
      'showOnLeaderboards': _leaderboards,
      'focusAreas': _focus,
      'equipment': _equipment,
      'limitations': _limitations,
      'workoutMinutes': numberOrNull(_minutes.text),
      'daysPerWeek': numberOrNull(_days.text),
    };
    // Optional fields an empty value clears.
    const clearable = {'birthYear', 'workoutMinutes', 'daysPerWeek', 'avatarUrl'};
    try {
      if (auth.isGuest) {
        auth.updateUser(changes);
      } else {
        // The API rejects nulls for body measurements: leave empty ones unchanged.
        final body = {for (final e in changes.entries) if (e.value != null || clearable.contains(e.key)) e.key: e.value};
        final data = await ApiClient.instance.request('/auth/profile', method: 'PUT', auth: true, body: body);
        auth.updateUser(asJson(data['user']));
      }
      if (!mounted) return;
      setState(() => _saved = true);
      await Future<void>.delayed(const Duration(milliseconds: 900));
      if (mounted) Navigator.of(context).pop();
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not save your profile.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _choices(String label, List<String> options, String value, ValueChanged<String> onChanged) {
    return FormSection(
      title: label,
      // Two a row where there's room (`sm:grid-cols-2`).
      child: FgGrid(columns: 1, sm: 2, gap: 8, children: [
        for (final o in options)
          SizedBox(
            width: double.infinity,
            child: FgChip(
              label: o,
              selected: value == o,
              filled: false,
              radius: 8,
              alignment: Alignment.centerLeft,
              unselectedBackground: AppColors.whiteA(0.05),
              unselectedText: AppColors.white70,
              onTap: () => onChanged(o),
            ),
          ),
      ]),
    );
  }

  Widget _multi(String label, List<(String, String)> options, List<String> value, ValueChanged<List<String>> onChanged) {
    return FormSection(
      title: label,
      // Chips have 48px touch areas, which already space the rows.
      child: Wrap(spacing: 8, children: [
        for (final (id, text) in options)
          FgChip(
            label: text,
            selected: value.contains(id),
            filled: false,
            unselectedBackground: AppColors.whiteA(0.05),
            unselectedText: AppColors.white70,
            onTap: () => onChanged(value.contains(id) ? value.where((v) => v != id).toList() : [...value, id]),
          ),
      ]),
    );
  }

  Widget _text(String label, TextEditingController c, {bool number = false, bool decimal = false}) {
    return FormFieldLabel(
      label: label,
      child: number ? NumberField(controller: c, decimal: decimal, radius: 8, fontSize: 16, border: AppColors.white30A(0.4), semanticLabel: label) : FgTextField(controller: c, maxLength: Profile.nameMax),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isGuest = context.watch<AuthController>().isGuest;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: spaced([
        Center(
          child: Stack(children: [
            Avatar(url: _avatarUrl, size: 80, borderColor: AppColors.limeLight, background: AppColors.noirEclipse),
            Positioned(
              right: 0,
              bottom: 0,
              child: Semantics(
                button: true,
                label: 'Change profile photo',
                excludeSemantics: true,
                child: Material(
                  color: AppColors.limeLight,
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: _uploading ? null : _pickAvatar,
                    child: Padding(
                      padding: const EdgeInsets.all(6),
                      child: _uploading
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.noirEclipse))
                          : const Icon(LucideIcons.camera, size: 14, color: AppColors.noirEclipse),
                    ),
                  ),
                ),
              ),
            ),
          ]),
        ),
        _text('Name', _name),
        FormFieldLabel(
          label: 'Units',
          child: Segmented<Units>(
            options: const [(Units.metric, 'kg · cm'), (Units.imperial, 'lb · ft/in')],
            value: _units,
            expand: true,
            onChanged: _setUnits,
          ),
        ),
        if (_units.isImperial)
          Row(children: [
            Expanded(child: _text('Height (ft)', _feet, number: true)),
            const SizedBox(width: 12),
            Expanded(child: _text('Height (in)', _inches, number: true)),
          ])
        else
          _text('Height (cm)', _height, number: true),
        Row(children: [
          Expanded(child: _text('Weight (${_units.weight})', _weight, number: true, decimal: true)),
          const SizedBox(width: 12),
          Expanded(child: _text('Target (${_units.weight})', _target, number: true, decimal: true)),
        ]),
        _text('Birth year (for calorie targets)', _birthYear, number: true),
        _choices('Gender', Profile.genders, _gender, (v) => setState(() => _gender = v)),
        _choices('Fitness level', Profile.fitnessLevels, _level, (v) => setState(() => _level = v)),
        _choices('Activity', Profile.activityStatuses, _activity, (v) => setState(() => _activity = v)),
        _choices('Main goal', Profile.goals, _goal, (v) => setState(() => _goal = v)),
        _choices('Diet', Profile.diets, _diet, (v) => setState(() => _diet = v)),
        _multi('Focus areas', [for (final a in Profile.focusAreas) (a, a)], _focus, (v) => setState(() => _focus = v)),
        _multi(
          'Equipment you have',
          [for (final k in Profile.equipmentKits) (k, equipmentKitOptions[k]!.label)],
          _equipment,
          // "No equipment" and the kits exclude each other.
          (v) => setState(() => _equipment = v.contains('none') && !_equipment.contains('none') ? ['none'] : v.where((k) => k != 'none' || v.length == 1).toList()),
        ),
        Row(children: [
          Expanded(child: _text('Minutes per workout', _minutes, number: true)),
          const SizedBox(width: 12),
          Expanded(child: _text('Workouts per week', _days, number: true)),
        ]),
        _multi('Go easy on', [for (final l in Profile.limitations) (l, limitationLabels[l]!)], _limitations, (v) => setState(() => _limitations = v)),
        if (!isGuest)
          CheckRow(
            value: _leaderboards,
            onChanged: (v) => setState(() => _leaderboards = v),
            title: 'Show me on leaderboards',
            subtitle: 'Friends and challenge members see your first name and last initial.',
          ),
        if (_error != null) ErrorBox(_error!, compact: true),
        FgButton(
          label: _saved ? 'Saved' : _saving ? 'Saving…' : 'Save changes',
          icon: _saved ? LucideIcons.circleCheck : null,
          loading: _saving,
          expand: true,
          onPressed: _saving || _uploading ? null : _save,
        ),
      ], 20),
    );
  }
}
