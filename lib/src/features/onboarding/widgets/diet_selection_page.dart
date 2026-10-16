import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';

class DietSelectionPage extends StatelessWidget {
  final ValueChanged<String> onDietSelected;
  final String? selectedDiet;

  const DietSelectionPage({
    super.key,
    required this.onDietSelected,
    this.selectedDiet,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 40),
            Text(
              "What's Your\nDiet Type?",
              style: GoogleFonts.inter(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: AppColors.white,
              ),
            ),
             const SizedBox(height: 24),
             
             Expanded(
               child: ListView(
                 children: [
                   _buildDietOption('Keto Diet', 'Low carb, high fat, burns fat for energy', Icons.whatshot),
                   const SizedBox(height: 16),
                   _buildDietOption('Mediterranean Diet', 'Whole foods, healthy fats, lean protein', Icons.waves),
                   const SizedBox(height: 16),
                   _buildDietOption('Paleo Diet', 'Natural foods, no grains, no dairy', Icons.grass),
                   const SizedBox(height: 16),
                   _buildDietOption('Intermittent Fasting', 'Alternates fasting and eating periods', Icons.timer),
                 ],
               ),
             ),
            
            const SizedBox(height: 80), // Space for button
          ],
        ),
      ),
    );
  }

  Widget _buildDietOption(String title, String subtitle, IconData icon) {
    final isSelected = selectedDiet == title;
    return GestureDetector(
      onTap: () => onDietSelected(title),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.obsidianWave : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
             color: isSelected ? AppColors.limeLight : AppColors.white30,
             width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
             // Placeholder for Image/Icon
             Container(
               width: 40, 
               height: 40,
               decoration: BoxDecoration(
                 color: isSelected ? AppColors.limeLight : AppColors.white30,
                 shape: BoxShape.circle,
               ),
               child: Icon(icon, color: isSelected ? Colors.black : AppColors.white, size: 20),
             ),
             const SizedBox(width: 16),
             Expanded(
               child: Column(
                 crossAxisAlignment: CrossAxisAlignment.start,
                 children: [
                   Text(
                     title,
                     style: GoogleFonts.inter(
                       fontSize: 16,
                       fontWeight: FontWeight.bold,
                       color: AppColors.white,
                     ),
                   ),
                   const SizedBox(height: 4),
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
             if (isSelected)
                const Icon(Icons.check_circle, color: AppColors.limeLight, size: 20),
          ],
        ),
      ),
    );
  }
}
