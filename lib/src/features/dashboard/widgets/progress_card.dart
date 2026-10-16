import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';

class ProgressCard extends StatelessWidget {
  const ProgressCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.obsidianWave,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'PROGRESS',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                  color: AppColors.white,
                ),
              ),
              Icon(Icons.more_horiz, color: AppColors.white30),
            ],
          ),
          const SizedBox(height: 8),
           Text(
            '15,160',
            style: GoogleFonts.inter(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: AppColors.white,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildCompactStat('STEPS', '5,440', 0.6, AppColors.limeLight, Icons.directions_run),
              _buildCompactStat('CALORIES', '482', 0.8, AppColors.royalNebula, Icons.local_fire_department),
              _buildCompactStat('EXERCISES', '57 MIN', 0.4, Colors.purpleAccent, Icons.timer),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCompactStat(String label, String value, double progress, Color color, IconData icon) {
    return Column(
      children: [
        SizedBox(
          height: 60,
          width: 60,
          child: Stack(
            children: [
              // Background Circle
              Positioned.fill(
                child: CircularProgressIndicator(
                  value: 1.0,
                  valueColor: AlwaysStoppedAnimation(AppColors.white30.withValues(alpha: 0.1)),
                  strokeWidth: 6,
                ),
              ),
              // Value Circle
              Positioned.fill(
                child: CircularProgressIndicator(
                  value: progress,
                  valueColor: AlwaysStoppedAnimation(color),
                  strokeWidth: 6,
                  strokeCap: StrokeCap.round,
                ),
              ),
              // Center Icon
              Center(
                child: Icon(
                  icon,
                  size: 24,
                  color: color,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: AppColors.white30,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.white,
          ),
        ),
      ],
    );
  }
}
