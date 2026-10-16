# Workout Execution Page Restructure Instructions

## Changes Required

### 1. Reduce Overall Size by 20%
**Current**: Max width unrestricted
**New**: Add `max-w-[1400px] mx-auto` to main container

**Location**: Line ~374
```tsx
// OLD:
<div className="relative z-10 flex flex-col lg:flex-row h-[calc(100vh-80px)]">

// NEW:
<div className="relative z-10 flex flex-col lg:flex-row h-[calc(100vh-80px)] max-w-[1400px] mx-auto">
```

### 2. Reduce Padding/Spacing (20% reduction)
**Current**: `px-6 py-8` and `space-y-8`
**New**: `px-4 py-6` and `space-y-6`

**Left Side Container** - Line ~377:
```tsx
// OLD:
<div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8 lg:pr-4">
  <div className="max-w-3xl mx-auto space-y-8">

// NEW:
<div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 lg:pr-3">
  <div className="max-w-2xl mx-auto space-y-6">
```

### 3. Left Side Content - Remove Visual & Controls

**REMOVE COMPLETELY** (Lines ~382-530):
- All visual demonstration code (GIF/Image loading, placeholders)
- Timer overlay on visual
- Step counter on visual
- Control buttons (Previous, Play/Pause, Next)
- "Mark Complete" button

**KEEP ONLY**:
- Workout title (make it prominent)
- Workout description (separated)
- Steps list
- Workout information sections
- Form tips
- Stats

### 4. Restructure Left Side Header

**Replace** lines ~382-391:
```tsx
// OLD:
<div>
  <h2 className="text-4xl font-extrabold mb-2">
    {isResting ? 'Rest Period' : currentStep?.instruction}
  </h2>
  <p className="text-white-70">
    Step {currentStepIndex + 1} of {totalSteps}
  </p>
</div>

// NEW:
{/* Workout Title - Large, Prominent, Separated */}
<div className="mb-6">
  <h1 className="text-5xl font-extrabold mb-4 leading-tight">
    {workout.title}
  </h1>

  {/* Description - Clearly Separated */}
  {workout.description && (
    <p className="text-base text-white-70 leading-relaxed border-t border-white-30/20 pt-4">
      {workout.description}
    </p>
  )}
</div>

{/* Steps List - Clearly Separated */}
<div className="border-t border-white-30/20 pt-6">
  <h3 className="text-2xl font-bold mb-4">Workout Steps</h3>
```

### 5. Right Side - Add Visual + Controls

**Current Right Side** starts around line ~860
**Replace/Enhance** the entire right side section:

```tsx
{/* RIGHT SIDE - Fixed Visual + Controls */}
<div className="hidden lg:block lg:w-2/5 xl:w-1/2 relative">
  <div className="sticky top-24 p-6">

    {/* Current Exercise Title on Right */}
    <div className="mb-4">
      <h2 className="text-2xl font-bold">
        {isResting ? 'Rest Period' : currentStep?.instruction}
      </h2>
      <p className="text-white-70 text-sm mt-1">
        Step {currentStepIndex + 1} of {totalSteps}
      </p>
    </div>

    {/* Visual Demonstration Area - MOVED FROM LEFT */}
    <div className="aspect-square bg-obsidian-wave rounded-3xl overflow-hidden relative border-2 border-white-30/20 shadow-2xl mb-6">
      {/* ALL the GIF/Image loading code that was on the left */}
      {/* displayMediaUrl conditional rendering */}
      {/* Timer overlay */}
      {/* Step counter */}
    </div>

    {/* Control Buttons - MOVED FROM LEFT */}
    <div className="flex items-center justify-center gap-6 mb-6">
      <button
        onClick={handlePreviousStep}
        disabled={currentStepIndex === 0}
        className="w-14 h-14 rounded-full bg-white-30/20 hover:bg-white-30/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      >
        <ChevronLeft className="w-7 h-7" />
      </button>

      <button
        onClick={handlePlayPause}
        className="w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-2xl"
        style={{ backgroundColor: tintColor }}
      >
        {isPlaying ? (
          <Pause className="w-10 h-10 text-noir-eclipse fill-current" />
        ) : (
          <Play className="w-10 h-10 text-noir-eclipse fill-current ml-1" />
        )}
      </button>

      <button
        onClick={handleNextStep}
        disabled={currentStepIndex === totalSteps - 1}
        className="w-14 h-14 rounded-full bg-white-30/20 hover:bg-white-30/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      >
        <ChevronRight className="w-7 h-7" />
      </button>
    </div>

    {/* Mark Complete Button - MOVED FROM LEFT */}
    <button
      onClick={handleStepComplete}
      className="w-full py-4 bg-lime-light/20 border-2 border-lime-light text-lime-light font-bold rounded-xl hover:bg-lime-light hover:text-noir-eclipse transition-all flex items-center justify-center gap-2"
    >
      <Check className="w-5 h-5" />
      Mark Complete & Continue
    </button>

    {/* Additional Stats */}
    <div className="mt-6 grid grid-cols-2 gap-4">
      <div className="bg-obsidian-wave/50 backdrop-blur-sm rounded-2xl p-4 border border-white-30/20">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6" style={{ color: tintColor }} />
          <div>
            <div className="text-xs text-white-50">Duration</div>
            <div className="text-xl font-bold">
              {currentStep?.duration ? Math.floor(currentStep.duration / 60) : 0}:
              {currentStep?.duration ? (currentStep.duration % 60).toString().padStart(2, '0') : '00'}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-obsidian-wave/50 backdrop-blur-sm rounded-2xl p-4 border border-white-30/20">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-orange-400" />
          <div>
            <div className="text-xs text-white-50">Intensity</div>
            <div className="text-lg font-bold">{workout.intensity}</div>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>
```

---

## Summary of Changes

### Left Side (Content Only):
1. **Workout Title** - Extra large (text-5xl), bold, prominent
2. **Description** - Separated with border-top, lighter color
3. **Steps List** - Separated section with heading
4. **Workout Info** - All information sections
5. **Form Tips** - Expandable sections
6. **Stats** - Bottom stats

### Right Side (Visual + Controls):
1. **Current Step Title** - Shows what exercise is active
2. **Visual Demonstration** - All GIF/image loading functionality
3. **Timer Overlay** - Large, color-coded
4. **Control Buttons** - Play/Pause, Previous, Next
5. **Mark Complete Button** - Quick action
6. **Duration/Intensity Cards** - Quick reference

### Size Reductions (20%):
- Container: `max-w-[1400px]` (was unlimited)
- Padding: `px-4 py-6` (was `px-6 py-8`)
- Spacing: `space-y-6` (was `space-y-8`)
- Max width: `max-w-2xl` (was `max-w-3xl`)
- Right padding: `lg:pr-3` (was `lg:pr-4`)

---

## File to Modify

**File**: `fitguide_web/src/features/workout/EnhancedWorkoutExecution.tsx`
**Total Lines**: 1005

---

## Visual Layout

```
┌────────────────────────────────────────────────────────────┐
│  [X]  ▓▓▓▓▓▓ Progress ▓▓▓▓▓▓  [🔊]                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  LEFT (60%)                    │  RIGHT (40%)              │
│  ═══════════                   │  ═════════                │
│                                │                           │
│  ┌─ WORKOUT TITLE ──────────┐  │  Current Exercise Title   │
│  │ Morning Sun Salutation   │  │                           │
│  └──────────────────────────┘  │  ╔═══════════════╗        │
│                                │  ║               ║        │
│  Description here (separated)  │  ║   VISUAL      ║ ← MOVED│
│  ─────────────────────────────  │  ║   GIF/IMAGE   ║        │
│                                │  ║               ║        │
│  Workout Steps                 │  ║  [00:45]      ║        │
│  • Step 1...                   │  ╚═══════════════╝        │
│  • Step 2...                   │                           │
│  • Step 3...                   │  [◀] [▶] [▶▶]  ← MOVED    │
│                                │                           │
│  Equipment                     │  ✓ Mark Complete  ← MOVED │
│  Benefits                      │                           │
│  Prerequisites                 │  Duration | Intensity     │
│  ↕️ Scroll                      │                           │
│                                │  ⬆️ FIXED POSITION         │
└────────────────────────────────┴───────────────────────────┘
```

---

## Testing After Changes

1. Start workout execution
2. Verify left side shows:
   - ✅ Large workout title (text-5xl)
   - ✅ Description separated below
   - ✅ Steps list clearly labeled
   - ✅ No visual demonstration
   - ✅ No control buttons
3. Verify right side shows:
   - ✅ Current exercise title
   - ✅ Visual demonstration
   - ✅ Control buttons
   - ✅ Mark complete button
   - ✅ Stats cards
4. Verify right side stays fixed while scrolling left
5. Verify 20% smaller overall (narrower max-width)

---

**These instructions will guide the restructure. The key is moving all visual and control elements from left to right, while making the title more prominent and clearly separated on the left.**
