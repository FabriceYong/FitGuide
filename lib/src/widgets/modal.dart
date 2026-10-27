import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import 'ui.dart';

/// The website's Modal: a title, a round close button and the content. A
/// `sheet` docks to the bottom on phones; otherwise (and on tablets) it's a
/// centred dialog.
Future<T?> showFgModal<T>(
  BuildContext context, {
  required String title,
  required WidgetBuilder builder,
  bool sheet = false,
  double maxWidth = 512,
}) {
  Widget frame(BuildContext context, {required bool scroll}) {
    final body = Padding(padding: const EdgeInsets.fromLTRB(20, 12, 20, 20), child: builder(context));
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 12, 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: Semantics(header: true, child: Text(title, style: fg(size: 18, weight: FontWeight.w800)))),
              const SizedBox(width: 16),
              TapPadding(
                child: Semantics(
                  button: true,
                  label: 'Close',
                  child: InkWell(
                    onTap: () => Navigator.of(context).pop(),
                    customBorder: const CircleBorder(),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.whiteA(0.05)),
                      child: const Icon(LucideIcons.x, size: 16, color: AppColors.white70),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        Flexible(child: scroll ? SingleChildScrollView(child: body) : body),
      ],
    );
  }

  if (sheet && !atLeast(context, Breakpoints.sm)) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: AppColors.obsidianWave,
      barrierColor: AppColors.noirEclipse.withValues(alpha: 0.8),
      constraints: BoxConstraints(maxWidth: maxWidth * 1.4, maxHeight: MediaQuery.of(context).size.height * 0.9),
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        side: BorderSide(color: AppColors.white30A(0.2)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: frame(context, scroll: true),
      ),
    );
  }
  return showDialog<T>(
    context: context,
    barrierColor: AppColors.noirEclipse.withValues(alpha: 0.8),
    builder: (context) => Dialog(
      backgroundColor: AppColors.obsidianWave,
      insetPadding: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24), side: BorderSide(color: AppColors.white30A(0.2))),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth, maxHeight: MediaQuery.of(context).size.height * 0.9),
        child: frame(context, scroll: true),
      ),
    ),
  );
}

/// Ask before doing something (ConfirmDialog). Resolves true when confirmed.
Future<bool> confirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  String confirmText = 'Confirm',
  String cancelText = 'Cancel',
  bool danger = false,
  IconData? icon,
}) async {
  final result = await showFgModal<bool>(
    context,
    title: title,
    maxWidth: 448,
    builder: (context) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (icon != null) ...[
          Center(child: Icon(icon, size: 32, color: danger ? AppColors.red300 : AppColors.limeLight)),
          const SizedBox(height: 16),
        ],
        Text(message, style: fg(size: 16, color: AppColors.white70, height: 1.6)),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _DialogButton(
                label: cancelText,
                background: AppColors.whiteA(0.1),
                border: AppColors.white30A(0.2),
                textColor: AppColors.white,
                onTap: () => Navigator.of(context).pop(false),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _DialogButton(
                label: confirmText,
                background: danger ? AppColors.red500 : AppColors.limeLight,
                textColor: danger ? AppColors.white : AppColors.noirEclipse,
                onTap: () => Navigator.of(context).pop(true),
              ),
            ),
          ],
        ),
      ],
    ),
  );
  return result ?? false;
}

class _DialogButton extends StatelessWidget {
  const _DialogButton({required this.label, required this.background, required this.textColor, required this.onTap, this.border});
  final String label;
  final Color background;
  final Color textColor;
  final Color? border;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: background,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: border == null ? BorderSide.none : BorderSide(color: border!)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
          child: FittedBox(fit: BoxFit.scaleDown, child: Text(label, maxLines: 1, softWrap: false, style: fg(size: 16, weight: FontWeight.w700, color: textColor))),
        ),
      ),
    );
  }
}
