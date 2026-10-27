import 'package:flutter/widgets.dart';

/// The website's Tailwind breakpoints. Layouts switch on the screen's width,
/// as the site's `sm:` `md:` `lg:` classes do, so a tablet (or a phone turned
/// on its side) gets the site's wider layout.
abstract final class Breakpoints {
  static const double sm = 640;
  static const double md = 768;
  static const double lg = 1024;
}

/// Whether the screen is at least [breakpoint] wide.
bool atLeast(BuildContext context, double breakpoint) => MediaQuery.sizeOf(context).width >= breakpoint;

/// The value for this screen width: [base] on phones, otherwise the one for
/// the widest breakpoint given that the screen reaches (`sm: md: lg:`).
T responsive<T>(BuildContext context, T base, {T? sm, T? md, T? lg}) {
  final width = MediaQuery.sizeOf(context).width;
  if (lg != null && width >= Breakpoints.lg) return lg;
  if (md != null && width >= Breakpoints.md) return md;
  if (sm != null && width >= Breakpoints.sm) return sm;
  return base;
}

/// The side margin of pages: 16 on phones, wider on tablets.
double pageGutter(BuildContext context) => responsive(context, 16.0, md: 32.0, lg: 48.0);

/// Two panels side by side on a wide tablet (`lg:grid-cols-2`), otherwise
/// one under the other: spread into a [spaced] list.
List<Widget> pairs(BuildContext context, Widget a, Widget b) {
  if (!atLeast(context, Breakpoints.lg)) return [a, b];
  return [
    Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [Expanded(child: a), const SizedBox(width: 24), Expanded(child: b)],
    ),
  ];
}

/// The main content with a [width]-wide side column beside it on a wide
/// tablet (`lg:grid-cols-[minmax(0,1fr)_380px]`); on narrower screens the
/// side column's sections follow the main ones. Spread into a list whose
/// items are [gap] apart.
List<Widget> withSidebar(BuildContext context, List<Widget> main, List<Widget> side, {double width = 380, double gap = 16}) {
  if (!atLeast(context, Breakpoints.lg)) return [...main, ...side];
  Widget column(List<Widget> children) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, child) in children.indexed) ...[if (i > 0) SizedBox(height: gap), child],
        ],
      );
  return [
    Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [Expanded(child: column(main)), const SizedBox(width: 32), SizedBox(width: width, child: column(side))],
    ),
  ];
}

/// Centres [child] and caps its width (`max-w-[N] mx-auto`).
class MaxWidth extends StatelessWidget {
  const MaxWidth(this.maxWidth, {super.key, required this.child});
  final double maxWidth;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(constraints: BoxConstraints(maxWidth: maxWidth), child: child),
    );
  }
}
