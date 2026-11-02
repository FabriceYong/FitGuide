import 'dart:io' show Platform;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_pose_detection/google_mlkit_pose_detection.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/rep_counter.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/ui.dart';

/// Camera counting works on phones (ML Kit runs on Android and iOS).
bool get repCameraSupported => !kIsWeb && (Platform.isAndroid || Platform.isIOS);

/// Count reps of squats or push-ups with the front camera; resolves with the
/// count when the member taps "Log", or null. The video stays on the phone
/// (features/workout/RepCamera.tsx on the website).
Future<int?> countRepsWithCamera(BuildContext context, String exercise) =>
    Navigator.of(context).push<int>(MaterialPageRoute(fullscreenDialog: true, builder: (_) => RepCameraScreen(exercise: exercise)));

class RepCameraScreen extends StatefulWidget {
  const RepCameraScreen({super.key, required this.exercise});
  final String exercise;

  @override
  State<RepCameraScreen> createState() => _RepCameraScreenState();
}

class _RepCameraScreenState extends State<RepCameraScreen> {
  CameraController? _camera;
  CameraDescription? _description;
  final _detector = PoseDetector(options: PoseDetectorOptions(mode: PoseDetectionMode.stream));
  late final _counter = RepCounter(widget.exercise);
  bool _busy = false;
  bool _seen = true;
  int _reps = 0;
  String? _cue;
  String? _error;

  static const _orientations = {
    DeviceOrientation.portraitUp: 0,
    DeviceOrientation.landscapeLeft: 90,
    DeviceOrientation.portraitDown: 180,
    DeviceOrientation.landscapeRight: 270,
  };

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) throw CameraException('none', 'No camera');
      final description = cameras.firstWhere((c) => c.lensDirection == CameraLensDirection.front, orElse: () => cameras.first);
      final controller = CameraController(
        description,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: Platform.isAndroid ? ImageFormatGroup.nv21 : ImageFormatGroup.bgra8888,
      );
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _camera = controller;
        _description = description;
      });
      await controller.startImageStream(_onFrame);
    } on CameraException catch (err) {
      if (mounted) {
        setState(() => _error = err.code.contains('Denied') || err.code.contains('denied')
            ? 'Camera access was turned down. Allow it in the phone’s settings to count reps.'
            : 'The camera counter could not start on this phone.');
      }
    }
  }

  /// How the frame is turned relative to upright, for ML Kit.
  InputImageRotation? _rotation() {
    final camera = _camera;
    final description = _description;
    if (camera == null || description == null) return null;
    final sensor = description.sensorOrientation;
    if (Platform.isIOS) return InputImageRotationValue.fromRawValue(sensor);
    final device = _orientations[camera.value.deviceOrientation];
    if (device == null) return null;
    final degrees = description.lensDirection == CameraLensDirection.front ? (sensor + device) % 360 : (sensor - device + 360) % 360;
    return InputImageRotationValue.fromRawValue(degrees);
  }

  Future<void> _onFrame(CameraImage image) async {
    // One frame at a time; frames that arrive meanwhile are skipped.
    if (_busy) return;
    final rotation = _rotation();
    final format = InputImageFormatValue.fromRawValue(image.format.raw);
    if (rotation == null || format == null || image.planes.length != 1) return;
    _busy = true;
    try {
      final poses = await _detector.processImage(InputImage.fromBytes(
        bytes: image.planes.first.bytes,
        metadata: InputImageMetadata(
          size: Size(image.width.toDouble(), image.height.toDouble()),
          rotation: rotation,
          format: format,
          bytesPerRow: image.planes.first.bytesPerRow,
        ),
      ));
      if (!mounted) return;
      if (poses.isEmpty) {
        if (_seen) setState(() => _seen = false);
        return;
      }
      final landmarks = {
        for (final entry in poses.first.landmarks.entries) entry.key.index: PosePoint(entry.value.x, entry.value.y, entry.value.likelihood),
      };
      final update = _counter.update(landmarks);
      setState(() {
        _seen = true;
        _reps = update.reps;
        if (update.cue != null) _cue = update.cue;
        if (update.event == 'rep') _cue = null;
      });
      if (update.event == 'rep') HapticFeedback.lightImpact();
    } catch (_) {
      // A frame ML Kit couldn't read: the next one will do.
    } finally {
      _busy = false;
    }
  }

  @override
  void dispose() {
    final camera = _camera;
    if (camera != null) {
      if (camera.value.isStreamingImages) camera.stopImageStream().catchError((_) {});
      camera.dispose();
    }
    _detector.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ex = repExercises[widget.exercise]!;
    final camera = _camera;
    return Scaffold(
      backgroundColor: AppColors.noirEclipse,
      appBar: AppBar(
        backgroundColor: AppColors.noirEclipse,
        title: Text('Count ${ex.name.toLowerCase()}', style: fg(size: 16, weight: FontWeight.w800)),
        leading: IconButton(tooltip: 'Close the camera counter', icon: const Icon(LucideIcons.x), onPressed: () => Navigator.of(context).pop()),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Stack(fit: StackFit.expand, children: [
                  if (camera != null && camera.value.isInitialized)
                    FittedBox(fit: BoxFit.cover, child: SizedBox(width: camera.value.previewSize?.height ?? 480, height: camera.value.previewSize?.width ?? 640, child: CameraPreview(camera)))
                  else
                    Container(color: Colors.black, child: _error == null ? const Center(child: LoadingRow('Starting the camera…')) : null),
                  if (_error == null)
                    Positioned(
                      top: 12,
                      left: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(16)),
                        child: ExcludeSemantics(
                          child: Column(children: [
                            Text('$_reps', style: fg(size: 40, weight: FontWeight.w900)),
                            Text('REPS', style: fg(size: 10, weight: FontWeight.w700, color: AppColors.white70, letterSpacing: 1)),
                          ]),
                        ),
                      ),
                    ),
                  if (camera != null && (_cue != null || !_seen))
                    Positioned(
                      left: 12,
                      right: 12,
                      bottom: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(color: AppColors.amber500.withValues(alpha: 0.92), borderRadius: BorderRadius.circular(12)),
                        child: Text(_cue ?? 'Step back so your whole body is in view',
                            textAlign: TextAlign.center, style: fg(size: 14, weight: FontWeight.w700, color: AppColors.noirEclipse)),
                      ),
                    ),
                ]),
              ),
            ),
            // Read out as the count changes.
            Semantics(liveRegion: true, label: '$_reps ${_reps == 1 ? 'rep' : 'reps'}${_cue != null ? '. $_cue' : ''}', child: const SizedBox.shrink()),
            const SizedBox(height: 12),
            if (_error != null) ErrorLine(_error!) else Text('${ex.setup} The video stays on this phone.', style: fg(size: 12, color: AppColors.white70)),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: FgButton(label: 'Cancel', style: FgButtonStyle.ghost, radius: 12, fontSize: 14, onPressed: () => Navigator.of(context).pop())),
              const SizedBox(width: 12),
              Expanded(
                child: FgButton(
                  label: 'Log $_reps ${_reps == 1 ? 'rep' : 'reps'}',
                  radius: 12,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  onPressed: _reps == 0 ? null : () => Navigator.of(context).pop(_reps),
                ),
              ),
            ]),
          ]),
        ),
      ),
    );
  }
}
