import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';

class ProgressPage extends StatelessWidget {
  const ProgressPage({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Your Progress',
                style: GoogleFonts.inter(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: AppColors.white,
                ),
              ),
              const SizedBox(height: 32),

              // Weekly Activity Chart Container
              Container(
                padding: const EdgeInsets.all(24),
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
                          'Weekly Activity',
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.white,
                          ),
                        ),
                        Text(
                          'Last 7 Days',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppColors.white30,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    // Custom Bar Chart Implementation
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        _buildBar('Mon', 0.4),
                        _buildBar('Tue', 0.6),
                        _buildBar('Wed', 0.8, isActive: true),
                        _buildBar('Thu', 0.3),
                        _buildBar('Fri', 0.7),
                        _buildBar('Sat', 0.5),
                        _buildBar('Sun', 0.2),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              Text(
                'Statistics',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.white,
                ),
              ),
              const SizedBox(height: 16),

              // Stats Grid
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1.5,
                children: [
                  _buildStatCard('Weight', '72 kg', '-2.1%', Icons.monitor_weight, AppColors.royalNebula),
                  _buildStatCard('Sleep', '7h 30m', '+5%', Icons.bed, Colors.purpleAccent),
                  _buildStatCard('Heart Rate', '72 bpm', 'Avg', Icons.favorite, Colors.redAccent),
                  _buildStatCard('Calories', '2,400', 'Daily', Icons.local_fire_department, Colors.orangeAccent),
                ],
              ),
              
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBar(String label, double heightFactor, {bool isActive = false}) {
    return Column(
      children: [
        Container(
          height: 150 * heightFactor,
          width: 12,
          decoration: BoxDecoration(
            color: isActive ? AppColors.limeLight : AppColors.white30.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(6),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            color: isActive ? AppColors.white : AppColors.white30,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, String subtitle, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.obsidianWave,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 20),
              Text(
                subtitle,
                style: GoogleFonts.inter(
                  fontSize: 10,
                  color: color == Colors.redAccent || subtitle.startsWith('-') 
                      ? Colors.greenAccent // Positive reinforcement for weight loss or just general success color
                      : AppColors.white30,
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.white,
                ),
              ),
               Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: AppColors.white70,
                ),
              ),
            ],
          )
        ],
      ),
    );
  }
}
