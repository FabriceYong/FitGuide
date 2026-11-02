import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import 'core/config.dart';
import 'features/coaches/coach_screen.dart';
import 'features/dashboard/article_screen.dart';
import 'features/community/community_screen.dart';
import 'features/community/crew_screen.dart';
import 'features/gyms/gym_screen.dart';
import 'features/nutrition/nutrition_screen.dart';
import 'features/plan/plan_screen.dart';
import 'features/plus/plus_screen.dart';
import 'features/programs/program_detail_screen.dart';
import 'features/workout/player_screen.dart';
import 'features/workout/workout_details_screen.dart';
import 'features/workout/workouts_catalog_screen.dart';
import 'models/training.dart';
import 'state/auth_controller.dart';
import 'state/dashboard_controller.dart';

final navigatorKey = GlobalKey<NavigatorState>();

/// A scheduled program day the player should count the session toward
/// (the website's ?enrollment=&week=&day=&program= on /workouts/[slug]/play).
class ProgramContext {
  const ProgramContext({required this.enrollmentId, required this.week, required this.day, this.programSlug});

  factory ProgramContext.of(Plan enrollment, PlanDay day) =>
      ProgramContext(enrollmentId: enrollment.id, week: day.week, day: day.day, programSlug: enrollment.programSlug);

  final String enrollmentId;
  final int week;
  final int day;
  final String? programSlug;
}

Route<T> pageRoute<T>(Widget page) => MaterialPageRoute<T>(builder: (_) => page);

/// Back to the dashboard (the website's "/"), optionally on a tab.
void toDashboard(BuildContext context, [DashboardTab? tab]) {
  Navigator.of(context).popUntil((route) => route.isFirst);
  if (tab != null) context.read<DashboardController>().setTab(tab);
}

void openWorkout(BuildContext context, String slug) => Navigator.of(context).push(pageRoute(WorkoutDetailsScreen(slug: slug)));

void openProgram(BuildContext context, String slug) => Navigator.of(context).push(pageRoute(ProgramDetailScreen(slug: slug)));

void openCoach(BuildContext context, String id) => Navigator.of(context).push(pageRoute(CoachScreen(id: id)));

/// Open the guided player for a workout, for a program day when [program] is set.
void openPlayer(BuildContext context, String slug, {ProgramContext? program}) =>
    Navigator.of(context).push(pageRoute(PlayerScreen(slug: slug, program: program)));

/// Pages that only exist on the website (coach studio, admin).
Future<void> openWebPage(String path) => launchUrl(Uri.parse('${AppConfig.webBase}$path'), mode: LaunchMode.externalApplication);

Future<void> openExternal(String url) => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);

/// Another site's page in a browser sheet inside the app (Safari View
/// Controller / Chrome Custom Tabs), closed with Done to come back. Falls
/// back to the browser where there's no in-app browser (desktop).
Future<void> openInApp(String url) async {
  final uri = Uri.parse(url);
  try {
    if (await launchUrl(uri, mode: LaunchMode.inAppBrowserView)) return;
  } catch (_) {}
  await openExternal(url);
}

void openArticle(BuildContext context, String slug) => Navigator.of(context).push(pageRoute(ArticleScreen.bySlug(slug)));

/// Follow one of the website's links inside the app.
void openHref(BuildContext context, String href) {
  final uri = Uri.parse(href);
  final path = uri.path;
  final navigator = Navigator.of(context);
  void push(Widget page) => navigator.push(pageRoute(page));

  if (uri.queryParameters.containsKey('signup')) {
    context.read<AuthController>().startSignUp();
    return;
  }
  if (path == '/' || path.isEmpty) {
    final tab = DashboardTab.values.where((t) => t.name == uri.queryParameters['tab']).firstOrNull;
    toDashboard(context, tab ?? DashboardTab.home);
    return;
  }
  if (path == '/workouts') {
    if (uri.fragment.isNotEmpty) {
      final category = uri.fragment.split('-').map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}').join(' ');
      navigator.popUntil((route) => route.isFirst);
      context.read<DashboardController>().explore(category: category);
    } else {
      push(const WorkoutsCatalogScreen());
    }
    return;
  }
  if (path.startsWith('/workouts/')) {
    final parts = path.split('/');
    final slug = parts[2];
    if (parts.length > 3 && parts[3] == 'play') {
      openPlayer(context, slug);
    } else {
      openWorkout(context, slug);
    }
    return;
  }
  if (path == '/programs') return toDashboard(context, DashboardTab.programs);
  if (path.startsWith('/programs/')) return openProgram(context, path.split('/')[2]);
  if (path.startsWith('/coaches/')) return openCoach(context, path.split('/')[2]);
  if (path.startsWith('/articles/')) return openArticle(context, path.split('/')[2]);
  if (path.startsWith('/community/crews/')) return push(CrewScreen(id: path.split('/')[3]));
  if (path == '/progress') return toDashboard(context, DashboardTab.progress);
  switch (path) {
    case '/plan':
      return push(const PlanScreen());
    case '/nutrition':
      return push(const NutritionScreen());
    case '/gyms':
      return push(const GymScreen());
    case '/community':
      return push(const CommunityScreen());
    case '/plus':
      return push(const PlusScreen());
    case '/studio':
    case '/admin':
      openWebPage(path);
      return;
  }
  openWebPage(href);
}
