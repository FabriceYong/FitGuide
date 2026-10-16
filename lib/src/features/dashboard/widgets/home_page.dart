import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';
import '../../workout/screens/workout_details_screen.dart';
import 'progress_card.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                         'Hello, Sarah', // Placeholder
                         style: GoogleFonts.inter(
                           fontSize: 14,
                           color: AppColors.white70,
                         ),
                      ),
                      Text(
                        'Ready to train?',
                        style: GoogleFonts.inter(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: AppColors.white,
                        ),
                      ),
                    ],
                  ),
                   CircleAvatar(
                    backgroundColor: AppColors.obsidianWave,
                    radius: 24,
                    child: Icon(Icons.person, color: AppColors.white),
                   ),
                ],
              ),
              
              const SizedBox(height: 32),
              const ProgressCard(),
              
              const SizedBox(height: 32),
              
              // Training Plan Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'TRAINING PLAN',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                      color: AppColors.white,
                    ),
                  ),
                  Text(
                     'Today',
                     style: GoogleFonts.inter(
                       fontSize: 14,
                       color: AppColors.limeLight,
                     ),
                  )
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Mock Training Item 1
              _buildTrainingItem(
                context,
                'Core with Sarah',
                '45 Min',
                Colors.purple,
              ),
               const SizedBox(height: 12),
               // Mock Training Item 2
              _buildTrainingItem(
                context,
                'Yoga Flow',
                '30 Min',
                AppColors.royalNebula,
              ),

              const SizedBox(height: 32),
              
              // Featured Section
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                 decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.royalNebula,
                      AppColors.royalNebula.withValues(alpha: 0.6),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                     Container(
                       padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                       decoration: BoxDecoration(
                         color: Colors.black.withValues(alpha: 0.3),
                         borderRadius: BorderRadius.circular(20),
                       ),
                       child: Text(
                         'FitGuide+',
                         style: GoogleFonts.inter(
                           fontSize: 12,
                           fontWeight: FontWeight.bold,
                           color: AppColors.limeLight,
                         ),
                       ),
                     ),
                     const SizedBox(height: 16),
                     Text(
                       'Smarter Approach\nto Health',
                       style: GoogleFonts.inter(
                         fontSize: 24,
                         fontWeight: FontWeight.bold,
                         color: AppColors.white,
                       ),
                     ),
                     const SizedBox(height: 8),
                     Text(
                       'Integrate fitness and\nnutrition management.',
                       style: GoogleFonts.inter(
                         fontSize: 14,
                         color: AppColors.white70,
                       ),
                     ),
                  ],
                ),
              ),
              const SizedBox(height: 100), // Bottom padding
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildTrainingItem(BuildContext context, String title, String duration, Color color) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => WorkoutDetailsScreen(
            heroTag: 'workout_$title',
            color: color,
          )),
        );
      },
      child: Container(
       padding: const EdgeInsets.all(16),
       decoration: BoxDecoration(
         color: AppColors.obsidianWave,
         borderRadius: BorderRadius.circular(16),
       ),
       child: Row(
         children: [
           Hero(
             tag: 'workout_$title',
             child: Container(
               width: 50,
               height: 50,
               decoration: BoxDecoration(
                 color: color,
                 borderRadius: BorderRadius.circular(12),
               ),
               child: const Icon(Icons.fitness_center, color: AppColors.white),
             ),
           ),
           const SizedBox(width: 16),
           Column(
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
               Text(
                 duration,
                 style: GoogleFonts.inter(
                   fontSize: 12,
                   color: AppColors.white70,
                 ),
               ),
             ],
           ),
           const Spacer(),
           const Icon(Icons.play_circle_fill, color: AppColors.white, size: 32),
         ],
       ),
      ),
    );
  }
}
