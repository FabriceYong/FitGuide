# FitGuide API - Database Guide

## 🗄️ Database Information

**Database:** MongoDB Atlas
**Database Name:** planfit
**Collection:** workouts
**Total Workouts:** 30

---

## 🚀 Quick Commands

### Seed Database
```bash
npm run seed
```
This will:
- Connect to MongoDB
- Clear existing workouts
- Insert all 30 workouts from `seed/workoutSeeder.js`

### Verify Database
```bash
npm run verify
```
This will:
- Show total workout count
- Display workouts by category
- List workouts with detailed steps
- Show sample workout details

### Start Server
```bash
npm start          # Production
npm run dev        # Development (with nodemon)
```

---

## 📊 Current Database Content

### 30 Workouts Across 10 Categories:
- HIIT: 4
- Yoga: 4
- Strength: 6
- Cardio: 3
- Flexibility: 2
- Pilates: 3
- CrossFit: 2
- Dance: 2
- Martial Arts: 2
- Swimming: 2

### Featured Workouts with Detailed Steps:
1. **Morning Sun Salutation Flow** (13 steps)
   - Slug: `morning-yoga-flow`
   - Category: Yoga
   - Duration: 15 min

2. **Core Strength Circuit** (18 steps)
   - Slug: `core-power-blast`
   - Category: Strength
   - Duration: 20 min

---

## 🔗 API Endpoints

### Get All Workouts
```
GET /api/workouts
```
Query parameters:
- `category` - Filter by category
- `difficulty` - Filter by difficulty
- `search` - Search in title/description

### Get Single Workout
```
GET /api/workouts/:slug
```
Example: `/api/workouts/morning-yoga-flow`

### Get Categories
```
GET /api/workouts/categories/list
```

### Like a Workout
```
POST /api/workouts/:slug/like
```

---

## 🛠️ Database Management

### Re-seed Database
If you want to reset the database with fresh data:
```bash
npm run seed
```

### Add New Workouts
1. Edit `seed/workoutSeeder.js`
2. Add your workout object to the `workoutsData` array
3. Run `npm run seed`
4. Verify with `npm run verify`

### Workout Object Structure
```javascript
{
  title: "Workout Name",
  slug: "workout-name", // Optional, auto-generated
  description: "Full description...",
  shortDescription: "Brief summary",
  category: "HIIT", // HIIT, Yoga, Strength, etc.
  difficulty: "Intermediate", // Beginner, Intermediate, Advanced
  duration: 30, // minutes
  calories: 250,
  intensity: "High", // Low, Moderate, High, Very High
  equipment: ["Dumbbells", "Mat"],
  targetMuscles: ["Core", "Legs"],
  benefits: ["Burns fat", "Builds muscle"],
  tags: ["hiit", "cardio"],
  prerequisites: ["Basic fitness"],
  cautions: ["Stay hydrated"],

  // Optional detailed steps
  steps: [
    {
      stepNumber: 1,
      instruction: "Detailed instruction...",
      duration: 60 // seconds
    }
  ],

  // Optional modifications
  modifications: [
    {
      level: "Easier",
      description: "How to make it easier..."
    }
  ],

  restPeriod: 30, // seconds
  sets: 3,
  reps: 15
}
```

---

## 🔍 MongoDB Queries

### View All Workouts
```javascript
db.workouts.find()
```

### Find by Category
```javascript
db.workouts.find({ category: "HIIT" })
```

### Find Beginner Workouts
```javascript
db.workouts.find({ difficulty: "Beginner" })
```

### Find Short Workouts (< 20 min)
```javascript
db.workouts.find({ duration: { $lt: 20 } })
```

### Find Workouts with Steps
```javascript
db.workouts.find({
  steps: { $exists: true, $ne: [] }
})
```

### Find No-Equipment Workouts
```javascript
db.workouts.find({
  equipment: { $in: ["None"] }
})
```

---

## 🔧 Environment Variables

Required in `.env`:
```env
PORT=5001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/planfit
```

**Important:** Database name must be lowercase (`planfit`, not `PlanFit`)

---

## 📱 Integration with Frontend

The frontend app (`fitguide_web`) fetches workouts from this API:

1. **Browse Workouts:** `GET /api/workouts`
2. **View Details:** `GET /api/workouts/:slug`
3. **Start Execution:** Data passed to WorkoutExecution component

### Example Frontend Usage
```javascript
// Fetch all workouts
const response = await fetch('http://localhost:5001/api/workouts');
const data = await response.json();

// Fetch specific workout
const workout = await fetch('http://localhost:5001/api/workouts/morning-yoga-flow');
const workoutData = await workout.json();
```

---

## ✅ Checklist

- [x] Database seeded with 30 workouts
- [x] All categories have workouts
- [x] Featured workouts have detailed steps
- [x] API endpoints tested and working
- [x] NPM scripts configured
- [x] Environment variables set
- [x] Frontend integration ready

---

## 🐛 Common Issues

### "Database already exists with different case"
**Solution:** Use lowercase database name in connection string

### "Cannot find module workoutSeeder"
**Solution:** Ensure `module.exports = workoutsData;` is at end of file

### "Connection timeout"
**Solution:** Check MongoDB Atlas network access settings

### "Duplicate index warning"
**Note:** This is non-critical and doesn't affect functionality

---

## 📞 Support

If you encounter issues:
1. Check the console output for error messages
2. Verify MongoDB connection string in `.env`
3. Run `npm run verify` to check database state
4. Check network access in MongoDB Atlas

---

**Database is ready! Start the server with `npm start` 🚀**
