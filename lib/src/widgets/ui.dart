import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/api/api_client.dart';
import '../core/responsive.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';

export '../core/responsive.dart';

/// Building blocks shared by every screen, matching the website's Tailwind
/// components (buttons, cards, pills, alerts, inputs …).

enum FgButtonStyle { primary, secondary, ghost, danger, dangerOutline, amber }

/// A button in one of the site's styles. Defaults to the 44px, 8px-radius
/// buttons of the sign-in pages (`primaryButton` in onboarding/ui.js).
class FgButton extends StatelessWidget {
  const FgButton({
    super.key,
    required this.label,
    this.onPressed,
    this.style = FgButtonStyle.primary,
    this.icon,
    this.trailingIcon,
    this.loading = false,
    this.expand = false,
    this.height = 44,
    this.radius = 8,
    this.fontSize = 15,
    this.fontWeight = FontWeight.w600,
    this.uppercase = false,
    this.padding = const EdgeInsets.symmetric(horizontal: 20),
    this.color,
    this.textColor,
  });

  final String label;
  final VoidCallback? onPressed;
  final FgButtonStyle style;
  final IconData? icon;
  final IconData? trailingIcon;
  final bool loading;
  final bool expand;
  final double height;
  final double radius;
  final double fontSize;
  final FontWeight fontWeight;
  final bool uppercase;
  final EdgeInsets padding;
  final Color? color;
  final Color? textColor;

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color fgColor, Color? border) = switch (style) {
      FgButtonStyle.primary => (color ?? AppColors.limeLight, textColor ?? AppColors.noirEclipse, null),
      FgButtonStyle.secondary => (Colors.transparent, textColor ?? AppColors.white, AppColors.white30A(0.4)),
      FgButtonStyle.ghost => (AppColors.whiteA(0.1), textColor ?? AppColors.white, null),
      FgButtonStyle.danger => (AppColors.red500, AppColors.white, null),
      FgButtonStyle.dangerOutline => (AppColors.obsidianWave, AppColors.red300, AppColors.red500.withValues(alpha: 0.4)),
      FgButtonStyle.amber => (AppColors.amber400, AppColors.noirEclipse, null),
    };
    final disabled = onPressed == null || loading;
    final text = uppercase ? label.toUpperCase() : label;
    final content = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading) ...[
          SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: fgColor)),
          const SizedBox(width: 8),
        ] else if (icon != null) ...[
          Icon(icon, size: 16, color: fgColor),
          const SizedBox(width: 8),
        ],
        // One line: a label too long for the button shrinks to fit rather than wrapping.
        Flexible(
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              text,
              maxLines: 1,
              softWrap: false,
              style: fg(size: fontSize, weight: fontWeight, color: fgColor, letterSpacing: uppercase ? fontSize * 0.05 : null),
            ),
          ),
        ),
        if (trailingIcon != null && !loading) ...[
          const SizedBox(width: 8),
          Icon(trailingIcon, size: 16, color: fgColor),
        ],
      ],
    );
    // Screen readers announce a greyed-out button as disabled.
    final button = Semantics(
      button: true,
      enabled: !disabled,
      child: Opacity(
        opacity: disabled && !loading && onPressed == null ? 0.6 : 1,
        child: Material(
          color: bg,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radius),
            side: border == null ? BorderSide.none : BorderSide(color: border),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: disabled ? null : onPressed,
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: height),
              child: Padding(padding: padding, child: Center(widthFactor: expand ? null : 1, child: content)),
            ),
          ),
        ),
      ),
    );
    return height < 48 ? TapPadding(child: button) : button;
  }
}

/// Pads a small control's touch area out to 48×48, the size Android and iOS
/// recommend, without changing how it looks: a touch in the padding goes to
/// the control, and screen readers report the padded size. Material does the
/// same for its own chips and buttons.
class TapPadding extends StatelessWidget {
  const TapPadding({super.key, required this.child, this.minSize = const Size(48, 48)});
  final Widget child;
  final Size minSize;

  @override
  Widget build(BuildContext context) => MergeSemantics(child: _TapPadding(minSize: minSize, child: child));
}

class _TapPadding extends SingleChildRenderObjectWidget {
  const _TapPadding({required this.minSize, required Widget super.child});
  final Size minSize;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderTapPadding(minSize);

  @override
  void updateRenderObject(BuildContext context, _RenderTapPadding renderObject) => renderObject.minSize = minSize;
}

class _RenderTapPadding extends RenderShiftedBox {
  _RenderTapPadding(this._minSize) : super(null);

  Size _minSize;
  set minSize(Size value) {
    if (value == _minSize) return;
    _minSize = value;
    markNeedsLayout();
  }

  Size _padded(BoxConstraints constraints, Size childSize) =>
      constraints.constrain(Size(math.max(childSize.width, _minSize.width), math.max(childSize.height, _minSize.height)));

  @override
  double computeMinIntrinsicWidth(double height) => math.max(child?.getMinIntrinsicWidth(height) ?? 0, _minSize.width);
  @override
  double computeMaxIntrinsicWidth(double height) => math.max(child?.getMaxIntrinsicWidth(height) ?? 0, _minSize.width);
  @override
  double computeMinIntrinsicHeight(double width) => math.max(child?.getMinIntrinsicHeight(width) ?? 0, _minSize.height);
  @override
  double computeMaxIntrinsicHeight(double width) => math.max(child?.getMaxIntrinsicHeight(width) ?? 0, _minSize.height);

  @override
  Size computeDryLayout(BoxConstraints constraints) =>
      child == null ? constraints.smallest : _padded(constraints, child!.getDryLayout(constraints));

  @override
  void performLayout() {
    final child = this.child;
    if (child == null) {
      size = constraints.smallest;
      return;
    }
    child.layout(constraints, parentUsesSize: true);
    size = _padded(constraints, child.size);
    (child.parentData! as BoxParentData).offset = Alignment.center.alongOffset(size - child.size as Offset);
  }

  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    if (super.hitTest(result, position: position)) return true;
    if (child == null || !size.contains(position)) return false;
    // A touch in the padding lands on the control's centre.
    final center = child!.size.center(Offset.zero);
    return result.addWithRawTransform(
      transform: MatrixUtils.forceToPoint(center),
      position: center,
      hitTest: (result, _) => child!.hitTest(result, position: center),
    );
  }
}

/// `text-lime-light font-semibold` text button. Its touch area is at least
/// 48px tall, the size Android and iOS recommend, around the text.
class LinkText extends StatelessWidget {
  const LinkText(this.label, {super.key, this.onTap, this.size = 14, this.color = AppColors.limeLight, this.weight = FontWeight.w600, this.underline = false});
  final String label;
  final VoidCallback? onTap;
  final double size;
  final Color color;
  final FontWeight weight;
  final bool underline;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
          child: Align(
            alignment: Alignment.centerLeft,
            widthFactor: 1,
            heightFactor: 1,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              // One line, shrunk to fit if the space is too narrow.
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(label, maxLines: 1, softWrap: false, style: fg(size: size, weight: weight, color: color, decoration: underline ? TextDecoration.underline : null)),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A rounded box with the site's card colours: `bg-obsidian-wave border border-white-30/10 rounded-2xl`.
class FgCard extends StatelessWidget {
  const FgCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = 16,
    this.color = AppColors.obsidianWave,
    this.borderColor,
    this.borderWidth = 1,
    this.gradient,
    this.onTap,
    this.margin,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color color;
  final Color? borderColor;
  final double borderWidth;
  final Gradient? gradient;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? margin;

  @override
  Widget build(BuildContext context) {
    final decoration = BoxDecoration(
      color: gradient == null ? color : null,
      gradient: gradient,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: borderColor ?? AppColors.white30A(0.1), width: borderWidth),
    );
    final body = Padding(padding: padding, child: child);
    return Container(
      margin: margin,
      decoration: decoration,
      clipBehavior: Clip.antiAlias,
      child: onTap == null
          ? body
          : Material(color: Colors.transparent, child: InkWell(onTap: onTap, child: body)),
    );
  }
}

/// A small rounded-full tag, like the site's category and level pills.
class Pill extends StatelessWidget {
  const Pill(
    this.text, {
    super.key,
    this.color = AppColors.limeLight,
    this.background,
    this.textColor,
    this.size = 10,
    this.uppercase = true,
    this.padding = const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    this.weight = FontWeight.w800,
    this.border,
    this.icon,
  });

  final String text;
  final Color color;
  final Color? background;
  final Color? textColor;
  final double size;
  final bool uppercase;
  final EdgeInsets padding;
  final FontWeight weight;
  final Color? border;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: background ?? color.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(999),
        border: border == null ? null : Border.all(color: border!),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: size + 3, color: textColor ?? color), const SizedBox(width: 4)],
          Flexible(
            child: Text(
              uppercase ? text.toUpperCase() : text,
              overflow: TextOverflow.ellipsis,
              style: fg(size: size, weight: weight, color: textColor ?? color, letterSpacing: uppercase ? size * 0.1 : null),
            ),
          ),
        ],
      ),
    );
  }
}

/// The red alert box (`role="alert"` on the site).
class ErrorBox extends StatelessWidget {
  const ErrorBox(this.message, {super.key, this.action, this.compact = false});
  final String message;
  final Widget? action;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: EdgeInsets.all(compact ? 12 : 14),
        decoration: BoxDecoration(
          color: AppColors.red500.withValues(alpha: 0.1),
          border: Border.all(color: AppColors.red500.withValues(alpha: 0.3)),
          borderRadius: BorderRadius.circular(compact ? 12 : 8),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(padding: EdgeInsets.only(top: 1), child: Icon(LucideIcons.circleAlert, size: 18, color: AppColors.red400)),
            const SizedBox(width: 10),
            Expanded(child: Text(message, style: fg(size: 14, color: AppColors.red300, height: 1.35))),
            if (action != null) ...[const SizedBox(width: 8), action!],
          ],
        ),
      ),
    );
  }
}

/// Inline red error text with an icon.
class ErrorLine extends StatelessWidget {
  const ErrorLine(this.message, {super.key, this.size = 14});
  final String message;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(padding: const EdgeInsets.only(top: 2), child: Icon(LucideIcons.circleAlert, size: size + 2, color: AppColors.red300)),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: fg(size: size, color: AppColors.red300))),
        ],
      ),
    );
  }
}

/// A neutral status message (`bg-white/5 border border-white-30/10 rounded-xl`).
class StatusBox extends StatelessWidget {
  const StatusBox(this.message, {super.key, this.center = false});
  final String message;
  final bool center;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.whiteA(0.05),
          border: Border.all(color: AppColors.white30A(0.1)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(message, textAlign: center ? TextAlign.center : TextAlign.start, style: fg(size: 14)),
      ),
    );
  }
}

/// A spinner with a message (`<Loader2 className="animate-spin" /> Loading…`).
class LoadingRow extends StatelessWidget {
  const LoadingRow(this.message, {super.key, this.padding = const EdgeInsets.symmetric(vertical: 24)});
  final String message;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Row(
        children: [
          const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white70)),
          const SizedBox(width: 10),
          Flexible(child: Text(message, style: fg(size: 14, color: AppColors.white70))),
        ],
      ),
    );
  }
}

/// A pulsing placeholder (`animate-pulse`).
class Skeleton extends StatefulWidget {
  const Skeleton({super.key, required this.height, this.radius = 16, this.width});
  final double height;
  final double radius;
  final double? width;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000))..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: FadeTransition(
        opacity: Tween(begin: 1.0, end: 0.5).animate(_controller),
        child: Container(
          height: widget.height,
          width: widget.width ?? double.infinity,
          decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(widget.radius)),
        ),
      ),
    );
  }
}

/// A network image that fills its box and fades in; a dark box on failure.
class NetImage extends StatelessWidget {
  const NetImage(this.url, {super.key, this.fit = BoxFit.cover, this.semanticLabel});
  final String? url;
  final BoxFit fit;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final src = url;
    if (src == null || src.isEmpty) return const ColoredBox(color: AppColors.obsidianWave);
    return Image.network(
      src,
      fit: fit,
      semanticLabel: semanticLabel,
      excludeFromSemantics: semanticLabel == null,
      width: double.infinity,
      height: double.infinity,
      frameBuilder: (context, child, frame, sync) => sync
          ? child
          : AnimatedOpacity(opacity: frame == null ? 0 : 1, duration: const Duration(milliseconds: 400), child: child),
      errorBuilder: (context, error, stack) => const ColoredBox(color: AppColors.obsidianWave),
    );
  }
}

/// A round avatar: the user's photo, or an icon / initial.
class Avatar extends StatelessWidget {
  const Avatar({super.key, this.url, this.size = 40, this.initial, this.borderColor, this.borderWidth = 2, this.background});
  final String? url;
  final double size;
  final String? initial;
  final Color? borderColor;
  final double borderWidth;
  final Color? background;

  @override
  Widget build(BuildContext context) {
    final src = assetUrl(url);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: background ?? AppColors.obsidianWave,
        border: borderColor == null ? null : Border.all(color: borderColor!, width: borderWidth),
      ),
      clipBehavior: Clip.antiAlias,
      child: src != null
          ? NetImage(src)
          : Center(
              child: initial != null
                  ? Text(initial!, style: fg(size: size * 0.32, weight: FontWeight.w800, color: AppColors.limeLight))
                  : Icon(LucideIcons.user, size: size * 0.45, color: AppColors.white70),
            ),
    );
  }
}

/// Five stars (`role="img" aria-label="4 out of 5 stars"`).
class Stars extends StatelessWidget {
  const Stars(this.rating, {super.key, this.size = 16, this.color = AppColors.amber300, this.emptyColor = AppColors.white70});
  final int rating;
  final double size;
  final Color color;
  final Color emptyColor;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$rating out of 5 stars',
      child: ExcludeSemantics(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < 5; i++)
              Padding(
                padding: const EdgeInsets.only(right: 2),
                child: Icon(i < rating ? Icons.star_rounded : Icons.star_border_rounded, size: size + 2, color: i < rating ? color : emptyColor),
              ),
          ],
        ),
      ),
    );
  }
}

/// A thin progress bar (`h-2 bg-white/10 rounded-full`).
class FgProgressBar extends StatelessWidget {
  const FgProgressBar({super.key, required this.percent, this.height = 8, this.color = AppColors.limeLight, this.label});
  final double percent;
  final double height;
  final Color color;
  final String? label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      value: '${percent.round()}%',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(999),
        child: Stack(
          children: [
            Container(height: height, color: AppColors.whiteA(0.1)),
            AnimatedFractionallySizedBox(
              duration: const Duration(milliseconds: 400),
              widthFactor: (percent / 100).clamp(0, 1),
              child: Container(height: height, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(999))),
            ),
          ],
        ),
      ),
    );
  }
}

/// A coloured square holding an icon (`w-10 h-10 rounded-lg` with `${color}22`).
class IconTile extends StatelessWidget {
  const IconTile(this.icon, {super.key, required this.color, this.size = 40, this.iconSize = 20, this.radius = 8, this.alpha = 0x22, this.borderAlpha});
  final IconData icon;
  final Color color;
  final double size;
  final double iconSize;
  final double radius;
  final int alpha;
  final int? borderAlpha;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withAlpha(alpha),
        borderRadius: BorderRadius.circular(radius),
        border: borderAlpha == null ? null : Border.all(color: color.withAlpha(borderAlpha!)),
      ),
      child: Icon(icon, size: iconSize, color: color),
    );
  }
}

/// A section heading with an optional "See all →" action.
class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {super.key, this.subtitle, this.action, this.onAction, this.size = 24});
  final String title;
  final Widget? subtitle;
  final String? action;
  final VoidCallback? onAction;
  final double size;

  @override
  Widget build(BuildContext context) {
    // The action sits on the title's line; the subtitle gets the full width below.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: Semantics(header: true, child: Text(title, style: fg(size: size, weight: FontWeight.w800)))),
            if (action != null) ...[const SizedBox(width: 12), LinkText(action!, onTap: onAction)],
          ],
        ),
        if (subtitle != null) ...[SizedBox(height: action != null ? 0 : 4), subtitle!],
      ],
    );
  }
}

/// Page title (`text-3xl font-extrabold`).
class PageTitle extends StatelessWidget {
  const PageTitle(this.title, {super.key, this.icon, this.size = 30});
  final String title;
  final IconData? icon;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      header: true,
      // As wide as the title, so a link can share its line (`justify-between`).
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: size * 0.9, color: AppColors.limeLight), const SizedBox(width: 12)],
          Flexible(child: Text(title, style: fg(size: size, weight: FontWeight.w800, height: 1.2))),
        ],
      ),
    );
  }
}

/// Space between stacked children (`space-y-*`).
List<Widget> spaced(List<Widget> children, double gap) {
  final out = <Widget>[];
  for (final c in children) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(c);
  }
  return out;
}

/// A responsive grid: [columns] across, wrapping rows (`grid grid-cols-N gap-*`).
/// [sm], [md] and [lg] set the columns on wider screens (`md:grid-cols-N`).
class FgGrid extends StatelessWidget {
  const FgGrid({super.key, required this.children, this.columns = 2, this.sm, this.md, this.lg, this.gap = 16, this.runGap});
  final List<Widget> children;
  final int columns;
  final int? sm;
  final int? md;
  final int? lg;
  final double gap;
  final double? runGap;

  @override
  Widget build(BuildContext context) {
    final across = responsive(context, this.columns, sm: sm, md: md, lg: lg);
    // Grids of three or more columns halve them with large system text, so
    // labels have room and aren't split mid-word.
    final columns = largeText(context) && across > 2 ? (across / 2).ceil() : across;
    final rows = <Widget>[];
    for (var i = 0; i < children.length; i += columns) {
      if (rows.isNotEmpty) rows.add(SizedBox(height: runGap ?? gap));
      rows.add(_GridRow(columns: columns, gap: gap, children: children.sublist(i, math.min(i + columns, children.length))));
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: rows);
  }
}

/// One row of an [FgGrid]: [columns] equal cells, [gap] apart, all as tall
/// as the tallest (`items-stretch`). Each cell is laid out at its real width
/// to find that height, then again at least that tall, and the row follows
/// any later change in a cell's size. A cell is laid out first without a
/// height limit, so it mustn't contain a Spacer or Expanded.
class _GridRow extends MultiChildRenderObjectWidget {
  const _GridRow({required this.columns, required this.gap, required super.children});
  final int columns;
  final double gap;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderGridRow(columns, gap);

  @override
  void updateRenderObject(BuildContext context, _RenderGridRow renderObject) {
    renderObject
      ..columns = columns
      ..gap = gap;
  }
}

class _GridRowParentData extends ContainerBoxParentData<RenderBox> {}

class _RenderGridRow extends RenderBox with ContainerRenderObjectMixin<RenderBox, _GridRowParentData>, RenderBoxContainerDefaultsMixin<RenderBox, _GridRowParentData> {
  _RenderGridRow(this._columns, this._gap);

  int _columns;
  set columns(int value) {
    if (value == _columns) return;
    _columns = value;
    markNeedsLayout();
  }

  double _gap;
  set gap(double value) {
    if (value == _gap) return;
    _gap = value;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _GridRowParentData) child.parentData = _GridRowParentData();
  }

  double _cellWidth(double width) => math.max(0, (width - _gap * (_columns - 1)) / _columns);

  @override
  void performLayout() {
    final width = constraints.maxWidth;
    final cell = _cellWidth(width);
    var height = 0.0;
    for (var child = firstChild; child != null; child = childAfter(child)) {
      child.layout(BoxConstraints(minWidth: cell, maxWidth: cell), parentUsesSize: true);
      height = math.max(height, child.size.height);
    }
    var x = 0.0;
    for (var child = firstChild; child != null; child = childAfter(child)) {
      // At least the row's height rather than exactly it: a cell with tight
      // constraints would become a relayout boundary, and a later change in
      // its size (a font or data arriving) wouldn't reach the row.
      child.layout(BoxConstraints(minWidth: cell, maxWidth: cell, minHeight: height), parentUsesSize: true);
      (child.parentData! as _GridRowParentData).offset = Offset(x, 0);
      x += cell + _gap;
    }
    size = constraints.constrain(Size(width, height));
  }

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    final cell = _cellWidth(constraints.maxWidth);
    var height = 0.0;
    for (var child = firstChild; child != null; child = childAfter(child)) {
      height = math.max(height, child.getDryLayout(BoxConstraints.tightFor(width: cell)).height);
    }
    return constraints.constrain(Size(constraints.maxWidth, height));
  }

  double _tallest(double width, double Function(RenderBox child, double width) measure) {
    var height = 0.0;
    for (var child = firstChild; child != null; child = childAfter(child)) {
      height = math.max(height, measure(child, _cellWidth(width)));
    }
    return height;
  }

  @override
  double computeMinIntrinsicHeight(double width) => _tallest(width, (c, w) => c.getMinIntrinsicHeight(w));

  @override
  double computeMaxIntrinsicHeight(double width) => _tallest(width, (c, w) => c.getMaxIntrinsicHeight(w));

  @override
  double computeMinIntrinsicWidth(double height) => _sumWidths(height, (c, h) => c.getMinIntrinsicWidth(h));

  @override
  double computeMaxIntrinsicWidth(double height) => _sumWidths(height, (c, h) => c.getMaxIntrinsicWidth(h));

  double _sumWidths(double height, double Function(RenderBox child, double height) measure) {
    var widest = 0.0;
    for (var child = firstChild; child != null; child = childAfter(child)) {
      widest = math.max(widest, measure(child, height));
    }
    return widest * _columns + _gap * (_columns - 1);
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) => defaultHitTestChildren(result, position: position);

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);
}

void showToast(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}
