import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';

class GoalSelectionPage extends StatelessWidget {
  final ValueChanged<String> onGoalSelected;
  final String? selectedGoal;

  const GoalSelectionPage({
    super.key,
    required this.onGoalSelected,
    this.selectedGoal,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Spacer(),

            // Title
            Text(
              "What's Your\nFitness Goal?",
              style: GoogleFonts.inter(
                fontSize: 36,
                fontWeight: FontWeight.w900,
                color: AppColors.white,
                height: 1.2,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 12),

            // Subtitle with accent
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.limeLight.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: AppColors.limeLight.withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
              child: Text(
                'SELECT ONE TO CONTINUE',
                style: GoogleFonts.inter(
                  fontSize: 11,
                  color: AppColors.limeLight,
                  letterSpacing: 1.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 48),

            // Goal Cards with enhanced design
            _buildGoalCard(
              'Vitality',
              'Better health & stay healthy',
              'Focus on overall wellness and energy',
              selectedGoal == 'Vitality',
              Icons.favorite,
              AppColors.error,
            ),
            const SizedBox(height: 16),
            _buildGoalCard(
              'Muscle',
              'Gain mass & strength',
              'Build lean muscle and power',
              selectedGoal == 'Muscle',
              Icons.fitness_center,
              AppColors.royalNebula,
            ),
            const SizedBox(height: 16),
            _buildGoalCard(
              'Weight',
              'Lose fat and get lean',
              'Achieve your target body composition',
              selectedGoal == 'Weight',
              Icons.monitor_weight,
              AppColors.limeLight,
            ),

            const SizedBox(height: 100), // Space for button
          ],
        ),
      ),
    );
  }

  Widget _buildGoalCard(
    String title,
    String subtitle,
    String description,
    bool isSelected,
    IconData icon,
    Color accentColor,
  ) {
    return TweenAnimationBuilder<double>(
      duration: const Duration(milliseconds: 300),
      tween: Tween<double>(begin: 0.0, end: isSelected ? 1.0 : 0.0),
      builder: (context, value, child) {
        return GestureDetector(
          key: Key('goal_$title'),
          onTap: () => onGoalSelected(title),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutCubic,
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: isSelected
                  ? LinearGradient(
                      colors: [AppColors.cardSurface, AppColors.obsidianWave],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : null,
              color: isSelected
                  ? null
                  : AppColors.obsidianWave.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: isSelected ? accentColor : AppColors.white10,
                width: isSelected ? 2 : 1,
              ),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: accentColor.withValues(alpha: 0.2),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ]
                  : null,
            ),
            child: Row(
              children: [
                // Icon with gradient background
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    gradient: isSelected
                        ? LinearGradient(
                            colors: [accentColor, accentColor.withValues(alpha: 0.7)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          )
                        : null,
                    color: isSelected ? null : AppColors.white10,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: accentColor.withValues(alpha: 0.3),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ]
                        : null,
                  ),
                  child: Icon(
                    icon,
                    color: isSelected
                        ? (accentColor == AppColors.limeLight
                              ? AppColors.noirEclipse
                              : AppColors.white)
                        : AppColors.white30,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),

                // Text Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.white,
                          letterSpacing: 0.2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: AppColors.white70,
                          height: 1.3,
                        ),
                      ),
                      if (isSelected) ...[
                        const SizedBox(height: 6),
                        Text(
                          description,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: accentColor,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),

                // Selection Indicator
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: isSelected ? accentColor : Colors.transparent,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected ? accentColor : AppColors.white30,
                      width: 2,
                    ),
                  ),
                  child: isSelected
                      ? Icon(
                          Icons.check,
                          color: accentColor == AppColors.limeLight
                              ? AppColors.noirEclipse
                              : AppColors.white,
                          size: 18,
                        )
                      : null,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
