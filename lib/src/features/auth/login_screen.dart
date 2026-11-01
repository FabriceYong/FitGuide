import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/images.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/json.dart';
import '../../state/auth_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';
import 'auth_page.dart';
import 'forgot_password_screen.dart';

/// Sign in (features/auth/LoginPage.js).
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onSwitchToRegister, required this.onEmailNotConfirmed});
  final VoidCallback onSwitchToRegister;

  /// The right password, but the email isn't confirmed yet (a new link is on its way).
  final void Function(String email, String password) onEmailNotConfirmed;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _email.addListener(_refresh);
    _password.addListener(_refresh);
  }

  void _refresh() => setState(() {});

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_loading || _email.text.isEmpty || _password.text.isEmpty) return;
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final data = await ApiClient.instance.request('/auth/login', method: 'POST', body: {'email': _email.text.trim(), 'password': _password.text});
      if (!mounted) return;
      await context.read<AuthController>().login(data);
    } catch (err) {
      if (!mounted) return;
      if (err is ApiError && err.code == 'EMAIL_NOT_VERIFIED') {
        widget.onEmailNotConfirmed(asString(err.data?['email']) ?? _email.text.trim(), _password.text);
      } else {
        setState(() => _error = err is ApiError ? err.message : 'Login failed. Please check your credentials.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _forgotPassword() {
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ForgotPasswordScreen(initialEmail: _email.text.trim())));
  }

  @override
  Widget build(BuildContext context) {
    return AuthPage(
      maxWidth: 440,
      header: LinkText('Create an account', onTap: _loading ? null : widget.onSwitchToRegister),
      child: AutofillGroup(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _Banner(),
            const SizedBox(height: 24),
            const StepHeading(title: 'Sign in', description: 'Welcome back. Sign in to continue your training.'),
            if (_error != null) ...[ErrorBox(_error!), const SizedBox(height: 16)],
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
              child: PasswordField(controller: _password, enabled: !_loading, textInputAction: TextInputAction.done, onSubmitted: (_) => _submit()),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: LinkText('Forgot password?', onTap: _loading ? null : _forgotPassword),
            ),
            const SizedBox(height: 8),
            FgButton(
              label: _loading ? 'Signing in…' : 'Sign in',
              loading: _loading,
              expand: true,
              onPressed: _email.text.isEmpty || _password.text.isEmpty ? null : _submit,
            ),
            const SizedBox(height: 16),
            Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text("Don't have an account? ", style: fg(size: 14, color: AppColors.white70)),
                LinkText('Create an account', onTap: _loading ? null : widget.onSwitchToRegister),
              ],
            ),
            // The seeded demo login, for development builds only: never in the released app.
            if (kDebugMode) ...[
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.whiteA(0.03),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.white30A(0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Demo account (development only)', style: fg(size: 14, weight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text('Email: demo@fitguide.com', style: fg(size: 14, color: AppColors.white70)),
                    Text('Password: demo123', style: fg(size: 14, color: AppColors.white70)),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),
            Text('© ${DateTime.now().year} FitGuide', textAlign: TextAlign.center, style: fg(size: 12, color: AppColors.white70)),
          ],
        ),
      ),
    );
  }
}

/// What FitGuide offers, over a photo, above the form (the website's BrandPanel).
class _Banner extends StatelessWidget {
  const _Banner();

  static const _points = [
    (LucideIcons.circlePlay, 'Guided workouts with a demonstration for every move'),
    (LucideIcons.calendarDays, 'A weekly plan built around your goal'),
    (LucideIcons.sparkles, 'An AI coach that adjusts your plan as you go'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.white30A(0.15))),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(child: NetImage(unsplash('1517836357463-d25dfeac3438', query: 'w=900&q=70&fit=crop'))),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [AppColors.noirEclipse, AppColors.noirEclipse.withValues(alpha: 0.75), AppColors.noirEclipse.withValues(alpha: 0.25)],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 64, 18, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Your training, planned and tracked', style: fg(size: 22, weight: FontWeight.w800, height: 1.25)),
                const SizedBox(height: 12),
                for (final (icon, text) in _points)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Row(children: [
                      Icon(icon, size: 16, color: AppColors.limeLight),
                      const SizedBox(width: 10),
                      Expanded(child: Text(text, style: fg(size: 13, color: AppColors.whiteA(0.9)))),
                    ]),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
