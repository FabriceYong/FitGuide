# FitGuide - Quick Reference Guide

## 🎨 Color Usage Guide

### When to Use Each Color

**Primary Accent - Lime Light (#EEFF00)**
```dart
AppColors.limeLight
```
Use for:
- Primary action buttons
- Selected states
- Active navigation items
- Success indicators
- Call-to-action elements

**Secondary Accent - Royal Nebula (#3E25F5)**
```dart
AppColors.royalNebula
```
Use for:
- Secondary buttons
- Alternative selections
- Premium features
- Accent elements
- Gradients with purple

**Background Colors**
```dart
AppColors.noirEclipse    // Main screens
AppColors.obsidianWave   // Cards, containers
AppColors.cardSurface    // Elevated surfaces
```

**Text Colors**
```dart
AppColors.white          // Primary text
AppColors.white90        // Body text
AppColors.white70        // Secondary text
AppColors.white50        // Disabled text
AppColors.white30        // Subtle text
AppColors.white10        // Dividers, borders
```

**Status Colors**
```dart
AppColors.success   // Green - Achievements, completed
AppColors.warning   // Yellow - Caution, notifications
AppColors.error     // Red - Errors, critical actions
AppColors.info      // Blue - Informational messages
```

---

## 🎭 Gradient Presets

### Using Predefined Gradients

```dart
// Primary gradient (Lime)
Container(
  decoration: BoxDecoration(
    gradient: AppColors.primaryGradient,
  ),
)

// Accent gradient (Blue to Purple)
Container(
  decoration: BoxDecoration(
    gradient: AppColors.accentGradient,
  ),
)

// Background gradient
Container(
  decoration: BoxDecoration(
    gradient: AppColors.backgroundGradient,
  ),
)

// Card gradient
Container(
  decoration: BoxDecoration(
    gradient: AppColors.cardGradient,
  ),
)
```

### Custom Gradients

```dart
// Horizontal gradient
LinearGradient(
  colors: [AppColors.limeLight, AppColors.royalNebula],
  begin: Alignment.centerLeft,
  end: Alignment.centerRight,
)

// Radial glow effect
RadialGradient(
  colors: [
    AppColors.limeLight.withValues(alpha: 0.3),
    Colors.transparent,
  ],
)
```

---

## 📝 Typography Guide

### Using Theme Text Styles

```dart
// Display - Large titles (57px, 900 weight)
Text('Welcome', style: Theme.of(context).textTheme.displayLarge)

// Display Medium (45px, 900 weight)
Text('Get Fit', style: Theme.of(context).textTheme.displayMedium)

// Display Small (36px, bold)
Text('Goals', style: Theme.of(context).textTheme.displaySmall)

// Headline Large (32px, bold)
Text('Dashboard', style: Theme.of(context).textTheme.headlineLarge)

// Headline Medium (28px, bold)
Text('Progress', style: Theme.of(context).textTheme.headlineMedium)

// Headline Small (24px, 600)
Text('Workouts', style: Theme.of(context).textTheme.headlineSmall)

// Title Large (22px, 600)
Text('Today\'s Plan', style: Theme.of(context).textTheme.titleLarge)

// Title Medium (16px, 600)
Text('Card Title', style: Theme.of(context).textTheme.titleMedium)

// Title Small (14px, 600)
Text('Section', style: Theme.of(context).textTheme.titleSmall)

// Body Large (16px, normal)
Text('Paragraph text', style: Theme.of(context).textTheme.bodyLarge)

// Body Medium (14px, normal)
Text('Description', style: Theme.of(context).textTheme.bodyMedium)

// Body Small (12px, normal)
Text('Caption', style: Theme.of(context).textTheme.bodySmall)

// Label Large (14px, bold, 1.2 spacing)
Text('BUTTON', style: Theme.of(context).textTheme.labelLarge)

// Label Medium (12px, bold, 1.0 spacing)
Text('TAG', style: Theme.of(context).textTheme.labelMedium)

// Label Small (10px, bold, 0.8 spacing)
Text('TINY', style: Theme.of(context).textTheme.labelSmall)
```

### Quick Text Examples

```dart
// Page title
Text(
  'Welcome Back',
  style: Theme.of(context).textTheme.displaySmall,
)

// Section header
Text(
  'TRAINING PLAN',
  style: Theme.of(context).textTheme.labelLarge,
)

// Body text
Text(
  'Track your fitness journey',
  style: Theme.of(context).textTheme.bodyMedium,
)
```

---

## 🔘 Button Styles

### Elevated Button (Primary)

```dart
ElevatedButton(
  onPressed: () {},
  child: Text('PRIMARY ACTION'),
)
// Automatically styled with lime gradient
```

### Outlined Button (Secondary)

```dart
OutlinedButton(
  onPressed: () {},
  child: Text('SECONDARY'),
)
// White border, transparent background
```

### Text Button (Tertiary)

```dart
TextButton(
  onPressed: () {},
  child: Text('Cancel'),
)
// Lime text, no background
```

### Custom Gradient Button

```dart
Container(
  decoration: BoxDecoration(
    gradient: AppColors.accentGradient,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: AppColors.royalNebula.withValues(alpha: 0.4),
        blurRadius: 20,
        offset: Offset(0, 8),
      ),
    ],
  ),
  child: Material(
    color: Colors.transparent,
    child: InkWell(
      onTap: () {},
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 20, horizontal: 32),
        child: Text(
          'CUSTOM BUTTON',
          style: GoogleFonts.inter(
            color: AppColors.white,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ),
    ),
  ),
)
```

---

## 🎴 Card Styles

### Standard Card

```dart
Card(
  child: Padding(
    padding: EdgeInsets.all(20),
    child: Column(
      children: [
        Text('Card Content'),
      ],
    ),
  ),
)
// Automatically styled with obsidianWave background
```

### Glassmorphic Card

```dart
Container(
  padding: EdgeInsets.all(20),
  decoration: BoxDecoration(
    gradient: AppColors.cardGradient,
    borderRadius: BorderRadius.circular(24),
    border: Border.all(
      color: AppColors.white10,
      width: 1,
    ),
  ),
  child: Text('Glass Card'),
)
```

### Glowing Card

```dart
Container(
  padding: EdgeInsets.all(20),
  decoration: BoxDecoration(
    color: AppColors.obsidianWave,
    borderRadius: BorderRadius.circular(24),
    border: Border.all(
      color: AppColors.limeLight,
      width: 2,
    ),
    boxShadow: [
      BoxShadow(
        color: AppColors.limeLight.withValues(alpha: 0.3),
        blurRadius: 20,
        offset: Offset(0, 8),
      ),
    ],
  ),
  child: Text('Glowing Card'),
)
```

---

## 📏 Spacing System

### Standard Padding Values

```dart
// Tiny
padding: EdgeInsets.all(8)

// Small
padding: EdgeInsets.all(12)

// Medium (default)
padding: EdgeInsets.all(16)

// Large
padding: EdgeInsets.all(24)

// Extra Large
padding: EdgeInsets.all(32)

// Huge
padding: EdgeInsets.all(48)
```

### Border Radius Standards

```dart
// Small
borderRadius: BorderRadius.circular(12)

// Medium (default)
borderRadius: BorderRadius.circular(16)

// Large
borderRadius: BorderRadius.circular(20)

// Extra Large
borderRadius: BorderRadius.circular(24)

// Pill shape
borderRadius: BorderRadius.circular(100)
```

---

## 🎬 Animation Examples

### Fade In Animation

```dart
class MyWidget extends StatefulWidget {
  @override
  State<MyWidget> createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: Duration(milliseconds: 300),
      vsync: this,
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _animation,
      child: Text('Fading In'),
    );
  }
}
```

### Animated Container

```dart
AnimatedContainer(
  duration: Duration(milliseconds: 300),
  curve: Curves.easeOutCubic,
  padding: EdgeInsets.all(isExpanded ? 32 : 16),
  decoration: BoxDecoration(
    color: isSelected ? AppColors.limeLight : AppColors.obsidianWave,
    borderRadius: BorderRadius.circular(isExpanded ? 24 : 16),
  ),
  child: Text('Animated'),
)
```

### Tween Animation Builder

```dart
TweenAnimationBuilder<double>(
  duration: Duration(milliseconds: 300),
  tween: Tween(begin: 0.0, end: isActive ? 1.0 : 0.0),
  builder: (context, value, child) {
    return Opacity(
      opacity: value,
      child: Transform.scale(
        scale: 0.8 + (value * 0.2),
        child: child,
      ),
    );
  },
  child: Icon(Icons.check),
)
```

---

## 🎯 Common Patterns

### Selectable Card Pattern

```dart
GestureDetector(
  onTap: () => onSelect(item),
  child: AnimatedContainer(
    duration: Duration(milliseconds: 300),
    padding: EdgeInsets.all(20),
    decoration: BoxDecoration(
      gradient: isSelected ? AppColors.cardGradient : null,
      color: isSelected ? null : AppColors.obsidianWave,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(
        color: isSelected ? AppColors.limeLight : AppColors.white10,
        width: isSelected ? 2 : 1,
      ),
      boxShadow: isSelected ? [
        BoxShadow(
          color: AppColors.limeLight.withValues(alpha: 0.2),
          blurRadius: 20,
          offset: Offset(0, 8),
        ),
      ] : null,
    ),
    child: Row(
      children: [
        // Icon
        Container(
          padding: EdgeInsets.all(12),
          decoration: BoxDecoration(
            gradient: isSelected ? AppColors.primaryGradient : null,
            color: isSelected ? null : AppColors.white10,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            Icons.check,
            color: isSelected ? AppColors.noirEclipse : AppColors.white30,
          ),
        ),
        SizedBox(width: 16),
        // Text
        Expanded(
          child: Text(
            'Option',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        // Indicator
        if (isSelected)
          Icon(Icons.check_circle, color: AppColors.limeLight),
      ],
    ),
  ),
)
```

### Glow Effect Pattern

```dart
Container(
  decoration: BoxDecoration(
    gradient: AppColors.primaryGradient,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: AppColors.limeLight.withValues(alpha: 0.4),
        blurRadius: 24,
        spreadRadius: 2,
        offset: Offset(0, 8),
      ),
    ],
  ),
  child: child,
)
```

### Loading Spinner Pattern

```dart
Center(
  child: SizedBox(
    width: 48,
    height: 48,
    child: CircularProgressIndicator(
      valueColor: AlwaysStoppedAnimation(AppColors.limeLight),
      strokeWidth: 4,
      strokeCap: StrokeCap.round,
    ),
  ),
)
```

---

## 💡 Pro Tips

### 1. Always Use Theme Colors
```dart
// ✅ Good
color: AppColors.limeLight

// ❌ Bad
color: Color(0xFFEEFF00)
```

### 2. Use Theme Text Styles
```dart
// ✅ Good
style: Theme.of(context).textTheme.titleLarge

// ❌ Bad
style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600)
```

### 3. Dispose Animation Controllers
```dart
// ✅ Always dispose
@override
void dispose() {
  _controller.dispose();
  super.dispose();
}
```

### 4. Use Const Constructors
```dart
// ✅ Good (better performance)
const EdgeInsets.all(16)

// ❌ Not ideal
EdgeInsets.all(16)
```

### 5. Standard Animation Duration
```dart
// ✅ Use 300ms for most interactions
duration: Duration(milliseconds: 300)
```

---

## 🎨 Design Checklist

When creating a new UI component:

- [ ] Uses theme colors from AppColors
- [ ] Uses theme text styles
- [ ] Follows spacing system (8, 12, 16, 24, 32, 48)
- [ ] Has proper border radius (12, 16, 20, 24)
- [ ] Includes animation (if interactive)
- [ ] Has proper touch target size (min 48x48)
- [ ] Disposes animation controllers
- [ ] Uses const constructors where possible
- [ ] Has good contrast ratio
- [ ] Provides visual feedback on interaction

---

## 📱 Responsive Guidelines

### Safe Area
Always wrap your content in SafeArea for proper spacing:

```dart
SafeArea(
  child: Padding(
    padding: EdgeInsets.all(24),
    child: content,
  ),
)
```

### Flexible Layouts
Use Expanded and Flexible for responsive designs:

```dart
Row(
  children: [
    Container(width: 60, height: 60),
    SizedBox(width: 16),
    Expanded(
      child: Text('Flexible content'),
    ),
  ],
)
```

---

## 🔍 Common Issues & Solutions

### Issue: Colors look different
**Solution:** Make sure to use AppColors, not hardcoded values

### Issue: Animation not disposing
**Solution:** Always call _controller.dispose() in dispose()

### Issue: Text not styled correctly
**Solution:** Use Theme.of(context).textTheme instead of custom TextStyle

### Issue: Layout overflow
**Solution:** Wrap in SingleChildScrollView or use Flexible/Expanded

### Issue: Button not using theme
**Solution:** Use ElevatedButton, OutlinedButton, or TextButton (automatically themed)

---

## 📚 Additional Resources

- Full details: `UI_IMPROVEMENTS_SUMMARY.md`
- Completion report: `MODERNIZATION_COMPLETE.md`
- Flutter docs: https://docs.flutter.dev
- Material 3: https://m3.material.io

---

**Quick Reference Version:** 1.0
**Last Updated:** 2026-06-18
