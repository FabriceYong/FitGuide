import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../navigation.dart';
import '../../services/health_service.dart';
import '../../state/auth_controller.dart';
import '../../widgets/charts.dart';
import '../../widgets/forms.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';

String _hours(int? minutes) => minutes == null ? '—' : '${minutes ~/ 60}h ${(minutes % 60).toString().padLeft(2, '0')}m';
String _fmt(int? n) => n == null ? '—' : thousands(n);

/// Steps, sleep and resting heart rate, with wearable connections and
/// imports (features/progress/HealthPanel.tsx).
class HealthPanel extends StatefulWidget {
  const HealthPanel({super.key});

  @override
  State<HealthPanel> createState() => _HealthPanelState();
}

class _HealthPanelState extends State<HealthPanel> with WidgetsBindingObserver {
  HealthSummary? _health;
  List<Integration> _services = [];
  String? _busy;
  String? _message;
  String? _loadedFor;
  final _steps = TextEditingController();
  final _sleep = TextEditingController();
  final _restingHr = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    for (final c in [_steps, _sleep, _restingHr]) {
      c.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _steps.dispose();
    _sleep.dispose();
    _restingHr.dispose();
    super.dispose();
  }

  /// Back from a provider's sign-in page in the browser: show the new state.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _loadedFor != null) _refresh();
  }

  Future<void> _refresh() async {
    try {
      final results = await Future.wait([fetchHealth(), fetchIntegrations()]);
      if (!mounted) return;
      setState(() {
        _health = results[0] as HealthSummary;
        _services = results[1] as List<Integration>;
      });
    } catch (err) {
      if (mounted) setState(() => _message = '$err');
    }
  }

  Future<void> _run(String key, Future<void> Function() task, [String? done]) async {
    setState(() {
      _busy = key;
      _message = null;
    });
    try {
      await task();
      if (done != null && mounted) setState(() => _message = done);
      await _refresh();
    } catch (err) {
      if (mounted) setState(() => _message = '$err');
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  void _saveToday() {
    final values = <String, dynamic>{
      if (_steps.text.isNotEmpty) 'steps': int.tryParse(_steps.text),
      if (_sleep.text.isNotEmpty) 'sleepMinutes': ((double.tryParse(_sleep.text) ?? 0) * 60).round(),
      if (_restingHr.text.isNotEmpty) 'restingHr': int.tryParse(_restingHr.text),
    };
    _run('save', () => saveHealthDay(localToday(), values), "Saved today's numbers.").then((_) {
      _steps.clear();
      _sleep.clear();
      _restingHr.clear();
    });
  }

  Future<void> _importFile() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['csv'], withData: true);
    final bytes = result?.files.single.bytes;
    if (bytes == null) return;
    final csv = utf8.decode(bytes, allowMalformed: true);
    await _run('import', () async {
      final r = await importHealthCsv(csv);
      if (mounted) {
        setState(() => _message = 'Imported ${r.imported} day(s).${r.skipped > 0 ? ' Skipped ${r.skipped}: ${r.errors.take(3).join('; ')}' : ''}');
      }
    });
  }

  Future<void> _disconnect(Integration s) async {
    final ok = await confirmDialog(context, title: 'Disconnect ${s.name}?', message: 'Disconnect ${s.name}? Data already imported stays.', confirmText: 'Disconnect', danger: true);
    if (ok) _run('off-${s.id}', () => disconnectIntegration(s.id));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final id = auth.hasAccount ? auth.user!.id : null;
    if (id != _loadedFor) {
      _loadedFor = id;
      _health = null;
      if (id != null) _refresh();
    }
    if (id == null) return const SizedBox.shrink();
    final health = _health;
    if (health == null) return const LoadingRow('Loading health data…', padding: EdgeInsets.zero);

    final tiles = [
      (LucideIcons.footprints, 'Steps today', _fmt(health.today?.steps), '7-day average ${_fmt(health.weekSteps)}'),
      (LucideIcons.moon, 'Sleep last night', _hours(health.today?.sleepMinutes), '7-day average ${_hours(health.weekSleepMinutes)}'),
      (
        LucideIcons.heartPulse,
        'Resting heart rate',
        health.latestRestingHr != null ? '${health.latestRestingHr!.value} bpm' : '—',
        health.latestRestingHr != null ? 'on ${health.latestRestingHr!.date}' : 'No reading yet',
      ),
    ];
    final busy = _busy != null;
    final canSave = _steps.text.isNotEmpty || _sleep.text.isNotEmpty || _restingHr.text.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: spaced([
        const PageTitle('Health data', size: 24),
        if (_message != null) StatusBox(_message!),
        FgGrid(columns: 1, sm: 3, children: [
          for (final (icon, label, value, sub) in tiles)
            FgCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Icon(icon, size: 16, color: AppColors.limeLight),
                    const SizedBox(width: 8),
                    Flexible(child: Text(label.toUpperCase(), style: fgLabel())),
                  ]),
                  const SizedBox(height: 8),
                  Text(value, style: fg(size: 30, weight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(sub, style: fg(size: 12, color: AppColors.white70)),
                ],
              ),
            ),
        ]),
        if (health.days.any((d) => d.steps != null))
          FgCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Steps, last 30 days', style: fg(size: 14, weight: FontWeight.w700)),
                const SizedBox(height: 12),
                DayBarChart(
                  labels: [for (final d in health.days) d.date.length >= 10 ? d.date.substring(8) : d.date],
                  values: [for (final d in health.days) d.steps],
                  label: 'Steps per day for the last 30 days',
                ),
              ],
            ),
          ),
        ...pairs(
          context,
          FgCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Connected services', style: fg(size: 16, weight: FontWeight.w700)),
                const SizedBox(height: 16),
                ...spaced([
                  for (final s in _services)
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(s.name, style: fg(size: 14, weight: FontWeight.w600)),
                            Text('${s.description}${s.connected && s.lastSyncAt != null ? ' · synced ${formatDateTime(s.lastSyncAt!)}' : ''}', style: fg(size: 12, color: AppColors.white70)),
                            if (s.lastError != null) Text(s.lastError!, style: fg(size: 12, color: AppColors.red300)),
                          ],
                        ),
                        if (!s.available)
                          Text('Not available on this server', style: fg(size: 12, color: AppColors.white70))
                        else if (s.connected)
                          Row(mainAxisSize: MainAxisSize.min, children: [
                            FgButton(
                              label: 'Sync',
                              icon: LucideIcons.refreshCw,
                              loading: _busy == 'sync-${s.id}',
                              style: FgButtonStyle.ghost,
                              height: 34,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              onPressed: busy ? null : () => _run('sync-${s.id}', () => syncIntegration(s.id), '${s.name} synced.'),
                            ),
                            const SizedBox(width: 8),
                            FgButton(
                              label: 'Disconnect',
                              icon: LucideIcons.unlink,
                              style: FgButtonStyle.ghost,
                              height: 34,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              onPressed: busy ? null : () => _disconnect(s),
                            ),
                          ])
                        else
                          FgButton(
                            label: 'Connect',
                            icon: LucideIcons.link2,
                            height: 34,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            // The provider's sign-in opens in the browser; the panel refreshes on return.
                            onPressed: busy ? null : () => _run('on-${s.id}', () async => openExternal(await connectIntegration(s.id))),
                          ),
                      ],
                    ),
                ], 12),
                const SizedBox(height: 16),
                Text(
                  'Apple Health and Google Fit don\'t offer a web connection. Export your data to CSV (columns: date, steps, resting_hr, sleep_hours, active_calories) and import it below.',
                  style: fg(size: 12, color: AppColors.white70),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: FgButton(
                    label: 'Import CSV',
                    icon: LucideIcons.upload,
                    loading: _busy == 'import',
                    style: FgButtonStyle.ghost,
                    height: 34,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    onPressed: busy ? null : _importFile,
                  ),
                ),
              ],
            ),
          ),
          FgCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Enter today\'s numbers', style: fg(size: 16, weight: FontWeight.w700)),
                const SizedBox(height: 12),
                Row(children: [
                  for (final (i, (label, controller, decimal)) in [('Steps', _steps, false), ('Sleep (hours)', _sleep, true), ('Resting HR', _restingHr, false)].indexed) ...[
                    if (i > 0) const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(label, style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
                        const SizedBox(height: 4),
                        NumberField(controller: controller, decimal: decimal, semanticLabel: label, border: AppColors.white30A(0.2)),
                      ]),
                    ),
                  ],
                ]),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: FgButton(
                    label: _busy == 'save' ? 'Saving…' : 'Save',
                    radius: 12,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    height: 40,
                    onPressed: busy || !canSave ? null : _saveToday,
                  ),
                ),
              ],
            ),
          ),
        ),
      ], 16),
    );
  }
}
