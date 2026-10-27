import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'layout_checks.dart';

/// Screens on tablets and on a phone turned on its side, where the layouts
/// switch to the website's wider ones. An overflow fails the test.
void main() {
  group('tablet, portrait (768×1024)', () => layoutChecks(size: const Size(768, 1024), textScale: 1));
  group('tablet, landscape (1024×768)', () => layoutChecks(size: const Size(1024, 768), textScale: 1));
  group('tablet, landscape (1180×820)', () => layoutChecks(size: const Size(1180, 820), textScale: 1));
  group('phone on its side (844×390)', () => layoutChecks(size: const Size(844, 390), textScale: 1));
  group('tablet with large text (768×1024, 200%)', () => layoutChecks(size: const Size(768, 1024), textScale: 2));
}
