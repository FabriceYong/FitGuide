# Quick Start Guide - Enhanced Workout Execution

## 🚀 Start the Application

### 1. Start Backend Server
```bash
cd fitguide_api
npm run dev
```
**Expected output:**
```
🚀 Server running on http://localhost:5001
✅ MongoDB connected successfully
```

### 2. Start Frontend Development Server
```bash
# In a new terminal
cd fitguide_web
npm run dev
```
**Expected output:**
```
  VITE ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

### 3. Open in Browser
Navigate to: `http://localhost:5173`

---

## 🎯 Test the Enhanced Features

### Quick Test Path

1. **Login/Register**
   - Use existing credentials or create new account

2. **Navigate to Workouts**
   - Click "Explore" tab
   - Or check featured workouts on "Home" tab

3. **Try Enhanced Workouts** (with detailed steps)
   - **Morning Sun Salutation Flow** (Yoga category)
   - **Core Power Blast** (Strength category → "Core Strength Circuit")

4. **Start Workout**
   - Click on workout card
   - View workout details
   - Click **"Let's Begin"** button

5. **Experience Enhanced Execution** ✨
   - Large centered visual area
   - Timer countdown with color coding
   - Play/Pause controls
   - **Click "Form Tips & Breathing"** to expand
   - View:
     - ✅ Form Cues
     - 💨 Breathing Pattern
     - ⚠️ Common Mistakes
   - Test rest period (if workout has rest periods)
   - Complete workout to see celebration screen

---

## 🎨 Features to Test

### Visual Elements
- [ ] Large exercise demonstration area
- [ ] Color-coded timer (green → orange → red)
- [ ] Progress bar at top
- [ ] Step counter overlay on video area

### Controls
- [ ] Play/Pause button
- [ ] Previous/Next exercise buttons
- [ ] Mark Complete button
- [ ] Sound toggle (speaker icon)
- [ ] Exit button with confirmation

### Enhanced Content
- [ ] Expandable "Form Tips & Breathing" section
- [ ] Form Cues (green) display correctly
- [ ] Breathing Pattern (blue) displays correctly
- [ ] Common Mistakes (orange) display correctly

### Auto-Advance
- [ ] Timer counts down automatically when playing
- [ ] Auto-advances to next step when timer hits 0
- [ ] Rest period overlay shows between exercises (if applicable)

### Completion
- [ ] Celebration screen appears at end
- [ ] Shows total time, calories, exercises completed
- [ ] Auto-exits after 3 seconds

### Stats
- [ ] Elapsed time updates in real-time
- [ ] Estimated calories burn updates
- [ ] Remaining exercises count correct

---

## 📱 Mobile Testing

### Test on Mobile Device (Optional)

1. **Find your local IP**
   ```bash
   # On Windows
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

2. **Update backend CORS** (if needed)
   ```javascript
   // fitguide_api/server.js
   app.use(cors({
     origin: ['http://localhost:5173', 'http://YOUR_IP:5173']
   }));
   ```

3. **Access on mobile**
   - Connect phone to same WiFi network
   - Open: `http://YOUR_IP:5173`

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if MongoDB is running
# Check .env file has correct MONGODB_URI and JWT_SECRET

# If MongoDB connection fails:
# Make sure MongoDB is running locally or
# Update MONGODB_URI in .env to your MongoDB Atlas connection string
```

### Frontend won't start
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm run dev
```

### Workout data not showing
```bash
# Re-seed the database
cd fitguide_api
npm run seed
npm run verify
```

### Build errors
```bash
# Check for TypeScript errors
cd fitguide_web
npm run build

# If errors persist, check file imports and exports
```

### Images not loading
- Check imageUrl fields in database
- Verify URLs are accessible
- Check browser console for errors
- See HOW_TO_ADD_EXERCISE_IMAGES.md for adding images

---

## 📊 Database Commands

### View workouts in database
```bash
cd fitguide_api
npm run verify
```

### Re-seed database
```bash
cd fitguide_api
npm run seed
```

### Clear database
```bash
# MongoDB shell
mongosh
use planfit
db.workouts.deleteMany({})
```

---

## 🎓 Key Workouts to Demonstrate

### 1. Morning Sun Salutation Flow
**Why**: 13 detailed steps with comprehensive form guidance
**Category**: Yoga
**Difficulty**: Beginner
**Features**:
- Every step has form cues
- Breathing patterns synchronized with movements
- Common mistakes clearly listed
- Perfect for testing expandable tips section

### 2. Core Power Blast
**Why**: 18 steps with rest periods and round structure
**Category**: Strength
**Difficulty**: Intermediate
**Features**:
- Tests rest period overlay functionality
- Multiple rounds (3 sets)
- Rest periods between exercises
- Comprehensive form and breathing guidance
- Good for testing auto-advance through longer workout

---

## 📁 Project Structure Reference

```
fitness/
├── fitguide_api/          # Backend
│   ├── models/
│   │   └── Workout.js     # Enhanced with new fields
│   ├── seed/
│   │   ├── workoutSeeder.js   # Enhanced workout data
│   │   ├── seedWorkouts.js
│   │   └── verifyWorkouts.js
│   ├── routes/
│   ├── .env               # Environment variables
│   └── server.js
│
└── fitguide_web/          # Frontend
    ├── src/
    │   ├── App.tsx        # Updated to use EnhancedWorkoutExecution
    │   ├── features/
    │   │   └── workout/
    │   │       ├── EnhancedWorkoutExecution.tsx  # NEW
    │   │       ├── WorkoutExecution.tsx          # OLD (can be removed)
    │   │       └── WorkoutDetails.tsx
    │   ├── context/
    │   │   └── WorkoutContext.tsx
    │   └── services/
    │       └── workoutService.ts
    └── package.json
```

---

## ✅ Success Checklist

After starting the app, verify:

- [ ] Backend running on port 5001
- [ ] Frontend running on port 5173
- [ ] Can login successfully
- [ ] Workouts display on Home and Explore tabs
- [ ] Can view workout details
- [ ] Can start enhanced workout execution
- [ ] Timer works and auto-advances
- [ ] Form tips section expands and collapses
- [ ] Form cues, breathing patterns, and common mistakes display
- [ ] Play/Pause controls work
- [ ] Previous/Next buttons work
- [ ] Sound toggle works
- [ ] Stats update in real-time
- [ ] Celebration screen shows on completion
- [ ] Exit confirmation works

---

## 🎉 What's New vs Previous Version

### Before
- Basic execution screen
- Simple step-by-step view
- Minimal form guidance
- Basic timer

### After ✨
- Large visual demonstration area
- Color-coded timer with urgency feedback
- Expandable form tips section with:
  - Detailed form cues
  - Breathing patterns
  - Common mistakes to avoid
- Rest period overlays
- Celebration animation on completion
- Real-time stats tracking
- Sound notifications
- Better mobile experience
- Professional UI inspired by Nike Training Club, Peloton, Strava

---

## 📚 Additional Resources

- **Full Summary**: ENHANCED_WORKOUT_EXECUTION_SUMMARY.md
- **Adding Images**: HOW_TO_ADD_EXERCISE_IMAGES.md
- **Previous Changes**: UI_IMPROVEMENTS_SUMMARY.md

---

**Ready to go!** 🚀 Start testing the enhanced workout execution experience.
