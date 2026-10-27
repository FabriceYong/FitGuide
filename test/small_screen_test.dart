import 'package:flutter/material.dart';

import 'layout_checks.dart';

/// Screens on a 320px-wide phone (the narrowest in common use: iPhone SE,
/// small Androids) at normal text size. An overflow fails the test.
void main() {
  layoutChecks(size: const Size(320, 568), textScale: 1);
}
