import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/i18n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../navigation.dart';
import '../../state/auth_controller.dart';

/// Shortcut to the admin dashboard (on the website), shown next to the
/// profile for admins only (components/AdminButton.tsx).
class AdminButton extends StatelessWidget {
  const AdminButton({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;
    if (!(user?.isAdmin ?? false)) return const SizedBox.shrink();
    final label = context.watch<LocaleController>().t('nav.admin');
    return Semantics(
      button: true,
      label: label,
      child: Material(
        color: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: AppColors.limeLight.withValues(alpha: 0.4))),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => openWebPage('/admin'),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: ExcludeSemantics(
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(LucideIcons.shieldCheck, size: 16, color: AppColors.limeLight),
                const SizedBox(width: 6),
                Text(label.toUpperCase(), style: fg(size: 12, weight: FontWeight.w700, color: AppColors.limeLight, letterSpacing: 0.6)),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
