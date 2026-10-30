import 'package:fitguide/src/features/dashboard/article_video.dart';
import 'package:fitguide/src/features/dashboard/articles.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:video_player/video_player.dart';
import 'package:visibility_detector/visibility_detector.dart';

import 'helpers.dart';

/// A one-minute video that plays without a device player.
class _FakeVideo extends VideoPlayerController {
  _FakeVideo() : super.networkUrl(Uri.parse('https://cdn.example.com/core.mp4'));
  int plays = 0;

  @override
  Future<void> initialize() async {
    value = value.copyWith(isInitialized: true, duration: const Duration(seconds: 57), size: const Size(1280, 720), volume: 1);
  }

  @override
  Future<void> play() async {
    plays++;
    value = value.copyWith(isPlaying: true);
  }

  @override
  Future<void> pause() async => value = value.copyWith(isPlaying: false);

  @override
  Future<void> setVolume(double volume) async => value = value.copyWith(volume: volume);

  @override
  Future<void> seekTo(Duration position) async => value = value.copyWith(position: position);

  @override
  Future<Duration?> get position async => value.position;

}

const _video = ArticleVideo(
  url: '/uploads/articles/video-video-1.mp4',
  title: 'Core exercises for any level',
  description: 'Five moves, no equipment.',
  transcript: 'Start on your back with your knees bent.',
);

void main() {
  setUp(() async {
    await setUpApp();
    VisibilityDetectorController.instance.updateInterval = Duration.zero;
  });

  // Text, then the video further down the page, then more text, in a
  // scroll view like the article screen's.
  Widget article(_FakeVideo fake) => SingleChildScrollView(
        child: Column(
          children: [
            const SizedBox(height: 1200, child: Text('Opening paragraphs')),
            ArticleVideoPlayer(video: _video, controllerFor: (_) => fake),
            const SizedBox(height: 1200, child: Text('Closing paragraphs')),
          ],
        ),
      );

  Future<void> scrollTo(WidgetTester tester, double offset) async {
    tester.state<ScrollableState>(find.byType(Scrollable).first).position.jumpTo(offset);
    await tester.pump();
    await tester.pump();
  }

  testWidgets('starts muted once scrolled into view, pauses when scrolled past', (tester) async {
    final fake = _FakeVideo();
    await pumpApp(tester, article(fake));
    await tester.pump();
    expect(fake.value.isPlaying, isFalse, reason: 'still below the fold');

    await scrollTo(tester, 1000);
    expect(fake.value.isPlaying, isTrue);
    expect(fake.value.volume, 0, reason: 'autoplay is muted');
    expect(find.text('Core exercises for any level'), findsOneWidget);

    await scrollTo(tester, 2400);
    expect(fake.value.isPlaying, isFalse);
    await scrollTo(tester, 1000);
    expect(fake.value.isPlaying, isTrue, reason: 'resumes when back in view');
    await tester.pump(const Duration(seconds: 4));
  });

  testWidgets('stays paused after the reader pauses it, and opens the transcript', (tester) async {
    final fake = _FakeVideo();
    await pumpApp(tester, article(fake));
    await scrollTo(tester, 1000);
    expect(fake.value.isPlaying, isTrue);

    // While it plays, a tap brings back the controls.
    await tester.tap(find.descendant(of: find.byType(ArticleVideoPlayer), matching: find.byType(GestureDetector)).first);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.byTooltip('Pause'));
    await tester.pump();
    expect(fake.value.isPlaying, isFalse);

    await scrollTo(tester, 2400);
    await scrollTo(tester, 1000);
    expect(fake.value.isPlaying, isFalse, reason: 'the reader paused it');

    await tester.tap(find.byTooltip('Turn sound on'));
    await tester.pump();
    expect(fake.value.volume, 1);

    expect(find.text('Start on your back with your knees bent.'), findsNothing);
    await tester.tap(find.text('View video transcript'));
    await tester.pump();
    expect(find.text('Start on your back with your knees bent.'), findsOneWidget);
    expect(find.text('Hide video transcript'), findsOneWidget);
    await tester.pump(const Duration(seconds: 4));
  });

  testWidgets('waits for a tap when animations are turned off', (tester) async {
    final fake = _FakeVideo();
    await pumpApp(tester, Builder(builder: (context) => MediaQuery(data: MediaQuery.of(context).copyWith(disableAnimations: true), child: article(fake))));
    await scrollTo(tester, 1000);
    expect(fake.plays, 0);

    await tester.tap(find.bySemanticsLabel('Play Core exercises for any level'));
    await tester.pump();
    expect(fake.value.isPlaying, isTrue);
    await tester.pump(const Duration(seconds: 4));
  });

  test('reads a section video from the API', () {
    final section = ArticleSection.fromJson({
      'heading': 'Watch first',
      'paragraphs': <String>[],
      'video': {'url': '/uploads/articles/v.mp4', 'title': 'Plank'},
    });
    expect(section.video?.title, 'Plank');
    expect(section.video?.transcript, isNull);
    expect(ArticleSection.fromJson({'heading': 'Text only', 'paragraphs': ['Hi']}).video, isNull);
  });
}
