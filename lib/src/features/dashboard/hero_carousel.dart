import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/images.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/ui.dart';

class HeroCta {
  const HeroCta(this.label, this.onTap);
  final String label;
  final VoidCallback onTap;
}

class HeroSlide {
  const HeroSlide({required this.id, required this.title, required this.subtitle, required this.photo, required this.primary, this.secondary});
  final String id;
  final String title;
  final String subtitle;
  final String photo;
  final HeroCta primary;
  final HeroCta? secondary;
}

/// Rotating highlights at the top of the home tab (HeroCarousel.tsx). Pauses
/// while touched, and doesn't rotate when the system asks for less motion.
class HeroCarousel extends StatefulWidget {
  const HeroCarousel({super.key, required this.slides, this.greeting});
  final List<HeroSlide> slides;
  final String? greeting;

  @override
  State<HeroCarousel> createState() => _HeroCarouselState();
}

class _HeroCarouselState extends State<HeroCarousel> {
  static const _interval = Duration(seconds: 7);
  int _index = 0;
  bool _paused = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(_interval, (_) {
      if (_paused || widget.slides.length < 2 || !mounted) return;
      if (MediaQuery.of(context).disableAnimations) return;
      setState(() => _index = (_index + 1) % widget.slides.length);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Widget _cta(HeroCta cta, {bool primary = false}) {
    return Material(
      color: primary ? AppColors.limeLight : Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: primary ? BorderSide.none : BorderSide(color: AppColors.whiteA(0.3), width: 2),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: cta.onTap,
        // At least the 48px touch height Android recommends.
        child: Container(
          constraints: const BoxConstraints(minHeight: 48),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // One line; a long workout name ends with an ellipsis.
              Flexible(
                child: Text(
                  cta.label.toUpperCase(),
                  maxLines: 1,
                  softWrap: false,
                  overflow: TextOverflow.ellipsis,
                  style: fg(size: 13, weight: primary ? FontWeight.w800 : FontWeight.w700, color: primary ? AppColors.noirEclipse : AppColors.white, letterSpacing: 0.6),
                ),
              ),
              if (primary) ...[const SizedBox(width: 8), const Icon(LucideIcons.arrowRight, size: 18, color: AppColors.noirEclipse)],
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.slides.isEmpty) return const SizedBox.shrink();
    final index = _index % widget.slides.length;
    final slide = widget.slides[index];
    final wide = atLeast(context, Breakpoints.md);
    // Taller on a tablet (`md:min-h-[520px]`), but never more than most of
    // the screen, so a phone on its side still shows what's under it.
    final minHeight = wide ? (MediaQuery.sizeOf(context).height * 0.7).clamp(240.0, 520.0) : 360.0;
    final gutter = pageGutter(context);
    return Listener(
      onPointerDown: (_) => _paused = true,
      onPointerUp: (_) => _paused = false,
      onPointerCancel: (_) => _paused = false,
      child: Semantics(
        label: 'Highlights',
        container: true,
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: minHeight),
          child: Stack(
            alignment: AlignmentDirectional.centerStart,
            children: [
              Positioned.fill(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 1000),
                  child: SizedBox.expand(
                    key: ValueKey(slide.id),
                    child: NetImage(unsplash(slide.photo, query: 'w=1600&q=75&fit=crop')),
                  ),
                ),
              ),
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(gradient: LinearGradient(colors: [AppColors.noirEclipse, AppColors.noirEclipse.withValues(alpha: 0.85), AppColors.noirEclipse.withValues(alpha: 0.3)])),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                height: 160,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [AppColors.noirEclipse, AppColors.noirEclipse.withValues(alpha: 0)]),
                  ),
                ),
              ),
              Padding(
                padding: EdgeInsets.fromLTRB(gutter, wide ? 56 : 40, gutter, wide ? 48 : 28),
                child: Semantics(
                  label: '${index + 1} of ${widget.slides.length}',
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 400),
                    // Text lines stay a readable length on wide screens (`max-w-4xl`).
                    child: Container(
                      key: ValueKey(slide.id),
                      constraints: const BoxConstraints(maxWidth: 896),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (widget.greeting != null) ...[
                            Text(
                              widget.greeting!.toUpperCase(),
                              style: fg(size: 12, weight: FontWeight.w600, color: AppColors.limeLight, letterSpacing: 1.5),
                            ),
                            const SizedBox(height: 10),
                          ],
                          Semantics(
                            header: true,
                            child: Text(
                              slide.title,
                              style: fg(size: wide ? 60 : 36, weight: FontWeight.w800, height: 1.2),
                            ),
                          ),
                          SizedBox(height: wide ? 16 : 12),
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 672),
                            child: Text(
                              slide.subtitle,
                              style: fg(size: wide ? 20 : 16, weight: FontWeight.w500, color: AppColors.white70, height: 1.5),
                            ),
                          ),
                          SizedBox(height: wide ? 24 : 16),
                          Wrap(spacing: 12, runSpacing: 12, children: [_cta(slide.primary, primary: true), if (slide.secondary != null) _cta(slide.secondary!)]),
                          if (widget.slides.length > 1) ...[
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                for (final (i, s) in widget.slides.indexed)
                                  Semantics(
                                    button: true,
                                    selected: i == index,
                                    label: 'Show highlight ${i + 1}: ${s.title}',
                                    excludeSemantics: true,
                                    child: GestureDetector(
                                      behavior: HitTestBehavior.opaque,
                                      onTap: () => setState(() => _index = i),
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(vertical: 12).copyWith(right: 8),
                                        child: AnimatedContainer(
                                          duration: const Duration(milliseconds: 300),
                                          height: 6,
                                          width: i == index ? 32 : 16,
                                          decoration: BoxDecoration(color: i == index ? AppColors.limeLight : AppColors.whiteA(0.4), borderRadius: BorderRadius.circular(999)),
                                        ),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
