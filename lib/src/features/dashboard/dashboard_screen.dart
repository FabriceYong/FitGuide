import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/i18n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../navigation.dart';
import '../../state/auth_controller.dart';
import '../../state/dashboard_controller.dart';
import '../../state/workouts_controller.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';
import '../common/admin_button.dart';
import '../common/brand.dart';
import '../common/site_page.dart';
import '../profile/profile_tab.dart';
import '../programs/programs_tab.dart';
import '../progress/health_panel.dart';
import '../progress/progress_view.dart';
import '../progress/weekly_checkin.dart';
import 'calculators_tab.dart';
import 'explore_tab.dart';
import 'favorites_tab.dart';
import 'home_tab.dart';
import 'reviews_tab.dart';

class _TabItem {
  const _TabItem(this.tab, this.label, this.icon, {this.mobileBar = false});
  final DashboardTab tab;
  final String label;
  final IconData icon;
  final bool mobileBar;
}

const _tabs = [
  _TabItem(DashboardTab.home, 'Home', LucideIcons.house, mobileBar: true),
  _TabItem(DashboardTab.explore, 'Explore', LucideIcons.compass, mobileBar: true),
  _TabItem(DashboardTab.programs, 'Programs', LucideIcons.bookOpen, mobileBar: true),
  _TabItem(DashboardTab.favorites, 'Favorites', LucideIcons.heart),
  _TabItem(DashboardTab.progress, 'Progress', LucideIcons.chartColumn, mobileBar: true),
  _TabItem(DashboardTab.reviews, 'Reviews', LucideIcons.star),
  _TabItem(DashboardTab.tools, 'Calculators', LucideIcons.calculator),
  _TabItem(DashboardTab.profile, 'Profile', LucideIcons.user, mobileBar: true),
];

// Pages outside the dashboard (the dashboard's own tabs cover workouts, programs and progress).
const _siteLinks = [('/plan', 'nav.plan'), ('/nutrition', 'nav.nutrition'), ('/community', 'nav.community'), ('/plus', 'nav.plus')];

/// The signed-in home: a tabbed dashboard linked to the rest of FitGuide
/// (components/Dashboard.tsx, in its phone layout).
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  // Tabs are built the first time they're opened, then kept (with their scroll position).
  final _visited = <DashboardTab>{DashboardTab.home};

  @override
  void initState() {
    super.initState();
    final workouts = context.read<WorkoutsController>();
    if (workouts.workouts.isEmpty) workouts.load();
  }

  Future<void> _confirmLogout() async {
    final auth = context.read<AuthController>();
    final guest = auth.isGuest;
    final ok = await confirmDialog(
      context,
      title: guest ? 'Leave guest mode?' : 'Sign out?',
      message: guest
          ? 'Your guest profile is only saved on this device and will be cleared.'
          : 'You’ll need to sign in again to see your plan, progress and favorites.',
      confirmText: guest ? 'Leave' : 'Sign out',
      danger: true,
      icon: LucideIcons.logOut,
    );
    if (ok) auth.logout();
  }

  void _openMenu() {
    final dashboard = context.read<DashboardController>();
    showFgModal<void>(
      context,
      title: 'Menu',
      sheet: true,
      builder: (sheetContext) => _Menu(
        current: dashboard.tab,
        onTab: (tab) {
          Navigator.of(sheetContext).pop();
          dashboard.setTab(tab);
        },
        onLink: (href) {
          Navigator.of(sheetContext).pop();
          openHref(context, href);
        },
        onLogout: () {
          Navigator.of(sheetContext).pop();
          _confirmLogout();
        },
      ),
    );
  }

  Widget _content(DashboardTab tab) {
    switch (tab) {
      case DashboardTab.home:
        return const HomeTab();
      case DashboardTab.explore:
        return const ExploreTab();
      case DashboardTab.programs:
        return const ProgramsTab();
      case DashboardTab.favorites:
        return const FavoritesTab();
      case DashboardTab.progress:
        return const Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [ProgressView(), WeeklyCheckinCard(), SizedBox(height: 32), HealthPanel()]);
      case DashboardTab.reviews:
        return const ReviewsTab();
      case DashboardTab.tools:
        return const CalculatorsTab();
      case DashboardTab.profile:
        return ProfileTab(onLogout: _confirmLogout);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tab = context.watch<DashboardController>().tab;
    _visited.add(tab);
    // System back from another tab returns to Home before leaving the app.
    return PopScope(
      canPop: tab == DashboardTab.home,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) context.read<DashboardController>().setTab(DashboardTab.home);
      },
      child: _scaffold(tab),
    );
  }

  Widget _scaffold(DashboardTab tab) {
    // From tablet width the site's header shows every link and the tabs sit
    // under it, so there's no bottom bar or menu (Dashboard.tsx, `md:`).
    final wide = atLeast(context, Breakpoints.md);
    // A phone on its side is wide but short: the logo, tabs and menu share
    // one bar, leaving the height for the page.
    final short = MediaQuery.sizeOf(context).height < 500;
    final onTab = context.read<DashboardController>().setTab;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            if (wide && short)
              _TabNav(current: tab, onTab: onTab, leading: const _HomeButton(), trailing: _MenuButton(onMenu: _openMenu))
            else if (wide) ...[
              _WideHeader(onLogout: _confirmLogout),
              _TabNav(current: tab, onTab: onTab),
            ] else
              _Header(onMenu: _openMenu),
            const _CatalogBanner(),
            Expanded(
              child: IndexedStack(
                sizing: StackFit.expand,
                index: DashboardTab.values.indexOf(tab),
                children: [
                  for (final t in DashboardTab.values)
                    _visited.contains(t) ? _TabScroll(home: t == DashboardTab.home, child: _content(t)) : const SizedBox.shrink(),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: wide ? null : _BottomBar(current: tab, onTab: onTab),
    );
  }
}

/// One tab's scrolling page: padded content, then the photo credit.
class _TabScroll extends StatelessWidget {
  const _TabScroll({required this.child, this.home = false});
  final Widget child;
  final bool home;

  @override
  Widget build(BuildContext context) {
    final gutter = pageGutter(context);
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // The home tab's hero runs edge to edge, so it pads itself.
          if (home)
            child
          else
            Padding(
              padding: EdgeInsets.fromLTRB(gutter, responsive(context, 24.0, md: 40.0), gutter, 32),
              child: MaxWidth(1600, child: child),
            ),
          ImageAttribution(onUnsplash: () => openExternal('https://unsplash.com')),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onMenu});
  final VoidCallback onMenu;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.noirEclipse.withValues(alpha: 0.9),
        border: Border(bottom: BorderSide(color: AppColors.white30A(0.1))),
      ),
      child: Row(children: [const _HomeButton(), const Spacer(), _MenuButton(onMenu: onMenu)]),
    );
  }
}

/// The logo, with the PLUS badge for members; goes to the Home tab.
class _HomeButton extends StatelessWidget {
  const _HomeButton();

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;
    return TapPadding(
      child: Semantics(
        button: true,
        label: 'FitGuide home',
        child: InkWell(
          onTap: () => context.read<DashboardController>().setTab(DashboardTab.home),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const ExcludeSemantics(child: BrandMark()),
              if (user?.isPlus ?? false) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.amber400.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(4)),
                  child: Text('PLUS', style: fg(size: 10, weight: FontWeight.w700, color: AppColors.amber300, letterSpacing: 1.5)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuButton extends StatelessWidget {
  const _MenuButton({required this.onMenu});
  final VoidCallback onMenu;

  @override
  Widget build(BuildContext context) {
    return TapPadding(
      child: Semantics(
        button: true,
        label: 'Open menu',
        child: Material(
          color: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: AppColors.white30A(0.3))),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: onMenu,
            child: const SizedBox(width: 40, height: 40, child: Icon(LucideIcons.menu, size: 20)),
          ),
        ),
      ),
    );
  }
}

enum _AccountAction { profile, signOut }

/// The tablet header: logo, the site's links, language, admin and the profile
/// menu (profile, sign out).
class _WideHeader extends StatelessWidget {
  const _WideHeader({required this.onLogout});
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final t = context.watch<LocaleController>().t;
    final user = auth.user;
    final dashboard = context.read<DashboardController>();
    final full = atLeast(context, Breakpoints.lg);
    final links = [
      for (final (href, key) in _siteLinks) (href, t(key)),
      if (user?.isCreator ?? false) ('/studio', t('nav.studio')),
    ];
    final signOut = auth.isGuest ? 'Leave guest mode' : 'Sign out';
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      color: AppColors.noirEclipse.withValues(alpha: 0.9),
      child: Row(
        children: [
          Semantics(
            button: true,
            label: 'FitGuide home',
            child: InkWell(
              onTap: () => dashboard.setTab(DashboardTab.home),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const ExcludeSemantics(child: BrandMark()),
                  if (user?.isPlus ?? false) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: AppColors.amber400.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(4)),
                      child: Text('PLUS', style: fg(size: 10, weight: FontWeight.w700, color: AppColors.amber300, letterSpacing: 1.5)),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(width: 16),
          // Right-aligned, scrolling sideways if a narrow tablet can't fit them all.
          Expanded(
            child: Align(
              alignment: Alignment.centerRight,
              child: Semantics(
                label: t('nav.label'),
                container: true,
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(children: [for (final (href, label) in links) NavLink(label: label, active: false, onTap: () => openHref(context, href))]),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          const LanguageSwitcher(),
          const SizedBox(width: 8),
          const AdminButton(),
          const SizedBox(width: 8),
          // Profile and sign-out live in this menu (components/ProfileMenu.tsx).
          PopupMenuButton<_AccountAction>(
            tooltip: 'Your account',
            color: AppColors.obsidianWave,
            position: PopupMenuPosition.under,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: AppColors.white30A(0.15))),
            onSelected: (action) => switch (action) {
              _AccountAction.profile => dashboard.setTab(DashboardTab.profile),
              _AccountAction.signOut => onLogout(),
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: _AccountAction.profile,
                child: Row(children: [
                  const Icon(LucideIcons.user, size: 16, color: AppColors.white),
                  const SizedBox(width: 10),
                  Text('Your profile', style: fg(size: 14, weight: FontWeight.w600)),
                ]),
              ),
              const PopupMenuDivider(),
              PopupMenuItem(
                value: _AccountAction.signOut,
                child: Row(children: [
                  const Icon(LucideIcons.logOut, size: 16, color: AppColors.red300),
                  const SizedBox(width: 10),
                  Text(signOut, style: fg(size: 14, weight: FontWeight.w600, color: AppColors.red300)),
                ]),
              ),
            ],
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Name and email beside the photo on wide screens.
                  if (full) ...[
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 180),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(user?.name.isNotEmpty ?? false ? user!.name : 'Profile', maxLines: 1, overflow: TextOverflow.ellipsis, style: fg(size: 14, weight: FontWeight.w700)),
                          Text(auth.isGuest ? 'Guest' : (user?.email ?? ''), maxLines: 1, overflow: TextOverflow.ellipsis, style: fg(size: 11, color: AppColors.white70)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Avatar(url: user?.avatarUrl, size: 40, borderColor: AppColors.white30A(0.4)),
                  const SizedBox(width: 4),
                  const Icon(LucideIcons.chevronDown, size: 16, color: AppColors.white70),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The dashboard's tabs as a row under the tablet header.
class _TabNav extends StatelessWidget {
  const _TabNav({required this.current, required this.onTab, this.leading, this.trailing});
  final DashboardTab current;
  final ValueChanged<DashboardTab> onTab;

  /// With these, the row is the whole header (on a short screen).
  final Widget? leading;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final bar = leading != null || trailing != null;
    final tabs = Semantics(
      label: 'Dashboard',
      container: true,
      // Every tab is built (and reachable by screen readers), scrolling
      // sideways if a narrow tablet can't fit them all.
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: bar ? const EdgeInsets.symmetric(horizontal: 12) : const EdgeInsets.fromLTRB(32, 0, 32, 8),
        child: Row(children: [
          for (final item in _tabs)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Center(
                child: Semantics(
                  button: true,
                  selected: item.tab == current,
                  label: item.label,
                  excludeSemantics: true,
                  child: Material(
                    color: item.tab == current ? AppColors.limeLight : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () => onTab(item.tab),
                      child: Container(
                        height: 40,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(item.icon, size: 14, color: item.tab == current ? AppColors.noirEclipse : AppColors.white70),
                            const SizedBox(width: 6),
                            Text(
                              item.label.toUpperCase(),
                              maxLines: 1,
                              style: fg(size: 12, weight: FontWeight.w600, color: item.tab == current ? AppColors.noirEclipse : AppColors.white70, letterSpacing: 0.6),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ]),
      ),
      );
    return Container(
      height: 56,
      padding: bar ? const EdgeInsets.symmetric(horizontal: 16) : null,
      decoration: BoxDecoration(
        color: AppColors.noirEclipse.withValues(alpha: 0.9),
        border: Border(bottom: BorderSide(color: AppColors.white30A(0.1))),
      ),
      child: bar ? Row(children: [if (leading != null) leading!, Expanded(child: tabs), if (trailing != null) trailing!]) : tabs,
    );
  }
}

/// Shown when the catalog couldn't be loaded, or is the copy saved on the device.
class _CatalogBanner extends StatelessWidget {
  const _CatalogBanner();

  @override
  Widget build(BuildContext context) {
    final workouts = context.watch<WorkoutsController>();
    if (workouts.error == null && workouts.savedAt == null) return const SizedBox.shrink();
    final savedAt = workouts.savedAt;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: responsive(context, 16.0, md: 32.0), vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.amber500.withValues(alpha: 0.1),
          border: Border(bottom: BorderSide(color: AppColors.amber500.withValues(alpha: 0.3))),
        ),
        child: Row(
          children: [
            const Icon(LucideIcons.triangleAlert, size: 16, color: AppColors.amber200),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                savedAt != null
                    ? 'Can’t reach FitGuide right now. Showing the ${workouts.workouts.length} workouts saved on this device on ${formatShortDate(savedAt)}.'
                    : 'Workouts couldn’t be loaded: ${workouts.error}',
                style: fg(size: 14, color: AppColors.amber200),
              ),
            ),
            const SizedBox(width: 8),
            InkWell(
              onTap: workouts.reload,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(LucideIcons.refreshCw, size: 16),
                  const SizedBox(width: 6),
                  Text('Try again', style: fg(size: 14, weight: FontWeight.w700)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({required this.current, required this.onTab});
  final DashboardTab current;
  final ValueChanged<DashboardTab> onTab;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: AppColors.noirEclipse, border: Border(top: BorderSide(color: AppColors.white30A(0.1)))),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 60,
          child: Semantics(
            label: 'Dashboard',
            container: true,
            child: Row(
              children: [
                for (final item in _tabs.where((t) => t.mobileBar))
                  Expanded(
                    child: Semantics(
                      button: true,
                      selected: item.tab == current,
                      label: item.label,
                      excludeSemantics: true,
                      child: InkWell(
                        onTap: () => onTab(item.tab),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(item.icon, size: 22, color: item.tab == current ? AppColors.limeLight : AppColors.white70),
                            const SizedBox(height: 4),
                            // Labels grow with the system text size up to 150%,
                            // then shrink to fit: the bar has room for one line.
                            MediaQuery.withClampedTextScaling(
                              maxScaleFactor: 1.5,
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 3),
                                child: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    item.label.toUpperCase(),
                                    maxLines: 1,
                                    style: fg(size: 10, weight: FontWeight.w700, color: item.tab == current ? AppColors.white : AppColors.white70, letterSpacing: 0.5),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Menu extends StatelessWidget {
  const _Menu({required this.current, required this.onTab, required this.onLink, required this.onLogout});
  final DashboardTab current;
  final ValueChanged<DashboardTab> onTab;
  final ValueChanged<String> onLink;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final t = context.watch<LocaleController>().t;
    final user = auth.user;
    final links = [
      for (final (href, key) in _siteLinks) (href, t(key)),
      if (user?.isCreator ?? false) ('/studio', t('nav.studio')),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Avatar(url: user?.avatarUrl, size: 40, borderColor: AppColors.white30A(0.4)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(user?.name ?? '', style: fg(size: 16, weight: FontWeight.w700)),
                  Text(auth.isGuest ? 'Guest' : (user?.email ?? ''), style: fg(size: 12, color: AppColors.white70)),
                ],
              ),
            ),
            const AdminButton(),
          ],
        ),
        const SizedBox(height: 16),
        FgGrid(
          // One column with large system text, so labels aren't split mid-word.
          columns: largeText(context) ? 1 : 2,
          gap: 8,
          children: [
            for (final item in _tabs)
              Semantics(
                button: true,
                selected: item.tab == current,
                child: Material(
                  color: item.tab == current ? AppColors.limeLight : AppColors.whiteA(0.05),
                  borderRadius: BorderRadius.circular(12),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => onTab(item.tab),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      child: Row(
                        children: [
                          Icon(item.icon, size: 16, color: item.tab == current ? AppColors.noirEclipse : AppColors.white),
                          const SizedBox(width: 8),
                          Flexible(child: Text(item.label, style: fg(size: 14, weight: FontWeight.w700, color: item.tab == current ? AppColors.noirEclipse : AppColors.white))),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 4,
          runSpacing: 8,
          children: [for (final (href, label) in links) NavLink(label: label, active: false, onTap: () => onLink(href))],
        ),
        const SizedBox(height: 16),
        // Language left and sign-out right; sign-out wraps under it with large text.
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          runSpacing: 8,
          children: [
            const LanguageSwitcher(),
            InkWell(
              onTap: onLogout,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    const Icon(LucideIcons.logOut, size: 16, color: AppColors.red300),
                    const SizedBox(width: 8),
                    Text(auth.isGuest ? 'Leave guest mode' : 'Sign out', style: fg(size: 14, weight: FontWeight.w700, color: AppColors.red300)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
