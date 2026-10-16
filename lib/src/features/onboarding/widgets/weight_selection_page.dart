import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';

class WeightSelectionPage extends StatefulWidget {
  final ValueChanged<double> onWeightSelected;

  const WeightSelectionPage({super.key, required this.onWeightSelected});

  @override
  State<WeightSelectionPage> createState() => _WeightSelectionPageState();
}

class _WeightSelectionPageState extends State<WeightSelectionPage> {
  int _selectedWeight = 70; // kg default

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          const SizedBox(height: 60),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Text(
              "What's Your\nDesired Weight?",
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppColors.white,
              ),
            ),
          ),
           const SizedBox(height: 8),
            Text(
              'METRIC',
              style: GoogleFonts.inter(
                  fontSize: 12, color: AppColors.limeLight, letterSpacing: 1.2),
            ),
          const Spacer(),
          
          // Weight Display
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
               Text(
                '$_selectedWeight',
                style: GoogleFonts.inter(
                  fontSize: 80,
                  fontWeight: FontWeight.bold,
                  color: AppColors.white,
                ),
              ),
              Text(
                ' kg',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w500,
                  color: AppColors.limeLight,
                ),
              ),
            ],
          ),

          const SizedBox(height: 40),

          // Custom Ruler
          SizedBox(
            height: 100,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: 151, // 0 to 150kg
              controller: ScrollController(initialScrollOffset: (70 - 2) * 50.0), // Approximate centering logic (needs refinement for perfect center)
              physics: const BouncingScrollPhysics(),
              itemBuilder: (context, index) {
                final weight = index;
                // We want the center item to be selected. 
                // For a real app, we'd use a NotificationListener on scroll.
                // For this MVP, we'll just allow tapping or dragging, but let's make it simple: 
                // A static list isn't interactive enough.
                // Let's implement a simple interactive version.
                
                final isMajor = weight % 5 == 0;

                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedWeight = weight;
                      widget.onWeightSelected(weight.toDouble());
                    });
                  },
                  child: Container(
                    width: 50, // width per tick
                     alignment: Alignment.bottomCenter,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          height: isMajor ? 40 : 20,
                          width: 2,
                          color: _selectedWeight == weight ? AppColors.limeLight : AppColors.white30,
                        ),
                         if (isMajor) ...[
                          const SizedBox(height: 8),
                          Text(
                            '$weight',
                             style: GoogleFonts.inter(
                                fontSize: 12,
                                color: _selectedWeight == weight ? AppColors.limeLight : AppColors.white30,
                             ),
                          )
                         ]
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          
          const Spacer(),
          const SizedBox(height: 100), // Space for button
        ],
      ),
    );
  }
}
