import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/analytics.dart';
import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/i18n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/json.dart';
import '../../navigation.dart';
import '../../state/auth_controller.dart';
import '../../widgets/ui.dart';
import '../common/site_page.dart';

class _Price {
  _Price(Json j)
      : interval = asString(j['interval']) ?? 'monthly',
        amount = asInt(j['amount']) ?? 0,
        currency = (asString(j['currency']) ?? 'usd').toUpperCase();
  final String interval;
  final int amount;
  final String currency;

  String get money {
    const symbols = {'USD': r'$', 'EUR': '€', 'GBP': '£', 'CAD': r'CA$', 'AUD': r'A$'};
    final value = (amount / 100).toStringAsFixed(2);
    final symbol = symbols[currency];
    return symbol != null ? '$symbol$value' : '$value $currency';
  }
}

/// /plus: what PLUS includes, checkout and subscription management
/// (features/plus/PlusView.tsx). Checkout and the billing portal are
/// Stripe pages, opened in the browser.
class PlusScreen extends StatefulWidget {
  const PlusScreen({super.key});

  @override
  State<PlusScreen> createState() => _PlusScreenState();
}

class _PlusScreenState extends State<PlusScreen> with WidgetsBindingObserver {
  Json? _status;
  String? _busy;
  String? _message;
  bool _awaitingCheckout = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (context.read<AuthController>().hasAccount) _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Back from Stripe in the browser: refresh the plan.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _awaitingCheckout) _load(afterCheckout: true);
  }

  Future<void> _load({bool afterCheckout = false}) async {
    final auth = context.read<AuthController>();
    final t = context.read<LocaleController>().t;
    try {
      final data = await ApiClient.instance.request('/billing', auth: true);
      if (!mounted) return;
      auth.updateUser({'plan': data['plan']});
      setState(() {
        _status = data;
        if (afterCheckout) {
          _awaitingCheckout = false;
          if (data['plan'] == 'plus') _message = t('plus.welcome');
        }
      });
    } catch (err) {
      if (mounted) setState(() => _message = '$err');
    }
  }

  Future<void> _go(String key, String path, [Json? body]) async {
    setState(() {
      _busy = key;
      _message = null;
    });
    try {
      final data = await ApiClient.instance.request(path, method: 'POST', auth: true, body: body);
      if (key != 'portal') track('checkout_started', path: '/plus', props: {'interval': key});
      final url = asString(data['url']);
      if (url != null) {
        _awaitingCheckout = true;
        await openExternal(url);
        if (mounted) setState(() => _message = context.read<LocaleController>().t('plus.browser'));
      }
    } catch (err) {
      if (mounted) setState(() => _message = err is ApiError ? err.message : '$err');
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleController>().t;
    final auth = context.watch<AuthController>();
    final status = _status;
    final prices = asJsonList(status?['prices']).map(_Price.new).toList();
    final yearly = prices.where((p) => p.interval == 'yearly').firstOrNull;
    final monthly = prices.where((p) => p.interval == 'monthly').firstOrNull;
    final saving = yearly != null && monthly != null && monthly.amount > 0 ? ((1 - yearly.amount / (monthly.amount * 12)) * 100).round() : 0;

    Widget body;
    if (!auth.hasAccount) {
      body = Center(child: FgButton(label: t('plus.signIn'), radius: 12, fontWeight: FontWeight.w700, onPressed: auth.startSignUp));
    } else if (status == null) {
      body = const Center(child: CircularProgressIndicator());
    } else if (status['plan'] == 'plus') {
      final renewsAt = asString(status['renewsAt']);
      body = FgCard(
        padding: const EdgeInsets.all(20),
        borderColor: AppColors.limeLight.withValues(alpha: 0.3),
        child: Column(children: [
          Text(t('plus.youHave'), style: fg(size: 18, weight: FontWeight.w700)),
          if (renewsAt != null) ...[
            const SizedBox(height: 12),
            Text(
              '${t(asBool(status['cancelAtPeriodEnd']) ? 'plus.ends' : 'plus.renews', {'date': formatDate(renewsAt)})}${status['subscriptionStatus'] == 'past_due' ? ' · ${t('plus.pastDue')}' : ''}',
              textAlign: TextAlign.center,
              style: fg(size: 14, color: AppColors.white70),
            ),
          ],
          const SizedBox(height: 12),
          FgButton(
            label: _busy == 'portal' ? t('plus.opening') : t('plus.manage'),
            style: FgButtonStyle.ghost,
            radius: 12,
            fontSize: 14,
            fontWeight: FontWeight.w700,
            onPressed: _busy != null ? null : () => _go('portal', '/billing/portal'),
          ),
        ]),
      );
    } else if (!asBool(status['enabled'])) {
      body = Text(t('plus.unavailable'), textAlign: TextAlign.center, style: fg(size: 16, color: AppColors.white70));
    } else {
      // Side by side where there's room (`sm:grid-cols-2`).
      body = FgGrid(
        columns: 1,
        sm: 2,
        children: [
          for (final p in [monthly, yearly].whereType<_Price>())
            FgCard(
              padding: const EdgeInsets.all(20),
              borderColor: p.interval == 'yearly' ? AppColors.limeLight.withValues(alpha: 0.4) : null,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text(t(p.interval == 'yearly' ? 'plus.yearly' : 'plus.monthly').toUpperCase(), style: fgLabel()),
                const SizedBox(height: 4),
                Text.rich(TextSpan(children: [
                  TextSpan(text: p.money, style: fg(size: 30, weight: FontWeight.w800)),
                  TextSpan(text: ' / ${t(p.interval == 'yearly' ? 'plus.perYear' : 'plus.perMonth')}', style: fg(size: 14, weight: FontWeight.w600, color: AppColors.white70)),
                ])),
                if (p.interval == 'yearly' && saving > 0) ...[
                  const SizedBox(height: 4),
                  Text(t('plus.save', {'percent': saving}), style: fg(size: 12, weight: FontWeight.w700, color: AppColors.limeLight)),
                ],
                const SizedBox(height: 16),
                FgButton(
                  label: _busy == p.interval ? t('plus.openingCheckout') : t('plus.get'),
                  expand: true,
                  radius: 12,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  onPressed: _busy != null ? null : () => _go(p.interval, '/billing/checkout', {'interval': p.interval}),
                ),
              ]),
            ),
        ],
      );
    }

    return SitePage(
      active: '/plus',
      // One centred column on a tablet (`max-w-3xl`).
      maxWidth: 768,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: spaced([
          Column(children: [
            Pill('FitGuide PLUS', color: AppColors.amber300, background: AppColors.amber400.withValues(alpha: 0.15), icon: LucideIcons.crown, size: 12, weight: FontWeight.w800),
            const SizedBox(height: 12),
            Semantics(header: true, child: Text(t('plus.title'), textAlign: TextAlign.center, style: fg(size: atLeast(context, Breakpoints.md) ? 48 : 36, weight: FontWeight.w800))),
            const SizedBox(height: 12),
            Text(t('plus.cancelAnytime'), textAlign: TextAlign.center, style: fg(size: 16, color: AppColors.white70)),
          ]),
          FgCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: spaced([
                for (final f in ['plus.feature.content', 'plus.feature.coach', 'plus.feature.support'])
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Icon(LucideIcons.check, size: 20, color: AppColors.limeLight),
                    const SizedBox(width: 12),
                    Expanded(child: Text(t(f), style: fg(size: 16))),
                  ]),
              ], 12),
            ),
          ),
          if (_message != null) StatusBox(_message!, center: true),
          body,
          if (_awaitingCheckout)
            Center(child: LinkText(t('plus.refresh'), weight: FontWeight.w700, onTap: () => _load(afterCheckout: true))),
          Text(t('plus.stripe'), textAlign: TextAlign.center, style: fg(size: 12, color: AppColors.white70)),
        ], 24),
      ),
    );
  }
}
