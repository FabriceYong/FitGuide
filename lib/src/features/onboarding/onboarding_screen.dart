import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/welcome_page.dart';
import 'widgets/goal_selection_page.dart';
import 'widgets/weight_selection_page.dart';
import 'widgets/diet_selection_page.dart';
import 'widgets/create_profile_page.dart';
import '../dashboard/dashboard_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with SingleTickerProviderStateMixin {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  String? _selectedGoal;
  String? _selectedDiet;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
    _animationController.forward();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage == 1 && _selectedGoal == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Please select a fitness goal to continue',
            style: GoogleFonts.inter(fontWeight: FontWeight.w600),
          ),
          backgroundColor: AppColors.warning,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          margin: const EdgeInsets.all(16),
        ),
      );
      return;
    }

    if (_currentPage < 4) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOutCubic,
      );
    }
  }

  void _finishOnboarding() {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            const DashboardScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          const begin = Offset(1.0, 0.0);
          const end = Offset.zero;
          const curve = Curves.easeInOutCubic;
          var tween = Tween(
            begin: begin,
            end: end,
          ).chain(CurveTween(curve: curve));
          var offsetAnimation = animation.drive(tween);
          return SlideTransition(position: offsetAnimation, child: child);
        },
        transitionDuration: const Duration(milliseconds: 500),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Animated Background Gradient
          AnimatedContainer(
            duration: const Duration(milliseconds: 800),
            curve: Curves.easeInOut,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.noirEclipse,
                  _currentPage == 0
                      ? AppColors.royalNebula.withValues(alpha: 0.1)
                      : _currentPage == 1
                      ? AppColors.limeLight.withValues(alpha: 0.05)
                      : _currentPage == 2
                      ? AppColors.purpleGlow.withValues(alpha: 0.08)
                      : _currentPage == 3
                      ? AppColors.blueGlow.withValues(alpha: 0.06)
                      : AppColors.pinkGlow.withValues(alpha: 0.07),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),

          // Dynamic Animated Glow Effects
          Positioned(
            top: -150 + (_currentPage * 30.0),
            left: -100 + (_currentPage * 20.0),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 800),
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    _currentPage == 0
                        ? AppColors.royalNebula.withValues(alpha: 0.3)
                        : _currentPage == 1
                        ? AppColors.limeLight.withValues(alpha: 0.2)
                        : _currentPage == 2
                        ? AppColors.purpleGlow.withValues(alpha: 0.25)
                        : _currentPage == 3
                        ? AppColors.blueGlow.withValues(alpha: 0.2)
                        : AppColors.pinkGlow.withValues(alpha: 0.25),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          Positioned(
            bottom: -120 - (_currentPage * 15.0),
            right: -80 + (_currentPage * 25.0),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 800),
              width: 350,
              height: 350,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.limeLight.withValues(alpha: 0.15),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Page View
          PageView(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentPage = index;
              });
              _animationController.reset();
              _animationController.forward();
            },
            physics: const NeverScrollableScrollPhysics(),
            children: [
              FadeTransition(
                opacity: _fadeAnimation,
                child: const WelcomePage(),
              ),
              FadeTransition(
                opacity: _fadeAnimation,
                child: GoalSelectionPage(
                  selectedGoal: _selectedGoal,
                  onGoalSelected: (goal) {
                    setState(() {
                      _selectedGoal = goal;
                    });
                  },
                ),
              ),
              FadeTransition(
                opacity: _fadeAnimation,
                child: WeightSelectionPage(
                  onWeightSelected: (weight) {
                    // Handle weight update
                  },
                ),
              ),
              FadeTransition(
                opacity: _fadeAnimation,
                child: DietSelectionPage(
                  selectedDiet: _selectedDiet,
                  onDietSelected: (diet) {
                    setState(() {
                      _selectedDiet = diet;
                    });
                  },
                ),
              ),
              FadeTransition(
                opacity: _fadeAnimation,
                child: CreateProfilePage(onContinue: _finishOnboarding),
              ),
            ],
          ),

          // Page Indicators
          if (_currentPage < 4)
            Positioned(
              top: 60,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      5,
                      (index) => AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        height: 4,
                        width: _currentPage == index ? 32 : 8,
                        decoration: BoxDecoration(
                          color: _currentPage == index
                              ? AppColors.limeLight
                              : AppColors.white30,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),

          // Floating Button Positioned at Bottom
          if (_currentPage < 4)
            Positioned(
              bottom: 40,
              left: 24,
              right: 24,
              child: SafeArea(
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: _nextPage,
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 20),
                        decoration: BoxDecoration(
                          gradient: _currentPage == 0
                              ? AppColors.accentGradient
                              : LinearGradient(
                                  colors: [
                                    AppColors.limeLight,
                                    AppColors.limeLightDark,
                                  ],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color:
                                  (_currentPage == 0
                                          ? AppColors.royalNebula
                                          : AppColors.limeLight)
                                      .withValues(alpha: 0.4),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            _currentPage == 0 ? 'GET STARTED' : 'CONTINUE',
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              letterSpacing: 1.0,
                              color: _currentPage == 0
                                  ? AppColors.white
                                  : AppColors.noirEclipse,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
