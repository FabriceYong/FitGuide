import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/ui.dart';

/// Whether this device has a camera scanner (Android and iOS).
bool get canScanBarcodes => !kIsWeb && (defaultTargetPlatform == TargetPlatform.android || defaultTargetPlatform == TargetPlatform.iOS);

/// Point the camera at a food's barcode; pops with its digits.
class BarcodeScannerScreen extends StatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen> {
  // The barcodes printed on food packaging.
  final _controller = MobileScannerController(
    formats: const [BarcodeFormat.ean13, BarcodeFormat.ean8, BarcodeFormat.upcA, BarcodeFormat.upcE],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  bool _done = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    final code = capture.barcodes.map((b) => b.rawValue).whereType<String>().where((v) => RegExp(r'^\d{8,14}$').hasMatch(v)).firstOrNull;
    if (code == null || _done) return;
    _done = true;
    HapticFeedback.selectionClick();
    Navigator.of(context).pop(code);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(title: Text('Scan a barcode', style: fg(size: 16, weight: FontWeight.w700)), backgroundColor: Colors.black),
      body: Stack(children: [
        MobileScanner(
          controller: _controller,
          onDetect: _onDetect,
          errorBuilder: (context, error) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: ErrorBox(
                error.errorCode == MobileScannerErrorCode.permissionDenied
                    ? 'FitGuide can’t use the camera. Allow it in your phone’s settings, or type the barcode instead.'
                    : 'The camera couldn’t start. Type the barcode instead.',
              ),
            ),
          ),
        ),
        // Where to hold the barcode.
        Center(
          child: Container(
            width: 280,
            height: 150,
            decoration: BoxDecoration(border: Border.all(color: AppColors.limeLight, width: 2), borderRadius: BorderRadius.circular(16)),
          ),
        ),
        Positioned(
          left: 24,
          right: 24,
          bottom: 40,
          child: Text('Hold the barcode inside the frame.', textAlign: TextAlign.center, style: fg(size: 14, color: AppColors.white)),
        ),
      ]),
    );
  }
}
