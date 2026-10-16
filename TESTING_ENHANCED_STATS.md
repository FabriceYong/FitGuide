# Testing Guide: Enhanced Stats Cards with Recharts

## Quick Start Testing

### 1. Start the Development Server
```bash
cd fitguide_web
npm run dev
```

The app should start on `http://localhost:5173`

### 2. Visual Verification Checklist

#### Stats Cards Section (4 cards grid)
Navigate to the Home tab and verify:

**Card 1: Total Workouts (Area Chart)**
- [ ] Shows "47" as the main value
- [ ] Displays "+12%" with green upward arrow
- [ ] Shows "vs last month" comparison text
- [ ] Area chart with lime gradient fill is visible
- [ ] Progress bar shows 94% (47/50)
- [ ] Icon has lime-light colored background with glow
- [ ] Hover effect scales the icon smoothly

**Card 2: Minutes This Week (Line Chart)**
- [ ] Shows "320 min" as the main value
- [ ] Displays "+8%" with green upward arrow
- [ ] Line chart with royal-nebula color is visible
- [ ] Progress bar shows 91% (320/350)
- [ ] Icon has royal-nebula colored background
- [ ] Chart line is smooth and clean

**Card 3: Calories Today (Bar Chart)**
- [ ] Shows "1240 cal" as the main value
- [ ] Displays "-3%" with red downward arrow
- [ ] Bar chart with red bars is visible
- [ ] Progress bar shows 83% (1240/1500)
- [ ] Icon has red colored background
- [ ] Bars have rounded tops

**Card 4: Current Streak (Area Chart)**
- [ ] Shows "12 days" as the main value
- [ ] Area chart with green gradient is visible
- [ ] Progress bar shows 40% (12/30)
- [ ] Shows "vs best" comparison text
- [ ] Icon has green colored background
- [ ] Gradient fade looks smooth

#### Weekly Activity Card
- [ ] Full-width card below the 4-stat grid
- [ ] Title reads "Weekly Activity"
- [ ] Subtitle reads "Last 7 Days"
- [ ] 7 bars visible (Mon-Sun)
- [ ] Wednesday bar is tallest (80)
- [ ] All bars have lime-light color
- [ ] Day labels visible below chart
- [ ] Bars have rounded tops

### 3. Responsive Design Testing

#### Desktop (1920×1080)
- [ ] 4 cards in a single row
- [ ] Cards have equal width
- [ ] Spacing is consistent
- [ ] Charts are clearly visible
- [ ] No overflow or clipping

#### Tablet (768×1024)
- [ ] 2 cards per row (2 rows of 2)
- [ ] Cards maintain aspect ratio
- [ ] Charts remain legible
- [ ] Progress bars still visible

#### Mobile (375×812)
- [ ] 1 card per column (4 rows)
- [ ] Cards stack vertically
- [ ] Charts scale appropriately
- [ ] Touch targets are adequate
- [ ] No horizontal scrolling

### 4. Animation Testing

#### Chart Animations
- [ ] Refresh the page
- [ ] Charts should animate from 0 to full value
- [ ] Animation takes ~1 second
- [ ] Animation is smooth, not choppy

#### Progress Bar Animations
- [ ] Progress bars should fill from left to right
- [ ] Animation duration is ~1 second
- [ ] Color gradient is visible during animation

#### Hover Effects
- [ ] Hover over each card
- [ ] Border should brighten on hover
- [ ] Shadow should appear on hover
- [ ] Icon should scale slightly larger
- [ ] Transitions are smooth

### 5. Color Integration Testing

#### Dynamic Color from Hero Carousel
- [ ] Stay on Home tab
- [ ] Wait for hero carousel to change slides
- [ ] Logo color should transition to match hero
- [ ] Active tab color should transition to match hero
- [ ] "Start Workout" button color should transition
- [ ] Transition takes ~1 second
- [ ] Transition is smooth, not jarring

**Note:** Stats cards use fixed colors, not dynamic hero colors. This is intentional for data visualization clarity.

### 6. Browser Compatibility Testing

Test in multiple browsers:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### 7. Performance Testing

#### Rendering Performance
- [ ] Open DevTools Performance tab
- [ ] Record while navigating to Home tab
- [ ] Chart rendering should take < 100ms
- [ ] No significant frame drops
- [ ] Smooth 60fps animations

#### Memory Usage
- [ ] Open DevTools Memory tab
- [ ] Navigate between tabs multiple times
- [ ] No memory leaks
- [ ] Memory usage stays stable

### 8. Console Error Checking

#### Browser Console
- [ ] Open DevTools Console (F12)
- [ ] Navigate to Home tab
- [ ] **No errors should appear**
- [ ] **No warnings about Recharts**
- [ ] Verify all charts render successfully

Common errors to watch for:
- "Cannot read property 'x' of undefined"
- "Recharts: prop type validation failed"
- "Invalid prop 'data' supplied to..."

### 9. Data Validation

#### Verify Correct Data Display
Check each card shows:

**Total Workouts:**
- Value: 47
- Change: +12%
- Data: [30, 35, 38, 42, 44, 45, 47]
- Target: 50

**Minutes This Week:**
- Value: 320 min
- Change: +8%
- Data: [280, 290, 295, 300, 305, 315, 320]
- Target: 350

**Calories Today:**
- Value: 1240 cal
- Change: -3%
- Data: [1100, 1150, 1200, 1180, 1220, 1260, 1240]
- Target: 1500

**Current Streak:**
- Value: 12 days
- Data: [5, 6, 7, 8, 9, 10, 11, 12]
- Target: 30

**Weekly Activity:**
- Mon: 45
- Tue: 60
- Wed: 80
- Thu: 35
- Fri: 70
- Sat: 55
- Sun: 40

### 10. Visual Polish Verification

#### Design System Consistency
- [ ] Font is Poppins throughout
- [ ] Colors match theme:
  - Lime Light: #EEFF00
  - Royal Nebula: #3E25F5
  - Noir Eclipse: #0a0a0f
  - Red: #EF4444
  - Green: #10B981
- [ ] Border radius is consistent (rounded-2xl)
- [ ] Shadows are subtle and professional
- [ ] Spacing follows grid system

#### Typography
- [ ] Main value is large and bold (text-4xl)
- [ ] Labels are uppercase and small (text-xs)
- [ ] Percentage changes are clearly visible
- [ ] All text is readable with good contrast

#### Visual Hierarchy
- [ ] Icon → Value → Label flow is clear
- [ ] Charts don't overpower the statistics
- [ ] Progress bars are subtle but visible
- [ ] Trend indicators are noticeable

## Common Issues & Solutions

### Issue: Charts not rendering
**Solution:**
1. Check browser console for errors
2. Verify Recharts is installed: `npm list recharts`
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue: Animations are choppy
**Solution:**
1. Check CPU usage in DevTools
2. Reduce animation duration in EnhancedStatsCard.tsx
3. Disable other background processes

### Issue: Colors look wrong
**Solution:**
1. Verify Tailwind config has custom colors
2. Check if `color` prop is being passed correctly
3. Inspect element to see computed styles

### Issue: Layout breaks on mobile
**Solution:**
1. Check Tailwind responsive classes (md:, lg:)
2. Verify container padding is consistent
3. Test with DevTools device emulation

### Issue: Data not displaying
**Solution:**
1. Check HomeTab.tsx has sample data
2. Verify props are being passed to components
3. Console.log the data to verify structure

## Debugging Tools

### React DevTools
1. Install React DevTools browser extension
2. Inspect EnhancedStatsCard components
3. Check props are correct
4. Verify state updates

### Recharts Debugging
Add this to see chart data:
```typescript
console.log('Chart data:', chartData);
```

### CSS Debugging
Inspect elements to verify:
- Background colors
- Border styles
- Padding/margins
- Hover states

## Screenshot Checklist

Take screenshots of:
1. Full home page with all stats cards
2. Individual cards on hover
3. Weekly activity card
4. Mobile layout (portrait)
5. Tablet layout
6. Animation midpoint (if possible)

## Performance Benchmarks

Target metrics:
- **Initial render:** < 100ms
- **Chart animation:** 1000ms (smooth)
- **Hover transition:** < 300ms
- **Page load (total):** < 2s
- **FPS during animation:** 60fps
- **Memory usage:** < 50MB increase

## Sign-off Checklist

Before marking as complete:
- [ ] All visual elements render correctly
- [ ] No console errors or warnings
- [ ] Responsive design works on all screen sizes
- [ ] Animations are smooth and professional
- [ ] Data displays accurately
- [ ] Colors integrate with theme
- [ ] Hover effects work properly
- [ ] Charts are legible and attractive
- [ ] Performance is acceptable
- [ ] Code has no TypeScript errors

---

## Quick Test Command

```bash
# Install dependencies (if not already)
cd fitguide_web
npm install

# Start dev server
npm run dev

# Open in browser
# Navigate to http://localhost:5173
# Log in with test account
# Verify Home tab displays enhanced stats cards
```

**Status:** Ready for Testing ✅

**Last Updated:** July 1, 2026
