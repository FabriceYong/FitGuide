import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/coach.dart';
import '../../services/coach_service.dart';
import '../../widgets/forms.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';

/// The "Become a coach" dialog: apply, or see how the application is going
/// (features/coaches/BecomeCoach.tsx).
Future<void> showBecomeCoach(BuildContext context) =>
    showFgModal<void>(context, title: 'Become a FitGuide coach', maxWidth: 672, builder: (_) => const _BecomeCoach());

class _BecomeCoach extends StatefulWidget {
  const _BecomeCoach();
  @override
  State<_BecomeCoach> createState() => _BecomeCoachState();
}

class _BecomeCoachState extends State<_BecomeCoach> {
  bool _loading = true;
  CoachApplication? _application;
  bool _editing = false;
  String? _error;
  bool _saving = false;
  final _bio = TextEditingController();
  final _specialties = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _location = TextEditingController();

  @override
  void initState() {
    super.initState();
    fetchMyApplication().then((a) {
      if (!mounted) return;
      setState(() {
        _application = a;
        _loading = false;
      });
      _fill(a);
    }).catchError((Object err) {
      if (mounted) {
        setState(() {
          _error = '$err';
          _loading = false;
        });
      }
    });
  }

  void _fill(CoachApplication? a) {
    if (a == null) return;
    _bio.text = a.bio;
    _specialties.text = a.specialties.join(', ');
    _email.text = a.contactEmail ?? '';
    _phone.text = a.phone ?? '';
    _location.text = a.location ?? '';
  }

  @override
  void dispose() {
    for (final c in [_bio, _specialties, _email, _phone, _location]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _send() async {
    setState(() => _error = null);
    if (_bio.text.trim().length < 20) return setState(() => _error = 'Tell members about yourself in at least 20 characters.');
    if (_email.text.trim().isEmpty && _phone.text.trim().isEmpty) return setState(() => _error = 'Add an email or a phone number members can reach you at.');
    setState(() => _saving = true);
    try {
      final a = await applyToCoach(
        bio: _bio.text.trim(),
        specialties: _specialties.text.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList(),
        contactEmail: _email.text.trim(),
        phone: _phone.text.trim(),
        location: _location.text.trim(),
      );
      if (mounted) {
        setState(() {
          _application = a;
          _editing = false;
        });
      }
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not send your application.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _field(String label, TextEditingController c, {String? hint, TextInputType? keyboard, int maxLines = 1, int? maxLength}) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: FormFieldLabel(
          label: label,
          labelStyle: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70),
          child: FgTextField(controller: c, hint: hint, keyboardType: keyboard, maxLines: maxLines, maxLength: maxLength, fontSize: 14, semanticLabel: label),
        ),
      );

  @override
  Widget build(BuildContext context) {
    if (_loading) return const LoadingRow('Loading…', padding: EdgeInsets.zero);
    final a = _application;
    if (a != null && !_editing) {
      final status = switch (a.status) {
        'approved' => 'You’re a FitGuide coach. Open the coach studio from your profile.',
        'declined' => 'Your application wasn’t approved this time.',
        _ => 'Thanks! Your application is waiting for review. You’ll get coach tools in the studio as soon as it’s approved.',
      };
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(status, style: fg(size: 14)),
        if (a.status == 'declined' && a.reviewNote != null) ...[const SizedBox(height: 8), Text('Reviewer: ${a.reviewNote}', style: fg(size: 14, color: AppColors.amber200))],
        if (a.status != 'approved') ...[
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerLeft,
            child: FgButton(
              label: a.status == 'declined' ? 'Update and apply again' : 'Edit application',
              style: FgButtonStyle.secondary,
              height: 40,
              radius: 12,
              fontSize: 14,
              fontWeight: FontWeight.w700,
              onPressed: () => setState(() => _editing = true),
            ),
          ),
        ],
      ]);
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text('Coaches write workouts and multi-week programs for the FitGuide catalog and can train members in person. The FitGuide team reviews every application.',
          style: fg(size: 14, color: AppColors.white70)),
      const SizedBox(height: 16),
      _field('About you', _bio, hint: 'Your experience, qualifications and how you coach', maxLines: 4, maxLength: 1000),
      _field('Specialties (comma separated)', _specialties, hint: 'e.g. Strength, Running, Pre-natal'),
      _field('Contact email', _email, keyboard: TextInputType.emailAddress, maxLength: 200),
      _field('Phone / WhatsApp', _phone, hint: '+44 7700 900123', keyboard: TextInputType.phone, maxLength: 40),
      _field('Where you train people', _location, hint: 'e.g. Riverside Gym, Leeds', maxLength: 120),
      Text('Add an email or a phone number. Signed-in members see these on your profile and programs so they can ask you for a spot.', style: fg(size: 12, color: AppColors.white70)),
      if (_error != null) ...[const SizedBox(height: 12), ErrorBox(_error!, compact: true)],
      const SizedBox(height: 16),
      FgButton(
        label: _saving ? 'Sending…' : (a == null ? 'Send application' : 'Send again'),
        loading: _saving,
        expand: true,
        height: 48,
        radius: 12,
        fontSize: 14,
        fontWeight: FontWeight.w700,
        onPressed: _saving ? null : _send,
      ),
    ]);
  }
}
