import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';

import '../core/analytics.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import 'ui.dart';

/// What a picture card shows (lib/shareCard.ts on the website draws the same).
class ShareCardData {
  const ShareCardData({required this.label, required this.title, this.subtitle, this.stats = const [], this.records = const [], this.figure});

  /// "WORKOUT COMPLETE", "MY WEEK"
  final String label;
  final String title;
  final String? subtitle;

  /// (value, label), up to four.
  final List<(String, String)> stats;

  /// "Goblet Squat · 24 kg × 8"
  final List<String> records;

  /// A picture between the title and the numbers (the week's muscle map).
  final Widget? figure;
}

/// The card, laid out at 360 × 450 and saved at three times that
/// (1080 × 1350, Instagram portrait).
class ShareCard extends StatelessWidget {
  const ShareCard({super.key, required this.data});
  final ShareCardData data;

  static const size = Size(360, 450);

  @override
  Widget build(BuildContext context) {
    final stats = data.stats.take(4).toList();
    return SizedBox.fromSize(
      size: size,
      child: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF16202B), AppColors.noirEclipse]),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(height: 5, color: AppColors.limeLight),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(26, 20, 26, 22),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('FITGUIDE', style: fg(size: 14, weight: FontWeight.w800, color: AppColors.limeLight, letterSpacing: 1)),
                const SizedBox(height: 26),
                Text(data.label, style: fg(size: 12, weight: FontWeight.w700, color: AppColors.limeLight, letterSpacing: 0.8)),
                const SizedBox(height: 6),
                Text(data.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: fg(size: 28, weight: FontWeight.w900, height: 1.1)),
                if (data.subtitle != null) ...[
                  const SizedBox(height: 6),
                  Text(data.subtitle!, style: fg(size: 12, color: AppColors.whiteA(0.65))),
                ],
                // The figure takes the room left, shrinking to fit.
                if (data.figure != null) ...[const SizedBox(height: 12), Expanded(child: Center(child: FittedBox(child: data.figure!)))],
                const SizedBox(height: 16),
                for (var i = 0; i < stats.length; i += 2) ...[
                  if (i > 0) const SizedBox(height: 8),
                  Row(children: [
                    Expanded(child: _stat(stats[i])),
                    const SizedBox(width: 8),
                    Expanded(child: i + 1 < stats.length ? _stat(stats[i + 1]) : const SizedBox.shrink()),
                  ]),
                ],
                if (data.records.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Text(data.records.length == 1 ? '🏆 New personal record' : '🏆 New personal records', style: fg(size: 13, weight: FontWeight.w800, color: AppColors.amber300)),
                  const SizedBox(height: 4),
                  for (final r in data.records.take(3)) Text(r, maxLines: 1, overflow: TextOverflow.ellipsis, style: fg(size: 12, weight: FontWeight.w600)),
                ],
                if (data.figure == null) const Spacer() else const SizedBox(height: 12),
                Text('Trained with FitGuide', style: fg(size: 11, weight: FontWeight.w600, color: AppColors.whiteA(0.5))),
              ]),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _stat((String, String) s) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(color: AppColors.whiteA(0.06), borderRadius: BorderRadius.circular(10)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(s.$1, maxLines: 1, overflow: TextOverflow.ellipsis, style: fg(size: 22, weight: FontWeight.w800)),
          Text(s.$2, maxLines: 1, overflow: TextOverflow.ellipsis, style: fg(size: 11, weight: FontWeight.w600, color: AppColors.whiteA(0.65))),
        ]),
      );
}

/// Sends the picture to the share sheet; tests replace it. [origin] is where
/// the sheet points from on an iPad (required there).
typedef CardSharer = Future<void> Function(Uint8List png, String filename, String text, Rect? origin);

Future<void> _sharePng(Uint8List png, String filename, String text, Rect? origin) async {
  await SharePlus.instance.share(ShareParams(
    files: [XFile.fromData(png, mimeType: 'image/png', name: filename)],
    fileNameOverrides: [filename],
    text: text,
    sharePositionOrigin: origin,
  ));
}

CardSharer shareCardSharer = _sharePng;

/// Show the card and share it from the phone's share sheet.
Future<void> showShareCard(BuildContext context, ShareCardData data, {required String filename, required String text, required String kind}) {
  return showDialog<void>(context: context, builder: (_) => _ShareCardDialog(data: data, filename: filename, text: text, kind: kind));
}

class _ShareCardDialog extends StatefulWidget {
  const _ShareCardDialog({required this.data, required this.filename, required this.text, required this.kind});
  final ShareCardData data;
  final String filename;
  final String text;
  final String kind;

  @override
  State<_ShareCardDialog> createState() => _ShareCardDialogState();
}

class _ShareCardDialogState extends State<_ShareCardDialog> {
  final _boundary = GlobalKey();
  bool _busy = false;
  String? _error;

  Future<void> _share() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final boundary = _boundary.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final image = await boundary.toImage(pixelRatio: 3);
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      image.dispose();
      if (!mounted) return;
      final box = context.findRenderObject() as RenderBox?;
      final origin = box == null ? null : box.localToGlobal(Offset.zero) & box.size;
      await shareCardSharer(bytes!.buffer.asUint8List(), widget.filename, widget.text, origin);
      track('card_shared', props: {'kind': widget.kind});
      if (mounted) Navigator.of(context).pop();
    } catch (err) {
      if (mounted) setState(() => _error = 'Could not share the picture.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.obsidianWave,
      insetPadding: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Flexible(
            child: FittedBox(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: RepaintBoundary(key: _boundary, child: ShareCard(data: widget.data)),
              ),
            ),
          ),
          if (_error != null) ...[const SizedBox(height: 8), ErrorLine(_error!)],
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: FgButton(label: 'Close', style: FgButtonStyle.ghost, radius: 12, fontSize: 14, onPressed: () => Navigator.of(context).pop())),
            const SizedBox(width: 8),
            Expanded(child: FgButton(label: 'Share', icon: LucideIcons.share2, loading: _busy, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: _busy ? null : _share)),
          ]),
        ]),
      ),
    );
  }
}
