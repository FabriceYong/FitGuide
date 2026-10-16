import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';

class CreateProfilePage extends StatelessWidget {
  final VoidCallback onContinue;

  const CreateProfilePage({super.key, required this.onContinue});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 20),
            Text(
              "Create Your\nProfile",
              style: GoogleFonts.inter(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: AppColors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "Save your progress and access your plan on any device.",
              style: GoogleFonts.inter(
                fontSize: 14,
                color: AppColors.white70,
              ),
            ),
            const SizedBox(height: 40),

            // Profile Picture Placeholder
            Center(
              child: Stack(
                children: [
                   Container(
                     width: 100,
                     height: 100,
                     decoration: BoxDecoration(
                       shape: BoxShape.circle,
                       color: AppColors.obsidianWave,
                       border: Border.all(color: AppColors.limeLight, width: 2),
                     ),
                     child: Icon(Icons.person, size: 50, color: AppColors.white30),
                   ),
                   Positioned(
                     bottom: 0,
                     right: 0,
                     child: Container(
                       padding: const EdgeInsets.all(8),
                       decoration: const BoxDecoration(
                         color: AppColors.limeLight,
                         shape: BoxShape.circle,
                       ),
                       child: const Icon(Icons.camera_alt, size: 16, color: AppColors.noirEclipse),
                     ),
                   ),
                ],
              ),
            ),
            
            const SizedBox(height: 32),

            _buildTextField(label: 'Full Name', icon: Icons.person_outline, hint: 'Sarah Connor'),
            const SizedBox(height: 16),
            _buildTextField(label: 'Email', icon: Icons.email_outlined, hint: 'sarah@example.com'),
            const SizedBox(height: 16),
            _buildTextField(label: 'Password', icon: Icons.lock_outline, hint: '••••••••', isObscure: true),
            
            const SizedBox(height: 48), // Spacing for safe area/bottom button usually handled by parent container
            
            // Note: The main button is usually in the parent Onboarding screen, 
            // but if we want specific "Sign Up" action here, we can add it.
            // However, sticking to the flow, the "Continue" button in OnboardingScreen triggers navigation.
            // But this page feels like it needs a primary "Create Account" button. 
            // Let's add it here and call onContinue.
            
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onContinue,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.limeLight,
                  foregroundColor: AppColors.noirEclipse,
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                  elevation: 5,
                  shadowColor: AppColors.limeLight.withValues(alpha: 0.4),
                ),
                child: Text(
                  'CREATE ACCOUNT',
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: TextButton(
                onPressed: () {},
                child: RichText(
                  text: TextSpan(
                    text: 'Already have an account? ',
                    style: GoogleFonts.inter(color: AppColors.white70),
                    children: [
                      TextSpan(
                        text: 'Log In',
                        style: GoogleFonts.inter(
                          color: AppColors.limeLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
             const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required IconData icon,
    required String hint,
    bool isObscure = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.0,
            color: AppColors.white70,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppColors.obsidianWave,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.white30.withValues(alpha: 0.1)),
          ),
          child: TextField(
            obscureText: isObscure,
            style: GoogleFonts.inter(color: AppColors.white),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: GoogleFonts.inter(color: AppColors.white30),
              prefixIcon: Icon(icon, color: AppColors.white30),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            ),
          ),
        ),
      ],
    );
  }
}
