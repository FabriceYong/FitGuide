# Programs Tab - Debugging: No Workouts Showing

## Issue
The Programs page is not displaying any programs even though the seed data exists.

---

## Root Cause Analysis

### Possible Causes

**1. Workouts Not Loading from Backend**
- API endpoint might be failing
- Backend might not be running
- Database might not have seed data

**2. WorkoutContext Not Initialized**
- Context might not be fetching data properly
- API base URL might be incorrect
- Network requests might be failing silently

**3. Environment Variables**
- `VITE_API_BASE` might not be set correctly
- Backend should be on `http://localhost:5001`
- Frontend should be on `http://localhost:5173`

---

## Diagnostic Steps

### Step 1: Check Backend is Running
```bash
# Terminal 1 - Start backend
cd fitguide_api
npm start
# Should see: "Server running on port 5001"
```

### Step 2: Check Frontend is Running
```bash
# Terminal 2 - Start frontend
cd fitguide_web
npm run dev
# Should see: "Local:   http://localhost:5173"
```

### Step 3: Test API Directly
```bash
# In browser console
fetch('http://localhost:5001/api/workouts')
  .then(r => r.json())
  .then(d => console.log(d))
```

Expected output:
```javascript
{
  success: true,
  count: 50+ (or however many workouts are seeded),
  workouts: [...]
}
```

### Step 4: Check Browser Console
Open DevTools (F12) → Console and look for:

**Expected Debug Messages (ProgramsTab):**
```
🔍 ProgramsTab DEBUG:
Total workouts from context: 50+
Workouts: [Array of workout objects]
First workout: {title: "...", difficulty: "...", ...}
Difficulty values: ["Advanced", "Beginner", "Intermediate", ...]

📊 Organized programs:
{Beginner: 15, Intermediate: 20, Advanced: 15, Total: 50}
```

**Error Messages to Look For:**
- "Error loading workouts"
- Network errors
- CORS errors

---

## Solution Steps

### Solution 1: Verify Workouts Are Seeded

**Check if seed data exists:**
```bash
cd fitguide_api
ls -la seed/
# Should see: workoutSeeder.js with workout data
```

**Check seed data format:**
```bash
# Read a sample of seed data
head -100 seed/workoutSeeder.js | grep -i difficulty
```

Expected: Should show entries like `"difficulty": "Beginner"` or `"Intermediate"` or `"Advanced"`

### Solution 2: Verify Backend Endpoint

**Check if API is responding:**
```bash
# In browser console or terminal
curl -X GET http://localhost:5001/api/workouts | jq .

# Or using fetch in browser console
fetch('http://localhost:5001/api/workouts').then(r => r.json()).then(console.log)
```

**Expected Response:**
```json
{
  "success": true,
  "count": 50,
  "workouts": [
    {
      "id": "mock-workout-1",
      "title": "High-Intensity Tabata Burn",
      "difficulty": "Advanced",
      ...
    },
    ...
  ]
}
```

### Solution 3: Check Frontend Configuration

**Verify API base URL:**
```javascript
// In browser console
console.log(import.meta.env.VITE_API_BASE)
// Should show: http://localhost:5001/api
// Or undefined (which defaults to this)
```

**Check .env file (if exists):**
```bash
cat fitguide_web/.env.local
# Should have: VITE_API_BASE=http://localhost:5001/api
# Or leave it empty for default
```

### Solution 4: Check WorkoutContext is Loading Data

**In browser console:**
```javascript
// Check if WorkoutContext has workouts
// Open Components tab, find <WorkoutProvider>, click it
// In console, expand the component to see provider context

// Or check network tab for API calls:
// F12 → Network tab → filter "workouts" → should see GET /api/workouts
```

---

## Common Issues & Fixes

### Issue: "Network Error" or "Failed to fetch"
**Cause:** Backend not running or wrong URL
**Fix:**
1. Verify backend is running on port 5001
2. Check VITE_API_BASE is correct
3. Check no firewall blocking port 5001

```bash
# Restart backend
cd fitguide_api
npm start
```

### Issue: API Returns Empty Array
**Cause:** Seed data not loaded or database empty
**Fix:**
1. Check if MOCK_DB is set to 'true'
2. Reseed the database
3. Check seed data file exists

```bash
# Reseed database (if using MongoDB)
cd fitguide_api
npm run seed  # or node seed/seedWorkouts.js
```

### Issue: API Returns Error
**Cause:** Backend error, check logs
**Fix:**
1. Look at backend terminal for error messages
2. Check MongoDB connection if using DB
3. Try restarting backend

```bash
# Clear and restart
cd fitguide_api
npm start
```

### Issue: Workouts Load but Wrong Difficulty
**Cause:** Seed data has wrong difficulty values
**Fix:**
1. Check seed data uses exact strings: "Beginner", "Intermediate", "Advanced"
2. Not: "beginner", "BEGINNER", "Beginner Level", etc.

```javascript
// Debug: Check what difficulty values exist
fetch('http://localhost:5001/api/workouts')
  .then(r => r.json())
  .then(d => {
    const difficulties = [...new Set(d.workouts.map(w => w.difficulty))];
    console.log('Unique difficulties:', difficulties);
  })
```

---

## Debug Information Display

### Current Implementation
ProgramsTab now shows debug info when no workouts are found:
- Total workouts count
- Breakdown by difficulty (Beginner, Intermediate, Advanced)
- Details expandable for inspection

### To View Debug Info
1. Go to Programs tab
2. If no programs show, look for expandable "Debug Info"
3. Click it to see:
   - Total workouts loaded
   - Count per difficulty level
   - Current filter state

---

## Step-by-Step Troubleshooting

### Check 1: Is Backend Running?
```bash
# Terminal
ps aux | grep node
# Should see: node seed/seedWorkouts.js or npm start or similar

# If not running:
cd fitguide_api
npm start
```

### Check 2: Are Workouts in Backend?
```bash
# Browser console
fetch('http://localhost:5001/api/workouts').then(r => r.json()).then(d => {
  console.log('Count:', d.count);
  console.log('Success:', d.success);
  if (d.workouts.length > 0) {
    console.log('First workout:', d.workouts[0]);
  }
})
```

### Check 3: Is Frontend Getting Workouts?
```bash
# Browser console
// Wait a moment, then check
import { useWorkouts } from './context/WorkoutContext';
// (Can't use hooks directly in console, but you can check Network tab)

// Or in Programs component, look at console for debug logs:
// 🔍 ProgramsTab DEBUG: ...
```

### Check 4: Are Workouts Being Organized Correctly?
Look for this in console:
```
📊 Organized programs:
{Beginner: X, Intermediate: Y, Advanced: Z, Total: X+Y+Z}
```

If all are 0, workouts are loading but not matching difficulty filters.

---

## Quick Fix Checklist

- [ ] Backend running on port 5001? (`npm start` in fitguide_api)
- [ ] Frontend running on port 5173? (`npm run dev` in fitguide_web)
- [ ] Check browser console for errors (F12)
- [ ] Check Network tab for failed requests
- [ ] Verify API returns workouts: `fetch('http://localhost:5001/api/workouts')`
- [ ] Check workouts have correct difficulty values
- [ ] Look for 🔍 debug logs in console from ProgramsTab
- [ ] Check 📊 organized programs count

---

## Expected Console Output When Working

### When Workouts Load Successfully
```
🔍 ProgramsTab DEBUG:
Total workouts from context: 50
Workouts: (50) [{...}, {...}, ...]
First workout: {
  id: "mock-workout-1",
  title: "High-Intensity Tabata Burn",
  difficulty: "Advanced",
  category: "HIIT",
  duration: 20,
  calories: 250,
  ...
}
Difficulty values: Array(50) ["Advanced", "Intermediate", "Beginner", ...]

📊 Organized programs:
{
  Beginner: 15,
  Intermediate: 20,
  Advanced: 15,
  Total: 50
}
```

### Programs Should Appear
- Section: "Beginner Programs (15 programs)"
- Section: "Intermediate Programs (20 programs)"
- Section: "Advanced Programs (15 programs)"
- Each section shows program cards

---

## If Still Not Working

### Final Diagnostic
```javascript
// Browser console - comprehensive check
async function diagnose() {
  console.log('=== DIAGNOSIS ===');

  // Check API
  const api = await fetch('http://localhost:5001/api/workouts').then(r => r.json());
  console.log('API Response:', api);

  // Check difficulties
  const diffs = [...new Set(api.workouts.map(w => w.difficulty))];
  console.log('Unique difficulties:', diffs);

  // Check for exact matches
  const exactBeginners = api.workouts.filter(w => w.difficulty === 'Beginner').length;
  const exactIntermediate = api.workouts.filter(w => w.difficulty === 'Intermediate').length;
  const exactAdvanced = api.workouts.filter(w => w.difficulty === 'Advanced').length;

  console.log('Exact matches:', {
    Beginner: exactBeginners,
    Intermediate: exactIntermediate,
    Advanced: exactAdvanced
  });
}

diagnose();
```

Run this and share the output if still having issues.

---

## Support

If the above steps don't work:

1. **Check backend logs** - Does it show errors?
2. **Check network requests** - Are they being made?
3. **Check database** - If using MongoDB, is data there?
4. **Restart everything** - Kill both servers and restart

```bash
# Complete restart
# Kill all node processes
pkill -f node

# Start fresh
cd fitguide_api && npm start &
cd fitguide_web && npm run dev
```

---

**Debug Info Updated:** July 1, 2026
**Component:** ProgramsTab.tsx
**Status:** Debug mode enabled - check console for detailed logs
