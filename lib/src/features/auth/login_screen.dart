import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../state/auth_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';
import 'auth_page.dart';

/// Sign in (features/auth/LoginPage.js).
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onSwitchToRegister});
  final VoidCallback onSwitchToRegister;

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
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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
            const SizedBox(height: 20),
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
                  Text('Demo account', style: fg(size: 14, weight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text('Email: demo@fitguide.com', style: fg(size: 14, color: AppColors.white70)),
                  Text('Password: demo123', style: fg(size: 14, color: AppColors.white70)),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text('© ${DateTime.now().year} FitGuide', textAlign: TextAlign.center, style: fg(size: 12, color: AppColors.white70)),
          ],
        ),
      ),
    );
  }
}
