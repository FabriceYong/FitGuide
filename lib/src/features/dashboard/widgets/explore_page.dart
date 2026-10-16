import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';
 
// For now, I will implement a standalone simple card or reuse logic if I extract it.
// To keep it simple and self-contained, I'll implement local widgets.

class ExplorePage extends StatelessWidget {
  const ExplorePage({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Text(
                'Explore',
                style: GoogleFonts.inter(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: AppColors.white,
                ),
              ),
              const SizedBox(height: 24),

              // Search Bar
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.obsidianWave,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.white30.withValues(alpha: 0.1)),
                ),
                child: TextField(
                  style: GoogleFonts.inter(color: AppColors.white),
                  decoration: InputDecoration(
                    hintText: 'Search workouts, trainers...',
                    hintStyle: GoogleFonts.inter(color: AppColors.white30),
                    border: InputBorder.none,
                    icon: const Icon(Icons.search, color: AppColors.white30),
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Categories
              Text(
                'Browse by Category',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.white,
                ),
              ),
              const SizedBox(height: 16),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildCategoryChip('HIIT', Icons.timer, AppColors.limeLight),
                    const SizedBox(width: 12),
                    _buildCategoryChip('Yoga', Icons.self_improvement, AppColors.royalNebula),
                    const SizedBox(width: 12),
                    _buildCategoryChip('Strength', Icons.fitness_center, Colors.purpleAccent),
                    const SizedBox(width: 12),
                    _buildCategoryChip('Cardio', Icons.directions_run, Colors.orangeAccent),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Popular Workouts
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Popular Workouts',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.white,
                    ),
                  ),
                  Text(
                    'See All',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppColors.limeLight,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              _buildExploreCard(
                'Full Body Crush',
                '45 Min • High Intensity',
                'https://i.imgur.com/placeholder.jpg', // Placeholder
                Colors.pinkAccent,
              ),
              const SizedBox(height: 16),
              _buildExploreCard(
                'Morning Zen',
                '20 Min • Low Intensity',
                'https://i.imgur.com/placeholder.jpg',
                Colors.tealAccent,
              ),
               const SizedBox(height: 16),
              _buildExploreCard(
                'Abs Blaster',
                '15 Min • High Intensity',
                'https://i.imgur.com/placeholder.jpg',
                Colors.redAccent,
              ),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryChip(String label, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.obsidianWave,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.white30.withValues(alpha: 0.1)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 8),
          Text(
            label,
            style: GoogleFonts.inter(
              color: AppColors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExploreCard(String title, String subtitle, String imageUrl, Color accentColor) {
    return Container(
      height: 160,
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.obsidianWave,
        borderRadius: BorderRadius.circular(24),
      ),
      // For now, using a solid color gradient or patterns since we don't have real images
      child: Stack(
        children: [
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: LinearGradient(
                  colors: [
                    accentColor.withValues(alpha: 0.2),
                    Colors.transparent,
                  ],
                  begin: Alignment.bottomLeft,
                  end: Alignment.topRight,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                   decoration: BoxDecoration(
                    color: AppColors.noirEclipse.withValues(alpha: 0.5),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.play_arrow, color: accentColor),
                ),
                const SizedBox(height: 12),
                Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.white,
                  ),
                ),
                Text(
                  subtitle,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: AppColors.white70,
                  ),
                ),
              ],
            ),
          ),
          Positioned(
             top: 20,
             right: 20,
             child: Icon(Icons.bookmark_border, color: AppColors.white70),
          )
        ],
      ),
    );
  }
}
