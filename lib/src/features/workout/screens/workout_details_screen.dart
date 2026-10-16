import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';

class WorkoutDetailsScreen extends StatelessWidget {
  final String heroTag;
  final Color color;

  const WorkoutDetailsScreen({
    super.key,
    required this.heroTag,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.noirEclipse,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Video Placeholder Area
            Stack(
              children: [
                Hero(
                  tag: heroTag,
                  child: Container(
                    height: 400,
                    width: double.infinity,
                    color: color.withValues(alpha: 0.2), // Use passed color for tint
                    // TODO: Add actual image asset here
                    child: Center(
                      child: Icon(Icons.play_circle_fill, 
                        size: 64, 
                        color: AppColors.white.withValues(alpha: 0.5)
                      ),
                    ),
                  ),
                ),
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back, color: AppColors.white),
                          onPressed: () => Navigator.pop(context),
                        ),
                        IconButton(
                          icon: const Icon(Icons.favorite_border, color: AppColors.white),
                          onPressed: () {},
                        ),
                      ],
                    ),
                  ),
                ),
                // Tags Overlay
                Positioned(
                  bottom: 24,
                  left: 24,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                       Text(
                        'YOGA WITH SARAH',
                        style: GoogleFonts.inter(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: AppColors.white,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _buildTag('MUSCLE', AppColors.royalNebula),
                          const SizedBox(width: 8),
                          _buildTag('STRETCHING', Colors.purpleAccent),
                          const SizedBox(width: 8),
                          _buildTag('LOWER BODY', AppColors.limeLight, textColor: AppColors.noirEclipse),
                        ],
                      )
                    ],
                  ),
                )
              ],
            ),
            
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Stats Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildStat('AVG. TIME', '25 MIN'),
                      _buildStat('LEVEL', 'BEGINNER'),
                      _buildStat('INTENSITY', 'LOW', color: AppColors.limeLight),
                    ],
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // Description
                  Row(
                    children: [
                      Container(
                        width: 4,
                        height: 40,
                        color: AppColors.limeLight,
                      ),
                      const SizedBox(width: 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'THE PIGEON POSE',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.white,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'This pose involves bringing one knee forward to the corresponding wrist, extending the opposite leg back, and leaning forward for a deep stretch in the hips, thighs, and glutes.',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      height: 1.6,
                      color: AppColors.white70,
                    ),
                  ),
                  
                  const SizedBox(height: 48),
                  
                  // Action Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.limeLight,
                        foregroundColor: AppColors.noirEclipse,
                        padding: const EdgeInsets.symmetric(vertical: 20),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: Text(
                        "LET'S BEGIN",
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTag(String text, Color color, {Color textColor = AppColors.white}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: color == AppColors.limeLight ? 1.0 : 0.8), 
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildStat(String label, String value, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
            color: color ?? AppColors.white,
          ),
        ),
      ],
    );
  }
}
