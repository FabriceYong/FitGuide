import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../models/json.dart';
import '../../../services/catalog_service.dart';
import '../../../widgets/forms.dart';
import '../../../widgets/image_pick.dart';
import '../../../widgets/ui.dart';

const _goalLabels = {'Vitality': 'Overall health', 'Muscle': 'Build muscle', 'Weight': 'Lose fat', 'Flexibility': 'Mobility'};

/// Create the account with the answers so far (ProfileStep.js).
class ProfileStep extends StatefulWidget {
  const ProfileStep({super.key, required this.onboardingData, required this.onComplete, required this.onBack});
  final Json onboardingData;
  final ValueChanged<Json> onComplete;
  final VoidCallback onBack;

  @override
  State<ProfileStep> createState() => _ProfileStepState();
}

class _ProfileStepState extends State<ProfileStep> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  PickedImage? _avatar;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    try {
      final picked = await pickImage();
      if (picked == null) return;
      setState(() {
        _avatar = picked;
        _error = null;
      });
    } on ImagePickError catch (err) {
      setState(() => _error = err.message);
    }
  }

  Future<void> _submit() async {
    final d = widget.onboardingData;
    if (_name.text.trim().isEmpty) return setState(() => _error = 'Name is required');
    if (_email.text.trim().isEmpty) return setState(() => _error = 'Email is required');
    if (_password.text.length < 6) return setState(() => _error = 'Password must be at least 6 characters');
    setState(() {
      _error = null;
      _loading = true;
    });
    final api = ApiClient.instance;
    try {
      final data = await api.request('/auth/register', method: 'POST', body: {
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        'password': _password.text,
        'gender': d['gender'] ?? 'Prefer not to say',
        'height': d['height'] ?? 170,
        'weight': d['weight'] ?? 70,
        'targetWeight': d['targetWeight'] ?? 70,
        'fitnessLevel': d['fitnessLevel'] ?? 'Beginner',
        'activityStatus': d['activityStatus'] ?? 'Active',
        'goal': d['goal'] ?? 'Vitality',
        'diet': d['diet'] ?? 'Mediterranean Diet',
        'focusAreas': d['focusAreas'] ?? <String>[],
        'equipment': d['equipment'] ?? <String>[],
        'limitations': d['limitations'] ?? <String>[],
        'workoutMinutes': d['workoutMinutes'],
        'daysPerWeek': d['daysPerWeek'],
      });
      // Registering returned the session tokens; keep them before uploading.
      await api.saveSession(data);
      var response = data;
      final avatar = _avatar;
      if (avatar != null) {
        // Uploads require an account, so the avatar is sent after registering.
        try {
          final upload = await api.request('/upload/avatar', method: 'POST', auth: true, files: [
            UploadFile(field: 'avatar', bytes: avatar.bytes, filename: avatar.filename, contentType: avatar.contentType),
          ]);
          final updated = await api.request('/auth/profile', method: 'PUT', auth: true, body: {'avatarUrl': upload['avatarUrl']});
          response = {...data, 'user': updated['user']};
        } catch (_) {
          // Account created; the photo can be added later from the profile.
        }
      }
      widget.onComplete(response);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Registration failed.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.onboardingData;
    final focus = List<String>.from(d['focusAreas'] as List? ?? const []);
    final summary = [
      ('Goal', _goalLabels[d['goal']] ?? '${d['goal']}'),
      ('Level', '${d['fitnessLevel']}'),
      ('Height', '${d['height']} cm'),
      ('Weight', '${d['weight']} kg (target ${d['targetWeight']} kg)'),
      ('Diet', '${d['diet']}'),
      if (focus.isNotEmpty) ('Focus', focus.join(', ')),
    ];
    return AutofillGroup(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const StepHeading(title: 'Create your account', description: 'Save your answers, workouts and progress, and pick up on any device.'),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.whiteA(0.03), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.white30A(0.2))),
            child: Table(
              columnWidths: const {0: IntrinsicColumnWidth(), 1: FlexColumnWidth()},
              children: [
                for (final (label, value) in summary)
                  TableRow(children: [
                    Padding(padding: const EdgeInsets.only(right: 24, bottom: 8), child: Text(label, style: fg(size: 14, color: AppColors.white70))),
                    Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(value, style: fg(size: 14, weight: FontWeight.w500))),
                  ]),
              ],
            ),
          ),
          const SizedBox(height: 24),
          if (_error != null) ...[ErrorBox(_error!), const SizedBox(height: 16)],
          Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.noirEclipse, border: Border.all(color: AppColors.white30A(0.4))),
                clipBehavior: Clip.antiAlias,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (_avatar != null)
                      Image.memory(Uint8List.fromList(_avatar!.bytes), fit: BoxFit.cover, semanticLabel: 'Your new profile photo')
                    else
                      const Icon(LucideIcons.user, size: 24, color: AppColors.white70),
                    if (_loading && _avatar != null)
                      ColoredBox(
                        color: AppColors.noirEclipse.withValues(alpha: 0.6),
                        child: const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FgButton(
                      label: _avatar != null ? 'Change photo' : 'Add a photo',
                      style: FgButtonStyle.secondary,
                      height: 40,
                      fontSize: 14,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      onPressed: _loading ? null : _pickAvatar,
                    ),
                    const SizedBox(height: 4),
                    Text('Optional. JPEG, PNG, WebP or GIF, up to 5 MB.', style: fg(size: 14, color: AppColors.white70)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          FormFieldLabel(
            label: 'Full name',
            child: FgTextField(controller: _name, autofillHints: const [AutofillHints.name], textInputAction: TextInputAction.next, enabled: !_loading),
          ),
          const SizedBox(height: 20),
          FormFieldLabel(
            label: 'Email',
            child: FgTextField(
              controller: _email,
              hint: 'you@example.com',
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              textInputAction: TextInputAction.next,
              enabled: !_loading,
            ),
          ),
          const SizedBox(height: 20),
          FormFieldLabel(
            label: 'Password',
            hint: 'At least 6 characters.',
            child: PasswordField(controller: _password, newPassword: true, enabled: !_loading, textInputAction: TextInputAction.done, onSubmitted: (_) => _submit()),
          ),
          const SizedBox(height: 32),
          Container(
            padding: const EdgeInsets.only(top: 24),
            decoration: BoxDecoration(border: Border(top: BorderSide(color: AppColors.white30A(0.15)))),
            // Stacked, Create account on top, when large text doesn't fit both.
            child: OverflowBar(
              alignment: MainAxisAlignment.spaceBetween,
              overflowAlignment: OverflowBarAlignment.end,
              overflowDirection: VerticalDirection.up,
              overflowSpacing: 12,
              children: [
                FgButton(label: 'Back', style: FgButtonStyle.secondary, icon: LucideIcons.arrowLeft, onPressed: _loading ? null : widget.onBack),
                FgButton(label: _loading ? 'Creating account…' : 'Create account', loading: _loading, onPressed: _submit),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
