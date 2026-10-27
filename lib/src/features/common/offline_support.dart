import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/i18n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../services/training_service.dart';
import '../../state/auth_controller.dart';

/// Sends workouts finished offline once the connection is back, and shows
/// an offline banner (components/OfflineSupport.tsx).
class OfflineSupport extends StatefulWidget {
  const OfflineSupport({super.key, required this.child});
  final Widget child;

  @override
  State<OfflineSupport> createState() => _OfflineSupportState();
}

class _OfflineSupportState extends State<OfflineSupport> with WidgetsBindingObserver {
  StreamSubscription<List<ConnectivityResult>>? _sub;
  bool _offline = false;
  int _synced = 0;
  int _dropped = 0;
  String? _userId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final connectivity = Connectivity();
    connectivity.checkConnectivity().then(_update).catchError((_) {});
    _sub = connectivity.onConnectivityChanged.listen(_update, onError: (_) {});
  }

  void _update(List<ConnectivityResult> results) {
    final offline = results.isEmpty || results.every((r) => r == ConnectivityResult.none);
    if (!mounted) return;
    setState(() => _offline = offline);
    if (!offline) _flush();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _flush();
  }

  late final AuthController _auth = context.read<AuthController>()..addListener(_onAuth);

  void _onAuth() {
    final id = _auth.hasAccount ? _auth.user!.id : null;
    if (id != _userId) {
      _userId = id;
      _flush();
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _onAuth();
  }

  Future<void> _flush() async {
    final id = _userId;
    if (id == null || _offline || queuedSessionCount(id) == 0) return;
    try {
      final result = await flushQueuedSessions(id);
      if (!mounted) return;
      setState(() {
        if (result.sent > 0) _synced = result.sent;
        if (result.dropped > 0) _dropped = result.dropped;
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _auth.removeListener(_onAuth);
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleController>().t;
    final show = _offline || _synced > 0 || _dropped > 0;
    final text = _offline
        ? t('offline.banner')
        : [
            if (_synced > 0) _synced == 1 ? t('offline.synced.one') : t('offline.synced.other', {'count': _synced}),
            if (_dropped > 0) _dropped == 1 ? t('offline.dropped.one') : t('offline.dropped.other', {'count': _dropped}),
          ].join(' ');
    return Stack(
      children: [
        widget.child,
        if (show)
          Positioned(
            left: 16,
            right: 16,
            bottom: MediaQuery.of(context).padding.bottom + 80,
            child: Center(
              child: Semantics(
                liveRegion: true,
                child: Material(
                  color: AppColors.obsidianWave,
                  elevation: 8,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999), side: BorderSide(color: AppColors.white30A(0.2))),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(999),
                    onTap: _offline ? null : () => setState(() => _synced = _dropped = 0),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_offline) ...[const Icon(LucideIcons.wifiOff, size: 16, color: AppColors.amber300), const SizedBox(width: 8)],
                          Flexible(child: Text(_offline ? text : '$text ✕', style: fg(size: 14))),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
