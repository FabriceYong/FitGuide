import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/ui.dart';

/// The three downloads (profile/components/DataExport.tsx): what the API
/// path is, what the file is called, and what's in it.
const _downloads = [
  ('/auth/export', 'fitguide-data', 'json', 'Everything (JSON)', 'Your profile, workouts, measurements, plans, food log, health data, friends and coach chat.'),
  ('/auth/export/workouts.csv', 'fitguide-workouts', 'csv', 'Workouts (CSV)', 'One row per logged set, for a spreadsheet.'),
  ('/auth/export/body-metrics.csv', 'fitguide-body', 'csv', 'Body measurements (CSV)', 'Weight and measurements by date.'),
];

/// "Download my data" (Profile): save a copy of the account's data.
/// Weights are in kg and lengths in cm in every file.
class DataExport extends StatefulWidget {
  const DataExport({super.key, this.save});

  /// Where a file goes (tests); by default the system's "save as".
  final Future<String?> Function(String fileName, Uint8List bytes)? save;

  @override
  State<DataExport> createState() => _DataExportState();
}

class _DataExportState extends State<DataExport> {
  String? _busy;
  String? _done;
  String? _error;

  Future<String?> _saveFile(String fileName, Uint8List bytes) async {
    final path = await FilePicker.platform.saveFile(dialogTitle: 'Save your FitGuide data', fileName: fileName, bytes: bytes);
    // Desktop only picks a place: the file is written here.
    if (path != null && !kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux)) await File(path).writeAsBytes(bytes);
    return path;
  }

  Future<void> _download(String path, String name, String ext) async {
    setState(() {
      _busy = path;
      _done = null;
      _error = null;
    });
    try {
      final bytes = await ApiClient.instance.download(path);
      final fileName = '$name-${localToday()}.$ext';
      final saved = await (widget.save ?? _saveFile)(fileName, bytes);
      if (mounted && saved != null) setState(() => _done = 'Saved $fileName.');
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not save the file. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('A copy of what FitGuide keeps about you. Weights are in kg and lengths in cm in every file.', style: fg(size: 14, color: AppColors.white70)),
        const SizedBox(height: 16),
        for (final (path, name, ext, title, text) in _downloads) ...[
          FgCard(
            color: AppColors.noirEclipse,
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: fg(size: 14, weight: FontWeight.w700)),
                  Text(text, style: fg(size: 12, color: AppColors.white70)),
                ]),
              ),
              const SizedBox(width: 12),
              Semantics(
                button: true,
                label: 'Download $title',
                excludeSemantics: true,
                child: FgButton(
                  label: 'Save',
                  icon: LucideIcons.download,
                  style: FgButtonStyle.secondary,
                  height: 40,
                  loading: _busy == path,
                  onPressed: _busy != null ? null : () => _download(path, name, ext),
                ),
              ),
            ]),
          ),
          const SizedBox(height: 8),
        ],
        if (_done != null) Semantics(liveRegion: true, child: Text(_done!, style: fg(size: 14, color: AppColors.limeLight))),
        if (_error != null) ErrorBox(_error!, compact: true),
      ],
    );
  }
}
