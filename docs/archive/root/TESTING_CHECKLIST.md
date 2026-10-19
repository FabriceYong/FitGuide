# Testing Checklist - Workout Steps List Feature

## Quick Test Guide

---

## 🚀 Start the App

```bash
# Terminal 1: Backend
cd fitguide_api
npm run dev
# Wait for: ✅ MongoDB connected successfully

# Terminal 2: Frontend
cd fitguide_web
npm run dev
# Wait for: ➜ Local: http://localhost:5173/
```

Open browser: `http://localhost:5173`

---

## ✅ Basic Functionality Test

### 1. Navigation to Workout
- [ ] Login/Register successfully
- [ ] Navigate to "Explore" or "Home" tab
- [ ] Find "Morning Sun Salutation Flow" (Yoga category)
  - OR "Core Strength Circuit" (Strength category)
- [ ] Click on workout card
- [ ] Workout details page loads

### 2. Start Workout Execution
- [ ] Click **"Let's Begin"** button
- [ ] Enhanced execution screen loads
- [ ] Large visual demonstration area appears
- [ ] Timer shows in top-right of visual area
- [ ] Control buttons visible (Previous, Play, Next)

### 3. Workout Title Display (NEW FEATURE)
- [ ] Scroll down past control buttons
- [ ] **Workout title is visible** (e.g., "Morning Sun Salutation Flow")
- [ ] Title is centered and bold
- [ ] Title clearly separates controls from steps list

### 4. Steps List Display (NEW FEATURE)
- [ ] **"🎯 Workout Steps" section appears** below title
- [ ] Section has dark background card
- [ ] All workout steps are listed (13 for yoga, 18 for core)
- [ ] Each step shows:
  - [ ] Step number badge (left side)
  - [ ] Step label (e.g., "Step 1")
  - [ ] Duration badge (e.g., "1:00")
  - [ ] Full instruction text

### 5. Current Step Highlighting (NEW FEATURE)
- [ ] **Step 1 has lime/yellow border** (current step)
- [ ] Step 1 has lime background glow
- [ ] Step 1 shows "⚡ Currently active" indicator
- [ ] Pulsing dot appears next to "Currently active"
- [ ] Other steps are gray (upcoming)

### 6. Step Progression
- [ ] Click play button or wait for timer
- [ ] Timer counts down
- [ ] When Step 1 completes:
  - [ ] **Step 1 turns green** with checkmark ✓
  - [ ] **Step 2 highlights in lime** (becomes current)
  - [ ] "Currently active" indicator moves to Step 2
  - [ ] Progress bar at top updates

### 7. Scrolling Steps List
- [ ] **Scroll down in the steps list**
- [ ] Can see all steps (should scroll smoothly)
- [ ] **Custom scrollbar appears** (lime/yellow colored)
- [ ] Scrollbar changes opacity on hover
- [ ] Can scroll to see steps 1 through 13 (or 18)

### 8. Multiple Steps Completed
- [ ] Progress through 3-4 steps
- [ ] Verify completed steps all show:
  - [ ] Green border
  - [ ] Green background tint
  - [ ] Checkmark icon instead of number
- [ ] Current step still highlighted in lime
- [ ] Upcoming steps remain gray

---

## 🎨 Visual State Verification

### Completed Step Appearance
```
Expected Look:
┌─────────────────────────────┐
│ ✓ 1  Step 1         1:00    │ ← Green border
│   Begin in Mountain Pose... │    Green tint
└─────────────────────────────┘
```

Check:
- [ ] Green border visible
- [ ] Checkmark (✓) instead of number
- [ ] Text slightly dimmed
- [ ] Green background tint

### Current Step Appearance
```
Expected Look:
╔═════════════════════════════╗
║ 2  Step 2         0:45      ║ ← Bright lime border
║   Inhale and raise arms...  ║    Lime glow
║   ⚡ Currently active        ║ ← Pulse indicator
╚═════════════════════════════╝
```

Check:
- [ ] Bright lime/yellow border
- [ ] Lime background glow
- [ ] Number in lime circle
- [ ] "Currently active" text visible
- [ ] Pulsing dot animation works
- [ ] Text is bright white

### Upcoming Step Appearance
```
Expected Look:
┌─────────────────────────────┐
│ 3  Step 3         0:45      │ ← Gray border
│   Exhale and fold forward...│    Subtle background
└─────────────────────────────┘
```

Check:
- [ ] Subtle gray border
- [ ] Number in gray circle
- [ ] Text is dimmed gray
- [ ] Very subtle background

---

## 📱 Responsive Design Test

### Desktop (if available)
- [ ] Steps list is wide and comfortable to read
- [ ] Scrollbar visible on right side
- [ ] All elements properly aligned
- [ ] No horizontal scrolling needed

### Tablet (if available)
- [ ] Layout adjusts to medium screen
- [ ] Steps list remains readable
- [ ] Touch scrolling works smoothly
- [ ] All text is legible

### Mobile
- [ ] Steps list is readable on small screen
- [ ] Touch scrolling works smoothly
- [ ] No horizontal overflow
- [ ] All badges and text fit within cards
- [ ] Workout title wraps properly if needed

---

## ⚡ Interaction Tests

### Control Buttons with Steps List
- [ ] Click **Previous** button
  - [ ] Goes to previous step
  - [ ] Steps list updates highlighting
  - [ ] Correct step shows "Currently active"

- [ ] Click **Next** button
  - [ ] Goes to next step
  - [ ] Previous step gets checkmark
  - [ ] Steps list updates highlighting

- [ ] Click **Play/Pause**
  - [ ] Timer starts/stops
  - [ ] Steps list remains visible and functional
  - [ ] No layout shifts

### Mark Complete Button
- [ ] Click **"Mark Complete & Continue"**
  - [ ] Current step gets checkmark immediately
  - [ ] Advances to next step
  - [ ] Steps list updates instantly
  - [ ] Smooth transition

### Scrolling During Workout
- [ ] Start workout
- [ ] Scroll steps list while timer is running
  - [ ] Scrolling works smoothly
  - [ ] Doesn't interfere with timer
  - [ ] Current step highlight remains correct
  - [ ] Can still see timer in visual area

---

## 🎯 Edge Cases

### First Step
- [ ] Step 1 is highlighted at start
- [ ] No completed steps (all gray except current)
- [ ] "Previous" button is disabled
- [ ] Steps list scrolled to top

### Last Step
- [ ] All previous steps show checkmarks
- [ ] Last step is highlighted in lime
- [ ] "Next" button is disabled
- [ ] Can still scroll to see all steps

### Short Workout (3 steps)
- [ ] All steps fit without scrolling
- [ ] No scrollbar appears
- [ ] Still shows proper highlighting
- [ ] Works correctly

### Long Workout (18 steps)
- [ ] Scrollbar definitely appears
- [ ] Can scroll to see all 18 steps
- [ ] Smooth scrolling throughout
- [ ] Current step always findable

---

## 🔧 Technical Verification

### Console Checks
Open browser DevTools (F12):
- [ ] No error messages in console
- [ ] No warning messages
- [ ] No failed network requests
- [ ] Smooth animations (60fps)

### Performance
- [ ] Steps list loads instantly
- [ ] Scrolling is smooth (no lag)
- [ ] Step transitions are instant
- [ ] No memory leaks during long workout
- [ ] Timer updates smoothly (1s intervals)

### Data Integrity
- [ ] All step numbers are correct (1, 2, 3...)
- [ ] All step durations match data
- [ ] Instructions display completely
- [ ] No missing or duplicated steps
- [ ] Step count matches total (e.g., "Step 4 of 13")

---

## 🎨 Styling Verification

### Colors Match Theme
- [ ] Lime color: `#EEFF00` (current step border)
- [ ] Green color: `#22C55E` (completed steps)
- [ ] Gray: `rgba(255,255,255,0.3)` (upcoming steps)
- [ ] Background: Dark (`#131921`)

### Custom Scrollbar
- [ ] Scrollbar is **8px wide**
- [ ] Scrollbar color is **lime-tinted** (`rgba(238, 255, 0, 0.3)`)
- [ ] Scrollbar **darkens on hover** (0.5 opacity)
- [ ] Track has subtle background
- [ ] Rounded corners (4px border-radius)

### Typography
- [ ] Workout title is **2xl size** (24px)
- [ ] Section header is **lg size** (18px)
- [ ] Step labels are **sm size** (14px)
- [ ] All text uses **Poppins font**

---

## ✅ Final Verification

### Feature Completeness
- [x] Workout title displays
- [x] All steps listed
- [x] Below control buttons
- [x] Scrollable container
- [x] Custom scrollbar
- [x] Status indicators (completed, current, upcoming)
- [x] Visual progress tracking
- [x] Smooth animations
- [x] Responsive design
- [x] No errors or warnings

### User Experience
- [ ] Easy to understand at a glance
- [ ] Current step is obvious
- [ ] Progress is clear
- [ ] Scrolling feels natural
- [ ] Colors are distinct
- [ ] Text is readable
- [ ] Works on all devices

---

## 🐛 Bug Checklist (Should NOT happen)

If you encounter any of these, report as bug:

- [ ] ❌ Workout title missing
- [ ] ❌ Steps list doesn't appear
- [ ] ❌ Steps list appears above controls
- [ ] ❌ Can't scroll the steps list
- [ ] ❌ Scrollbar not visible or wrong color
- [ ] ❌ Current step not highlighted
- [ ] ❌ Completed steps don't show checkmarks
- [ ] ❌ Step numbers are wrong
- [ ] ❌ Multiple steps highlighted as current
- [ ] ❌ Steps don't update when advancing
- [ ] ❌ Layout breaks on mobile
- [ ] ❌ Timer doesn't work with steps list visible
- [ ] ❌ Steps list causes performance issues
- [ ] ❌ Console errors appear

---

## 📸 Screenshot Checklist

Capture these screens for documentation:

1. [ ] Full workout execution screen showing:
   - Visual demo area
   - Control buttons
   - Workout title
   - Steps list with current step highlighted

2. [ ] Steps list close-up showing:
   - Completed steps (green with checkmark)
   - Current step (lime with pulse)
   - Upcoming steps (gray)

3. [ ] Custom scrollbar visible

4. [ ] Mobile view of the same screen

5. [ ] Midway through workout showing progress

---

## 🎉 Success Criteria

All checkboxes above should be checked. If any fail, note the issue and report.

### Must Have (Critical)
- ✅ Workout title displays
- ✅ All steps listed and visible
- ✅ Current step highlighted in lime
- ✅ Completed steps show checkmarks
- ✅ List is scrollable
- ✅ No console errors

### Should Have (Important)
- ✅ Custom scrollbar styling
- ✅ Smooth animations
- ✅ Pulsing "Currently active" indicator
- ✅ Responsive on all devices
- ✅ Proper color coding

### Nice to Have (Bonus)
- ✅ Hover effects work
- ✅ Performance is excellent
- ✅ Visual polish (borders, shadows)

---

**If all critical and important items pass, the feature is ready for production!** 🚀
