import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 20),
              // Profile Header
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.limeLight, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.limeLight.withValues(alpha: 0.2),
                      blurRadius: 20,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: const CircleAvatar(
                  radius: 50,
                  backgroundColor: AppColors.obsidianWave,
                  child: Icon(Icons.person, size: 50, color: AppColors.white),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Sarah Connor',
                style: GoogleFonts.inter(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppColors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Fitness Enthusiast • Member since 2024',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: AppColors.white70,
                ),
              ),
              
              const SizedBox(height: 48),

              // Settings Section
              _buildSectionHeader('Account'),
              const SizedBox(height: 16),
              _buildSettingItem('Edit Profile', Icons.edit),
              _buildSettingItem('Notifications', Icons.notifications),
              _buildSettingItem('Privacy', Icons.lock),
              
              const SizedBox(height: 32),
              _buildSectionHeader('More'),
              const SizedBox(height: 16),
              _buildSettingItem('Help & Support', Icons.help_outline),
              _buildSettingItem('About FitGuide', Icons.info_outline),
              
              const SizedBox(height: 48),
              
              // Logout Button
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () {},
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: AppColors.obsidianWave,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(color: Colors.redAccent.withValues(alpha: 0.5)),
                    ),
                  ),
                  child: Text(
                    'Log Out',
                    style: GoogleFonts.inter(
                      color: Colors.redAccent,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
              
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        title.toUpperCase(),
        style: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.2,
          color: AppColors.white30,
        ),
      ),
    );
  }

  Widget _buildSettingItem(String title, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.obsidianWave,
        borderRadius: BorderRadius.circular(16),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.noirEclipse,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: AppColors.white, size: 20),
        ),
        title: Text(
          title,
          style: GoogleFonts.inter(
            color: AppColors.white,
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
        trailing: const Icon(Icons.arrow_forward_ios, color: AppColors.white30, size: 14),
        onTap: () {},
      ),
    );
  }
}
