import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:video_player/video_player.dart';
import 'package:visibility_detector/visibility_detector.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import 'articles.dart';

/// How much of the video has to be on screen before it starts.
const _visible = 0.6;

String _clock(Duration d) {
  final s = d.inSeconds < 0 ? 0 : d.inSeconds;
  return '${(s ~/ 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';
}

VideoPlayerController _network(Uri uri) => VideoPlayerController.networkUrl(uri);

/// A video inside an article (features/articles/ArticleVideo.tsx). It starts
/// playing, muted, once the reader scrolls it into view and pauses when they
/// scroll past, unless they paused it themselves or turned animations off.
/// The title sits over the picture until it plays; the transcript opens
/// underneath.
class ArticleVideoPlayer extends StatefulWidget {
  const ArticleVideoPlayer({super.key, required this.video, this.controllerFor = _network});
  final ArticleVideo video;

  /// Makes the player for the video's address; tests pass a fake.
  final VideoPlayerController Function(Uri uri) controllerFor;

  @override
  State<ArticleVideoPlayer> createState() => _ArticleVideoPlayerState();
}

class _ArticleVideoPlayerState extends State<ArticleVideoPlayer> {
  late final VideoPlayerController _controller;
  bool _failed = false;
  bool _onScreen = false;
  // Set when the reader pauses; scrolling then leaves the video alone.
  bool _pausedByReader = false;
  bool _fullscreen = false;
  bool _transcript = false;
  // While it plays, a tap shows the controls for a few seconds.
  bool _controlsShown = false;
  Timer? _hideControls;

  @override
  void initState() {
    super.initState();
    _controller = widget.controllerFor(Uri.parse(assetUrl(widget.video.url) ?? widget.video.url));
    _controller.initialize().then((_) async {
      await _controller.setVolume(0);
      if (mounted) {
        setState(() {});
        _autoplay();
      }
    }).catchError((Object _) {
      if (mounted) setState(() => _failed = true);
    });
  }

  @override
  void dispose() {
    _hideControls?.cancel();
    _controller.dispose();
    super.dispose();
  }

  bool get _ended {
    final v = _controller.value;
    return v.isInitialized && !v.isPlaying && v.duration > Duration.zero && v.position >= v.duration;
  }

  void _autoplay() {
    final v = _controller.value;
    if (!v.isInitialized || _fullscreen) return;
    if (_onScreen && !_pausedByReader && !_ended && !MediaQuery.disableAnimationsOf(context)) {
      if (!v.isPlaying) _controller.play();
    } else if (!_onScreen && v.isPlaying) {
      _controller.pause();
    }
  }

  void _visibilityChanged(VisibilityInfo info) {
    if (!mounted) return;
    _onScreen = info.visibleFraction >= _visible;
    _autoplay();
  }

  void _toggle() {
    if (_controller.value.isPlaying) {
      _pausedByReader = true;
      _controller.pause();
    } else {
      _pausedByReader = false;
      if (_ended) _controller.seekTo(Duration.zero);
      _controller.play();
    }
  }

  void _back() {
    final at = _controller.value.position - const Duration(seconds: 10);
    _controller.seekTo(at < Duration.zero ? Duration.zero : at);
  }

  void _toggleMute() => _controller.setVolume(_controller.value.volume > 0 ? 0 : 1);

  void _showControls() {
    setState(() => _controlsShown = true);
    _hideControls?.cancel();
    _hideControls = Timer(const Duration(seconds: 3), () {
      if (mounted) setState(() => _controlsShown = false);
    });
  }

  Future<void> _openFullscreen() async {
    _fullscreen = true;
    await SystemChrome.setPreferredOrientations([DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight]);
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    if (!mounted) return;
    await Navigator.of(context).push(MaterialPageRoute<void>(
      fullscreenDialog: true,
      builder: (_) => _FullscreenVideo(controller: _controller, title: widget.video.title, onToggle: _toggle, onBack: _back, onMute: _toggleMute),
    ));
    await SystemChrome.setPreferredOrientations(const []);
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    _fullscreen = false;
    if (mounted) _autoplay();
  }

  @override
  Widget build(BuildContext context) {
    final video = widget.video;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        VisibilityDetector(
          key: ValueKey('article-video-${video.url}'),
          onVisibilityChanged: _visibilityChanged,
          child: Container(
            decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.whiteA(0.1))),
            clipBehavior: Clip.antiAlias,
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: ValueListenableBuilder<VideoPlayerValue>(
                valueListenable: _controller,
                builder: (context, value, _) {
                  final playing = value.isPlaying;
                  final chrome = !playing || _controlsShown;
                  return Stack(
                    fit: StackFit.expand,
                    children: [
                      GestureDetector(
                        // The whole frame, black bands included, takes the tap.
                        behavior: HitTestBehavior.opaque,
                        onTap: playing ? _showControls : _toggle,
                        child: Center(
                          child: value.isInitialized
                              ? AspectRatio(aspectRatio: value.aspectRatio, child: VideoPlayer(_controller))
                              : _failed
                                  ? Padding(
                                      padding: const EdgeInsets.all(24),
                                      child: Text('This video can’t be played right now.', textAlign: TextAlign.center, style: fg(size: 13, color: AppColors.white70)),
                                    )
                                  : const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white70)),
                        ),
                      ),
                      _Fade(
                        visible: chrome,
                        alignment: Alignment.topCenter,
                        child: _TitleOverlay(title: video.title, description: video.description),
                      ),
                      if (!_failed && value.isInitialized && (_ended || (!playing && value.position == Duration.zero)))
                        Center(child: _BigPlay(ended: _ended, title: video.title, onTap: _toggle)),
                      if (value.isInitialized)
                        _Fade(
                          visible: chrome,
                          alignment: Alignment.bottomCenter,
                          child: _Controls(controller: _controller, onToggle: _toggle, onBack: _back, onMute: _toggleMute, onFullscreen: _openFullscreen),
                        ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
        if (video.transcript != null) ...[
          const SizedBox(height: 4),
          InkWell(
            onTap: () => setState(() => _transcript = !_transcript),
            borderRadius: BorderRadius.circular(8),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 48),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(_transcript ? LucideIcons.minus : LucideIcons.plus, size: 16, color: AppColors.limeLight),
                  const SizedBox(width: 6),
                  Semantics(
                    button: true,
                    expanded: _transcript,
                    child: Text(_transcript ? 'Hide video transcript' : 'View video transcript', style: fg(size: 14, weight: FontWeight.w700, color: AppColors.limeLight)),
                  ),
                ],
              ),
            ),
          ),
          if (_transcript)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.whiteA(0.1))),
              child: Text(video.transcript!, style: fg(size: 14, color: AppColors.white70, height: 1.6)),
            ),
        ],
      ],
    );
  }
}

/// Fades the title or the controls in and out, without taking taps while hidden.
class _Fade extends StatelessWidget {
  const _Fade({required this.visible, required this.alignment, required this.child});
  final bool visible;
  final Alignment alignment;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: alignment,
      child: IgnorePointer(
        ignoring: !visible,
        child: AnimatedOpacity(opacity: visible ? 1 : 0, duration: const Duration(milliseconds: 250), child: child),
      ),
    );
  }
}

class _TitleOverlay extends StatelessWidget {
  const _TitleOverlay({required this.title, this.description});
  final String title;
  final String? description;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xC0000000), Color(0x00000000)])),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: fg(size: 15, weight: FontWeight.w700, color: AppColors.white, height: 1.3)),
          if (description != null) ...[
            const SizedBox(height: 2),
            Text(description!, maxLines: 2, overflow: TextOverflow.ellipsis, style: fg(size: 13, color: AppColors.whiteA(0.85))),
          ],
        ],
      ),
    );
  }
}

class _BigPlay extends StatelessWidget {
  const _BigPlay({required this.ended, required this.title, required this.onTap});
  final bool ended;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: ended ? 'Play $title again' : 'Play $title',
      excludeSemantics: true,
      child: Material(
        color: const Color(0x8C000000),
        shape: CircleBorder(side: BorderSide(color: AppColors.whiteA(0.3))),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox(
            width: 56,
            height: 56,
            child: Icon(ended ? LucideIcons.rotateCcw : LucideIcons.play, size: 26, color: AppColors.white),
          ),
        ),
      ),
    );
  }
}

/// Seek bar, then play/pause, back 10 seconds, sound, time and full screen.
class _Controls extends StatelessWidget {
  const _Controls({required this.controller, required this.onToggle, required this.onBack, required this.onMute, required this.onFullscreen, this.fullscreen = false});
  final VideoPlayerController controller;
  final VoidCallback onToggle;
  final VoidCallback onBack;
  final VoidCallback onMute;
  final VoidCallback onFullscreen;
  final bool fullscreen;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<VideoPlayerValue>(
      valueListenable: controller,
      builder: (context, v, _) {
        Widget button(IconData icon, String label, VoidCallback onTap) => IconButton(
              onPressed: onTap,
              tooltip: label,
              icon: Icon(icon, size: 20, color: AppColors.white),
              visualDensity: VisualDensity.compact,
            );
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(8, 20, 8, 2),
          decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [Color(0xCC000000), Color(0x00000000)])),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Semantics(
                label: 'Position in the video',
                value: '${_clock(v.position)} of ${_clock(v.duration)}',
                child: VideoProgressIndicator(
                  controller,
                  allowScrubbing: true,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  colors: VideoProgressColors(playedColor: AppColors.limeLight, bufferedColor: AppColors.whiteA(0.35), backgroundColor: AppColors.whiteA(0.15)),
                ),
              ),
              Row(
                children: [
                  button(v.isPlaying ? LucideIcons.pause : LucideIcons.play, v.isPlaying ? 'Pause' : 'Play', onToggle),
                  button(LucideIcons.rotateCcw, 'Back 10 seconds', onBack),
                  button(v.volume > 0 ? LucideIcons.volume2 : LucideIcons.volumeX, v.volume > 0 ? 'Mute' : 'Turn sound on', onMute),
                  Flexible(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text('${_clock(v.position)} / ${_clock(v.duration)}', style: fg(size: 12, color: AppColors.white).copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
                    ),
                  ),
                  const Spacer(),
                  button(fullscreen ? LucideIcons.minimize : LucideIcons.maximize, fullscreen ? 'Exit full screen' : 'Full screen', onFullscreen),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

/// The same player filling the screen, turned sideways.
class _FullscreenVideo extends StatelessWidget {
  const _FullscreenVideo({required this.controller, required this.title, required this.onToggle, required this.onBack, required this.onMute});
  final VideoPlayerController controller;
  final String title;
  final VoidCallback onToggle;
  final VoidCallback onBack;
  final VoidCallback onMute;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          fit: StackFit.expand,
          children: [
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: onToggle,
              child: Center(child: AspectRatio(aspectRatio: controller.value.aspectRatio, child: VideoPlayer(controller))),
            ),
            Align(alignment: Alignment.topCenter, child: _TitleOverlay(title: title)),
            Align(
              alignment: Alignment.bottomCenter,
              child: _Controls(controller: controller, onToggle: onToggle, onBack: onBack, onMute: onMute, onFullscreen: () => Navigator.of(context).pop(), fullscreen: true),
            ),
          ],
        ),
      ),
    );
  }
}
