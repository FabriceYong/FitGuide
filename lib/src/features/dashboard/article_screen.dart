import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/images.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../navigation.dart';
import '../../widgets/ui.dart';
import 'articles.dart';

/// One of FitGuide's own guides (dashboard/components/ArticlePage.tsx).
class ArticleScreen extends StatelessWidget {
  const ArticleScreen({super.key, required this.article});
  final Article article;

  @override
  Widget build(BuildContext context) {
    final color = articleCategoryColors[article.category]!;
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(pageGutter(context), atLeast(context, Breakpoints.md) ? 40 : 20, pageGutter(context), 48),
          // A readable column on a tablet (`max-w-3xl`).
          child: MaxWidth(
            768,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Material(
                  color: AppColors.obsidianWave,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: AppColors.whiteA(0.1))),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => Navigator.of(context).pop(),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(LucideIcons.arrowLeft, size: 16, color: AppColors.white70),
                          const SizedBox(width: 8),
                          Text('Back to home', style: fg(size: 14, color: AppColors.white70)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Pill(article.category, color: color, background: color.withAlpha(0x25), size: 12, weight: FontWeight.w900),
                    const SizedBox(width: 12),
                    const Icon(LucideIcons.clock, size: 14, color: AppColors.white70),
                    const SizedBox(width: 4),
                    Flexible(child: Text('${article.readMinutes} min read', style: fg(size: 12, color: AppColors.white70))),
                  ],
                ),
                const SizedBox(height: 16),
                Semantics(header: true, child: Text(article.title, style: fg(size: atLeast(context, Breakpoints.md) ? 36 : 30, weight: FontWeight.w800, height: 1.25))),
                const SizedBox(height: 16),
                Text(article.description, style: fg(size: 18, color: AppColors.white70, height: 1.6)),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(border: Border.symmetric(horizontal: BorderSide(color: AppColors.whiteA(0.1)))),
                  child: Text('By $articleAuthor', style: fg(size: 12, color: AppColors.white70)),
                ),
                const SizedBox(height: 24),
                Container(
                  height: atLeast(context, Breakpoints.md) ? 320 : 224,
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.whiteA(0.1))),
                  clipBehavior: Clip.antiAlias,
                  child: NetImage(unsplash(article.photo, query: 'w=1200&q=75&fit=crop')),
                ),
                const SizedBox(height: 24),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(color: color.withAlpha(0x10), borderRadius: BorderRadius.circular(16), border: Border.all(color: color.withAlpha(0x40))),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('KEY POINTS', style: fg(size: 12, weight: FontWeight.w900, color: color, letterSpacing: 1.2)),
                      const SizedBox(height: 12),
                      ...spaced([
                        for (final t in article.takeaways)
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(padding: const EdgeInsets.only(top: 2), child: Icon(LucideIcons.circleCheck, size: 16, color: color)),
                              const SizedBox(width: 8),
                              Expanded(child: Text(t, style: fg(size: 14))),
                            ],
                          ),
                      ], 8),
                    ],
                  ),
                ),
                for (final s in article.sections) ...[
                  const SizedBox(height: 24),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.only(top: 12),
                    decoration: BoxDecoration(border: Border(top: BorderSide(color: AppColors.whiteA(0.1)))),
                    child: Semantics(header: true, child: Text(s.heading, style: fg(size: atLeast(context, Breakpoints.md) ? 24 : 20, weight: FontWeight.w800))),
                  ),
                  for (final p in s.paragraphs) ...[const SizedBox(height: 12), Text(p, style: fg(size: 16, color: AppColors.white70, height: 1.6))],
                  if (s.tip != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.obsidianWave,
                        borderRadius: const BorderRadius.horizontal(right: Radius.circular(12)),
                        border: Border(left: BorderSide(color: color, width: 4)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(padding: const EdgeInsets.only(top: 2), child: Icon(LucideIcons.lightbulb, size: 16, color: color)),
                          const SizedBox(width: 8),
                          Expanded(child: Text(s.tip!, style: fg(size: 14))),
                        ],
                      ),
                    ),
                  ],
                ],
                const SizedBox(height: 24),
                Material(
                  color: AppColors.limeLight,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => openHref(context, article.actionHref),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          Expanded(child: Text(article.actionLabel, style: fg(size: 16, weight: FontWeight.w800, color: AppColors.noirEclipse))),
                          const Icon(LucideIcons.arrowRight, size: 20, color: AppColors.noirEclipse),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text('General information, not medical or dietary advice for your situation.', style: fg(size: 12, color: AppColors.white70)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
