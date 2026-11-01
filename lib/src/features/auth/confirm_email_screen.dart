import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../state/auth_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';
import 'auth_page.dart';

// The API sends at most one link a minute.
const _resendWaitSec = 60;

/// After signing up, or signing in before confirming (CheckEmailPage.js): a
/// link to confirm the email is on its way. The link opens the website;
/// back here, "I've confirmed it" signs in with the password just entered.
class ConfirmEmailScreen extends StatefulWidget {
  const ConfirmEmailScreen({super.key, required this.email, required this.password, required this.onBack});
  final String email;
  final String password;
  final VoidCallback onBack;

  @override
  State<ConfirmEmailScreen> createState() => _ConfirmEmailScreenState();
}

class _ConfirmEmailScreenState extends State<ConfirmEmailScreen> {
  int _wait = _resendWaitSec;
  Timer? _timer;
  bool _checking = false;
  bool _sending = false;
  String? _status;
  String? _error;

  @override
  void initState() {
    super.initState();
    _startWait();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startWait() {
    _timer?.cancel();
    _wait = _resendWaitSec;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      setState(() => _wait--);
      if (_wait <= 0) timer.cancel();
    });
  }

  /// Sign in now that the email is confirmed (on the website, from the link).
  Future<void> _continue() async {
    setState(() {
      _checking = true;
      _error = null;
      _status = null;
    });
    try {
      final data = await ApiClient.instance.request('/auth/login', method: 'POST', body: {'email': widget.email, 'password': widget.password});
      if (mounted) await context.read<AuthController>().login(data);
    } catch (err) {
      if (!mounted) return;
      setState(() => _error = err is ApiError && err.code == 'EMAIL_NOT_VERIFIED'
          ? "It isn't confirmed yet. Tap the button in the email first, then come back here."
          : err is ApiError
              ? err.message
              : 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  Future<void> _resend() async {
    setState(() {
      _sending = true;
      _error = null;
      _status = null;
    });
    try {
      await ApiClient.instance.request('/auth/resend-verification', method: 'POST', body: {'email': widget.email});
      if (mounted) setState(() => _status = 'A new link is on its way.');
      _startWait();
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthPage(
      maxWidth: 480,
      header: LinkText('Back to sign in', onTap: widget.onBack),
      child: Column(
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
            title: 'Confirm your email',
            description: "We've sent a link to ${widget.email}. Tap the button in that email to confirm it's yours, then come back and continue.",
          ),
          Text(
            'The link expires in 24 hours. Nothing there after a few minutes? Check your spam folder, or send it again.',
            style: fg(size: 14, color: AppColors.white70, height: 1.5),
          ),
          const SizedBox(height: 20),
          if (_error != null) ...[ErrorBox(_error!), const SizedBox(height: 16)],
          if (_status != null) ...[
            Semantics(liveRegion: true, child: Text(_status!, style: fg(size: 14, color: AppColors.limeLight))),
            const SizedBox(height: 16),
          ],
          FgButton(label: _checking ? 'Checking…' : "I've confirmed it", loading: _checking, expand: true, onPressed: _checking ? null : _continue),
          const SizedBox(height: 12),
          FgButton(
            label: _sending ? 'Sending…' : (_wait > 0 ? 'Resend email ($_wait s)' : 'Resend email'),
            style: FgButtonStyle.secondary,
            expand: true,
            loading: _sending,
            onPressed: _sending || _wait > 0 ? null : _resend,
          ),
        ],
      ),
    );
  }
}
