# Enhanced Stats Cards - Visual Reference Guide

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HOME TAB                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────┬────────────┬────────────┬────────────┐             │
│  │   Card 1   │   Card 2   │   Card 3   │   Card 4   │             │
│  │  Workouts  │  Minutes   │  Calories  │   Streak   │             │
│  └────────────┴────────────┴────────────┴────────────┘             │
│                                                                       │
│  ┌────────────────────────────────────────────────────┐             │
│  │           Weekly Activity Chart                     │             │
│  └────────────────────────────────────────────────────┘             │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Card 1: Total Workouts (Area Chart)

```
┌─────────────────────────────────────┐
│ 💪              ↑ +12%              │
│ [Lime Icon]     vs last month       │
│                                      │
│ 47              <-- Large & Bold    │
│ TOTAL WORKOUTS  <-- Small Uppercase │
│                                      │
│ Progress        94%                  │
│ [████████████████████░░] 47/50      │
│                                      │
│ [Area Chart with Lime Gradient]     │
│     /⎺⎺⎺⎺⎺⎺⎺\                        │
│   /⎺          ⎺⎺⎺\                  │
│ /⎺               ⎺⎺⎺\               │
│                                      │
└─────────────────────────────────────┘
Color: Lime Light (#EEFF00)
Data: [30, 35, 38, 42, 44, 45, 47]
```

---

## Card 2: Minutes This Week (Line Chart)

```
┌─────────────────────────────────────┐
│ ⏱️              ↑ +8%               │
│ [Blue Icon]                          │
│                                      │
│ 320 min         <-- Large & Bold    │
│ MINUTES THIS WEEK                    │
│                                      │
│ Progress        91%                  │
│ [████████████████████░░] 320/350    │
│                                      │
│ [Line Chart - Royal Nebula]         │
│           _____                      │
│       ___/                           │
│  ____/                               │
│                                      │
└─────────────────────────────────────┘
Color: Royal Nebula (#3E25F5)
Data: [280, 290, 295, 300, 305, 315, 320]
```

---

## Card 3: Calories Today (Bar Chart)

```
┌─────────────────────────────────────┐
│ 🔥              ↓ -3%               │
│ [Red Icon]                           │
│                                      │
│ 1240 cal        <-- Large & Bold    │
│ CALORIES TODAY                       │
│                                      │
│ Progress        83%                  │
│ [████████████████░░░░] 1240/1500    │
│                                      │
│ [Bar Chart - Red]                   │
│  █  █  █  █  █  █  █                │
│  █  █  █  █  █  █  █                │
│  █  █  █  █  █  █  █                │
│                                      │
└─────────────────────────────────────┘
Color: Red (#EF4444)
Data: [1100, 1150, 1200, 1180, 1220, 1260, 1240]
```

---

## Card 4: Current Streak (Area Chart)

```
┌─────────────────────────────────────┐
│ 🎯                                   │
│ [Green Icon]    vs best (15)        │
│                                      │
│ 12 days         <-- Large & Bold    │
│ CURRENT STREAK                       │
│                                      │
│ Progress        40%                  │
│ [████████░░░░░░░░░░░░] 12/30        │
│                                      │
│ [Area Chart with Green Gradient]    │
│              /⎺⎺⎺⎺\                 │
│         /⎺⎺⎺⎺      ⎺⎺\              │
│    /⎺⎺⎺⎺            ⎺⎺\            │
│                                      │
└─────────────────────────────────────┘
Color: Green (#10B981)
Data: [5, 6, 7, 8, 9, 10, 11, 12]
```

---

## Card 5: Weekly Activity (Full Width Bar Chart)

```
┌────────────────────────────────────────────────────────────────┐
│ WEEKLY ACTIVITY                           Last 7 Days           │
│                                                                  │
│     ┌────────────────────────────────────────────────┐         │
│     │                      █                          │         │
│     │                      █                          │         │
│     │          █           █        █                 │         │
│     │          █           █        █        █        │         │
│     │    █     █           █        █        █        │         │
│     │    █     █           █        █        █    █   │         │
│     │    █     █     █     █        █        █    █   │         │
│     └────────────────────────────────────────────────┘         │
│       Mon   Tue   Wed   Thu   Fri   Sat   Sun                  │
│        45    60    80    35    70    55    40                   │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
Color: Lime Light (#EEFF00)
```

---

## Visual Design Details

### Icon Badges (56×56px)
```
┌──────────────┐
│   ┌──────┐   │  • 56×56px square
│   │ 💪  │   │  • Rounded corners (rounded-xl)
│   │      │   │  • Gradient background (color + color + 30% opacity)
│   └──────┘   │  • Glow shadow effect
└──────────────┘  • Scales on hover
```

### Trend Indicators
```
Positive:  ↑ +12%  (Green #10B981)
Negative:  ↓ -3%   (Red #EF4444)
Neutral:   — 0%    (White-50)
```

### Progress Bars
```
Target Progress:
┌──────────────────────────────────┐
│ Progress              94%         │
│ [████████████████████░░░░] 47/50 │
└──────────────────────────────────┘

• Height: 6px (h-1.5)
• Background: white-30/10
• Fill: Linear gradient (color to color-CC)
• Rounded: Full (rounded-full)
• Animation: 1000ms width transition
```

### Typography Hierarchy
```
Value:       text-4xl (48px)    font-extrabold   text-white
Suffix:      text-xl (20px)     font-bold        text-white-50
Label:       text-xs (12px)     font-semibold    text-white-50
             uppercase tracking-wider
Change:      text-sm (14px)     font-bold        color-coded
Comparison:  text-[10px]        font-normal      text-white-30
```

### Card Structure
```
┌─────────────────────────────────────┐ ← border-white-30/10
│ [Decorative Gradient Background]     │   rounded-2xl
│ ┌──────────────────────────────┐    │   p-6 padding
│ │ Header: Icon + Trend         │    │
│ │ Value: Large Number          │    │
│ │ Label: Uppercase Small       │    │
│ │ Progress: Bar (if target)    │    │
│ │ Chart: Area/Line/Bar         │    │
│ └──────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Hover Effects
```
Normal State:
• border-white-30/10
• No shadow

Hover State:
• border-white-30/30  (brighter)
• shadow-lg (larger shadow)
• Icon scales 110%
• Smooth transitions (all properties)
```

---

## Responsive Breakpoints

### Desktop (1920px+)
```
┌──────────┬──────────┬──────────┬──────────┐
│  Card 1  │  Card 2  │  Card 3  │  Card 4  │
└──────────┴──────────┴──────────┴──────────┘
```
Grid: `grid-cols-4` | Gap: `gap-4`

### Tablet (768-1919px)
```
┌──────────┬──────────┐
│  Card 1  │  Card 2  │
├──────────┼──────────┤
│  Card 3  │  Card 4  │
└──────────┴──────────┘
```
Grid: `md:grid-cols-2` | Gap: `gap-4`

### Mobile (<768px)
```
┌──────────┐
│  Card 1  │
├──────────┤
│  Card 2  │
├──────────┤
│  Card 3  │
├──────────┤
│  Card 4  │
└──────────┘
```
Grid: `grid-cols-1` | Gap: `gap-4`

---

## Color Palette Reference

### Card Colors
```css
Card 1 (Workouts):   #EEFF00  Lime Light
Card 2 (Minutes):    #3E25F5  Royal Nebula
Card 3 (Calories):   #EF4444  Red
Card 4 (Streak):     #10B981  Green
Weekly Activity:     #EEFF00  Lime Light
```

### Background Colors
```css
Card Background:     #131921  obsidian-wave
Border Normal:       rgba(255,255,255,0.1)  white-30/10
Border Hover:        rgba(255,255,255,0.3)  white-30/30
Text Primary:        #FFFFFF  white
Text Secondary:      rgba(255,255,255,0.5)  white-50
Text Tertiary:       rgba(255,255,255,0.3)  white-30
```

### Status Colors
```css
Positive (up):       #10B981  Green
Negative (down):     #EF4444  Red
Neutral (flat):      rgba(255,255,255,0.5)  white-50
```

---

## Animation Timings

### Entrance Animations
- Chart data: 1000ms ease-in-out
- Progress bars: 1000ms ease-in-out
- Fade-in: 300ms ease-in

### Interaction Animations
- Hover effects: <300ms ease-in-out
- Icon scale: 300ms ease-in-out
- Border color: 300ms ease-in-out

### Smooth Transitions
```css
transition-all: All properties animate
duration-1000: Charts and progress bars
duration-300: Hover interactions
```

---

## Accessibility Features

### Color Contrast
- ✅ White text on dark background: 21:1 ratio
- ✅ Colored icons on colored backgrounds: 4.5:1+
- ✅ Trend indicators with icons + color (not color alone)

### Interactive Elements
- ✅ Minimum touch target: 44×44px (cards are larger)
- ✅ Hover states for desktop users
- ✅ Focus indicators (keyboard navigation)

### Screen Readers
- Cards have semantic HTML structure
- Values are readable text
- Charts have data-* attributes

---

## Chart Specifications

### Area Chart (Cards 1 & 4)
```typescript
<AreaChart data={chartData}>
  <Area
    type="monotone"
    dataKey="value"
    stroke={color}
    strokeWidth={2}
    fill={`url(#gradient-${label})`}
    animationDuration={1000}
  />
</AreaChart>
```

### Line Chart (Card 2)
```typescript
<LineChart data={chartData}>
  <Line
    type="monotone"
    dataKey="value"
    stroke={color}
    strokeWidth={2}
    dot={false}
    animationDuration={1000}
  />
</LineChart>
```

### Bar Chart (Card 3 & Weekly)
```typescript
<BarChart data={chartData}>
  <Bar
    dataKey="value"
    fill={color}
    radius={[4, 4, 0, 0]}
    opacity={0.8}
  />
</BarChart>
```

---

## Testing Checklist

### Visual Verification
- [ ] All 5 cards render correctly
- [ ] Charts display with proper colors
- [ ] Progress bars show correct percentages
- [ ] Trend arrows point correct direction
- [ ] Icons have gradient backgrounds
- [ ] Hover effects work smoothly

### Data Verification
- [ ] Values match sample data
- [ ] Percentages calculate correctly
- [ ] Progress bars match targets
- [ ] Charts reflect data arrays

### Responsive Verification
- [ ] Desktop: 4-column grid
- [ ] Tablet: 2×2 grid
- [ ] Mobile: Single column
- [ ] No overflow or clipping

### Animation Verification
- [ ] Charts animate on load
- [ ] Progress bars fill smoothly
- [ ] Hover transitions are smooth
- [ ] No animation jank or lag

---

**Last Updated:** July 1, 2026
**Purpose:** Visual reference for developers and designers
**Related Files:**
- `EnhancedStatsCard.tsx`
- `HomeTab.tsx`
- `TESTING_ENHANCED_STATS.md`
