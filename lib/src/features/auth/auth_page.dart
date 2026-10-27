import 'package:flutter/material.dart';

import '../../core/responsive.dart';
import '../../core/theme/app_colors.dart';
import '../common/brand.dart';

/// The page around a sign-in or sign-up form: header with the logo and an
/// optional link, then the form: in a card on a tablet, at full width on a
/// phone, where the card's frame drops away (as on the website).
class AuthPage extends StatelessWidget {
  const AuthPage({super.key, required this.child, this.header, this.maxWidth = 600, this.scrollController});

  final Widget child;
  final Widget? header;
  final double maxWidth;
  final ScrollController? scrollController;

  @override
  Widget build(BuildContext context) {
    final framed = atLeast(context, Breakpoints.sm);
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Container(
              height: framed ? 64 : 56,
              padding: EdgeInsets.symmetric(horizontal: framed ? 24 : 16),
              decoration: BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.white30A(0.15)))),
              child: MaxWidth(
                1152,
                child: Row(
                  children: [
                    const BrandMark(radius: 8, extraBold: false),
                    const SizedBox(width: 16),
                    if (header != null)
                      Expanded(
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: FittedBox(fit: BoxFit.scaleDown, child: header!),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: EdgeInsets.fromLTRB(16, framed ? 48 : 32, 16, framed ? 48 : 32),
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: maxWidth),
                    child: framed
                        ? Container(
                            padding: const EdgeInsets.all(40),
                            decoration: BoxDecoration(
                              color: AppColors.obsidianWave,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.white30A(0.2)),
                              boxShadow: const [BoxShadow(color: Color(0x40000000), blurRadius: 24, offset: Offset(0, 8))],
                            ),
                            child: child,
                          )
                        : child,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
