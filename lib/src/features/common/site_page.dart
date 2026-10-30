import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/i18n.dart';
import '../../core/responsive.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../navigation.dart';
import '../../state/auth_controller.dart';
import '../community/community_screen.dart';
import '../nutrition/nutrition_screen.dart';
import '../plan/plan_screen.dart';
import '../plus/plus_screen.dart';
import '../workout/workouts_catalog_screen.dart';
import 'admin_button.dart';
import 'brand.dart';

/// The layout of the website's standalone pages (/plan, /nutrition, …):
/// the site header with the logo and the main navigation, then the page.
class SitePage extends StatelessWidget {
  const SitePage({super.key, required this.active, required this.child, this.scrollable = true, this.maxWidth = 1400});

  /// The website path of this page, highlighted in the navigation.
  final String active;
  final Widget child;
  final bool scrollable;

  /// The widest the content gets on a tablet (`max-w-[1400px]`).
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    final gutter = responsive(context, 16.0, md: 32.0);
    final padding = EdgeInsets.fromLTRB(gutter, responsive(context, 24.0, md: 40.0), gutter, 32);
    final content = MaxWidth(maxWidth, child: child);
    final body = scrollable ? SingleChildScrollView(padding: padding, child: content) : Padding(padding: padding, child: content);
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            SiteHeader(active: active),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }
}

class SiteHeader extends StatelessWidget {
  const SiteHeader({super.key, required this.active});
  final String active;

  static const _links = [
    ('/workouts', 'nav.workouts'),
    ('/programs', 'nav.programs'),
    ('/plan', 'nav.plan'),
    ('/nutrition', 'nav.nutrition'),
    ('/community', 'nav.community'),
    ('/progress', 'nav.progress'),
    ('/plus', 'nav.plus'),
  ];

  void _go(BuildContext context, String href) {
    if (href == active) return;
    final navigator = Navigator.of(context);
    final Widget? page = switch (href) {
      '/workouts' => const WorkoutsCatalogScreen(),
      '/plan' => const PlanScreen(),
      '/nutrition' => const NutritionScreen(),
      '/community' => const CommunityScreen(),
      '/plus' => const PlusScreen(),
      _ => null,
    };
    // Moving between standalone pages replaces this one, like following a link.
    if (page != null) {
      navigator.pushReplacement(pageRoute(page));
    } else {
      openHref(context, href);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleController>();
    final user = context.watch<AuthController>().user;
    final links = [
      for (final (href, key) in _links) (href, locale.t(key)),
      if (user?.isCreator ?? false) ('/studio', locale.t('nav.studio')),
    ];
    final canPop = Navigator.of(context).canPop();
    // On a tablet the links sit in the header row, as on the website; on a
    // phone they get a scrolling row of their own.
    final wide = atLeast(context, Breakpoints.md);
    final linkWidgets = [for (final (href, label) in links) NavLink(label: label, active: href == active, onTap: () => _go(context, href))];
    Widget nav(Widget list) => Semantics(label: locale.t('nav.label'), container: true, child: list);
    return Container(
      decoration: BoxDecoration(
        color: AppColors.noirEclipse.withValues(alpha: 0.9),
        border: Border(bottom: BorderSide(color: AppColors.white30A(0.1))),
      ),
      child: Column(
        children: [
          SizedBox(
            height: wide ? 64 : 56,
            child: Padding(
              padding: EdgeInsets.only(left: canPop ? (wide ? 20 : 4) : (wide ? 32 : 16), right: wide ? 32 : 12),
              child: MaxWidth(
                1400,
                child: Row(
                  children: [
                    if (canPop)
                      IconButton(
                        tooltip: 'Back',
                        onPressed: () => Navigator.of(context).maybePop(),
                        icon: const Icon(LucideIcons.chevronLeft, size: 22),
                      ),
                    Semantics(
                      button: true,
                      label: 'FitGuide home',
                      child: InkWell(onTap: () => toDashboard(context), child: const ExcludeSemantics(child: BrandMark())),
                    ),
                    if (wide) ...[
                      const SizedBox(width: 16),
                      // Right-aligned, scrolling sideways if they don't all fit.
                      Expanded(
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: nav(SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: linkWidgets))),
                        ),
                      ),
                      const SizedBox(width: 8),
                    ] else
                      const Spacer(),
                    const LanguageSwitcher(),
                    const SizedBox(width: 8),
                    const AdminButton(),
                  ],
                ),
              ),
            ),
          ),
          if (!wide)
            SizedBox(
              height: 44,
              child: nav(ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.fromLTRB(12, 0, 12, 10), children: linkWidgets)),
            ),
        ],
      ),
    );
  }
}

/// A header nav link (`navLinkClass`).
class NavLink extends StatelessWidget {
  const NavLink({super.key, required this.label, required this.active, required this.onTap});
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: Semantics(
        button: true,
        selected: active,
        child: Material(
          color: active ? AppColors.limeLight : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Text(
                label.toUpperCase(),
                style: fg(size: 12, weight: FontWeight.w700, color: active ? AppColors.noirEclipse : AppColors.white70, letterSpacing: 0.6),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
