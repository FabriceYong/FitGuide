import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';
import 'auth_page.dart';

/// Ask for a password reset link by email (features/auth/ForgotPasswordPage.js).
/// The link opens the website, where the new password is chosen; then the
/// member signs in here with it.
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key, this.initialEmail = ''});
  final String initialEmail;

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  late final _email = TextEditingController(text: widget.initialEmail);
  bool _loading = false;
  String? _error;
  String? _sentTo;

  @override
  void initState() {
    super.initState();
    _email.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _email.text.trim();
    if (_loading || email.isEmpty) return;
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      await ApiClient.instance.request('/auth/forgot-password', method: 'POST', body: {'email': email});
      if (mounted) setState(() => _sentTo = email);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _back() => Navigator.of(context).pop();

  @override
  Widget build(BuildContext context) {
    return AuthPage(
      maxWidth: 440,
      header: LinkText('Back to sign in', onTap: _back),
      child: _sentTo == null ? _form() : _sent(_sentTo!),
    );
  }

  Widget _form() {
    return AutofillGroup(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const StepHeading(
            title: 'Forgot your password?',
            description: "Enter the email you signed up with and we'll send you a link to choose a new one.",
          ),
          if (_error != null) ...[ErrorBox(_error!), const SizedBox(height: 16)],
          FormFieldLabel(
            label: 'Email',
            child: FgTextField(
              controller: _email,
              hint: 'you@example.com',
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              textInputAction: TextInputAction.send,
              autofocus: widget.initialEmail.isEmpty,
              enabled: !_loading,
              onSubmitted: (_) => _submit(),
            ),
          ),
          const SizedBox(height: 20),
          FgButton(
            label: _loading ? 'Sending…' : 'Send reset link',
            loading: _loading,
            expand: true,
            onPressed: _email.text.trim().isEmpty ? null : _submit,
          ),
          const SizedBox(height: 16),
          Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text('Remembered it? ', style: fg(size: 14, color: AppColors.white70)),
              LinkText('Back to sign in', onTap: _back),
            ],
          ),
        ],
      ),
    );
  }

  Widget _sent(String email) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: AppColors.limeLight.withValues(alpha: 0.15), shape: BoxShape.circle),
            child: const Icon(LucideIcons.mailCheck, size: 24, color: AppColors.limeLight),
          ),
        ),
        const SizedBox(height: 20),
        StepHeading(
          title: 'Check your email',
          description: "If an account uses $email, we've sent it a link to choose a new password. The link expires in 1 hour.",
        ),
        Text(
          'Open the link on any device, choose a new password, then sign in here with it. Nothing after a few minutes? Check your spam folder, or try again.',
          style: fg(size: 14, color: AppColors.white70, height: 1.5),
        ),
        const SizedBox(height: 24),
        FgButton(label: 'Back to sign in', expand: true, onPressed: _back),
        const SizedBox(height: 12),
        FgButton(label: 'Try again', style: FgButtonStyle.secondary, expand: true, onPressed: () => setState(() => _sentTo = null)),
      ],
    );
  }
}
