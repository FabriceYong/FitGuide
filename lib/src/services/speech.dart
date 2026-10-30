import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

/// Spoken cues in the workout player (speechSynthesis on the website): the
/// phone's own text-to-speech, said over anything still being spoken. Fails
/// quietly where there's no speech engine (and in tests).
class Speech {
  Speech._();

  static FlutterTts? _tts;

  /// Replaced in tests to see what would be said.
  @visibleForTesting
  static void Function(String text)? onSay;

  static Future<void> say(String text) async {
    if (onSay != null) {
      onSay!(text);
      return;
    }
    try {
      final tts = _tts ??= FlutterTts();
      await tts.stop();
      await tts.setSpeechRate(0.5);
      await tts.speak(text);
    } catch (_) {
      // No speech engine on this device.
    }
  }

  static Future<void> stop() async {
    try {
      await _tts?.stop();
    } catch (_) {}
  }
}
