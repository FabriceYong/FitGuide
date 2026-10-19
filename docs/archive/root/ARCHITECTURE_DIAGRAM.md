# FitGuide Application Architecture

## 🏗️ Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Home Tab    │  │ Explore Tab  │  │ Progress Tab │          │
│  │              │  │              │  │              │          │
│  │ - Featured   │  │ - All        │  │ - Stats      │          │
│  │ - Training   │  │   Workouts   │  │ - History    │          │
│  │   Plans      │  │ - Search     │  │ - Goals      │          │
│  │              │  │ - Filters    │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Profile Tab  │  │ Reviews Tab  │  │ Workout      │          │
│  │              │  │              │  │ Details      │          │
│  │ - Settings   │  │ - User       │  │              │          │
│  │ - Avatar     │  │   Reviews    │  │ - Full Info  │          │
│  │ - Logout     │  │ - Ratings    │  │ - Benefits   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│                      ┌──────────────────┐                        │
│                      │ Workout          │                        │
│                      │ Execution        │                        │
│                      │                  │                        │
│                      │ - Timer          │                        │
│                      │ - Steps          │                        │
│                      │ - Progress       │                        │
│                      └──────────────────┘                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                      REACT CONTEXT LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │            WorkoutProvider (Context)                │         │
│  │                                                      │         │
│  │  State:                                              │         │
│  │  - workouts: Workout[]          (30 workouts)       │         │
│  │  - loading: boolean             (initialization)    │         │
│  │  - error: string | null                             │         │
│  │  - categories: string[]         (10 categories)     │         │
│  │  - initialized: boolean                             │         │
│  │                                                      │         │
│  │  Methods:                                            │         │
│  │  - refreshWorkouts()                                 │         │
│  │  - filterWorkouts(filters)                           │         │
│  │  - getWorkoutBySlug(slug)                            │         │
│  │  - getWorkoutsByCategory(category)                   │         │
│  │  - getFeaturedWorkouts()                             │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │            AuthProvider (Context)                   │         │
│  │                                                      │         │
│  │  State:                                              │         │
│  │  - user: User | null                                 │         │
│  │  - isAuthenticated: boolean                          │         │
│  │                                                      │         │
│  │  Methods:                                            │         │
│  │  - login(credentials)                                │         │
│  │  - logout()                                          │         │
│  │  - register(data)                                    │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │         workoutService.ts (API Layer)               │         │
│  │                                                      │         │
│  │  Functions:                                          │         │
│  │  - fetchWorkouts(filters?)                           │         │
│  │  - fetchWorkoutBySlug(slug)                          │         │
│  │  - likeWorkout(slug)                                 │         │
│  │  - fetchCategories()                                 │         │
│  │  - searchWorkouts(query)                             │         │
│  │  - fetchFeaturedWorkouts()                           │         │
│  │  - fetchPopularWorkouts(limit)                       │         │
│  │                                                      │         │
│  │  Cache:                                              │         │
│  │  - workoutCache (5-minute TTL)                       │         │
│  │  - fetchWorkoutWithCache(slug)                       │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               ↕
                      HTTP Requests (Fetch API)
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND API                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │           Express Server (server.js)                │         │
│  │                  Port: 5001                          │         │
│  │                                                      │         │
│  │  Middleware:                                         │         │
│  │  - CORS                                              │         │
│  │  - JSON Parser                                       │         │
│  │  - Static Files (/uploads)                           │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │                API Routes                            │         │
│  │                                                      │         │
│  │  /api/workouts                                       │         │
│  │  ├─ GET  /                    (List all)            │         │
│  │  ├─ GET  /:slug               (Get by slug)         │         │
│  │  ├─ POST /:slug/like          (Like workout)        │         │
│  │  └─ GET  /categories/list     (Get categories)      │         │
│  │                                                      │         │
│  │  /api/auth                                           │         │
│  │  ├─ POST /login               (User login)          │         │
│  │  ├─ POST /register            (User signup)         │         │
│  │  └─ POST /logout              (User logout)         │         │
│  │                                                      │         │
│  │  /api/reviews                                        │         │
│  │  ├─ GET  /:workoutId          (Get reviews)         │         │
│  │  └─ POST /                    (Create review)       │         │
│  │                                                      │         │
│  │  /api/upload                                         │         │
│  │  ├─ POST /avatar              (Upload avatar)       │         │
│  │  └─ POST /review-image        (Upload image)        │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │         Mongoose Models (ODM)                       │         │
│  │                                                      │         │
│  │  - Workout.js         (Workout schema)              │         │
│  │  - User.js            (User schema)                 │         │
│  │  - Review.js          (Review schema)               │         │
│  │                                                      │         │
│  │  Schema Features:                                    │         │
│  │  - Validation                                        │         │
│  │  - Indexes                                           │         │
│  │  - Methods                                           │         │
│  │  - Virtuals                                          │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │      MongoDB Atlas (Cloud Database)                 │         │
│  │      Database: planfit                              │         │
│  │                                                      │         │
│  │  Collections:                                        │         │
│  │  ┌──────────────────────────────────────────┐      │         │
│  │  │ workouts                                  │      │         │
│  │  │ - 30 documents                            │      │         │
│  │  │ - 10 categories                           │      │         │
│  │  │ - 2 with detailed steps                   │      │         │
│  │  └──────────────────────────────────────────┘      │         │
│  │  ┌──────────────────────────────────────────┐      │         │
│  │  │ users                                     │      │         │
│  │  │ - User accounts                           │      │         │
│  │  │ - Auth credentials                        │      │         │
│  │  └──────────────────────────────────────────┘      │         │
│  │  ┌──────────────────────────────────────────┐      │         │
│  │  │ reviews                                   │      │         │
│  │  │ - Workout reviews                         │      │         │
│  │  │ - Ratings                                 │      │         │
│  │  └──────────────────────────────────────────┘      │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Workout Initialization

```
1. App Startup
   └─> main.tsx
       └─> WorkoutProvider wraps <App />

2. WorkoutProvider Mount
   └─> useEffect(() => loadWorkouts())
       └─> fetchWorkouts() from workoutService
           └─> HTTP GET to /api/workouts

3. Backend Processing
   └─> Express receives request
       └─> workouts.js route handler
           └─> Workout.find({ isPublished: true })
               └─> MongoDB query

4. Database Response
   └─> MongoDB returns 30 documents
       └─> Mongoose converts to Workout objects
           └─> JSON response sent to frontend

5. Frontend Receives Data
   └─> workoutService receives response
       └─> WorkoutContext stores in state
           └─> setWorkouts(data.workouts)
           └─> setLoading(false)
           └─> setInitialized(true)
           └─> console.log("✅ Loaded 30 workouts")

6. UI Updates
   └─> App.tsx checks initialized = true
       └─> Loading screen hides
           └─> Dashboard renders
               └─> ExploreTab displays workouts
```

---

## 🎯 Component Interaction Flow

```
User clicks workout card in ExploreTab
           ↓
   onSelectWorkout(slug, color)
           ↓
   App.tsx: setSelectedWorkout({ slug, color })
           ↓
   App.tsx renders WorkoutDetails
           ↓
   WorkoutDetails: fetchWorkoutBySlug(slug)
           ↓
   workoutService: GET /api/workouts/:slug
           ↓
   Backend: Find workout by slug
           ↓
   Workout data returned
           ↓
   WorkoutDetails displays full info
           ↓
User clicks "LET'S BEGIN"
           ↓
   onBegin(workout)
           ↓
   App.tsx: setExecutingWorkout(workout)
           ↓
   App.tsx renders WorkoutExecution
           ↓
   WorkoutExecution: Timer starts, steps display
```

---

## 🗂️ File Structure

```
fitguide/
├── fitguide_api/                 # Backend
│   ├── models/
│   │   ├── Workout.js            # Workout schema
│   │   ├── User.js               # User schema
│   │   └── Review.js             # Review schema
│   ├── routes/
│   │   ├── workouts.js           # Workout endpoints
│   │   ├── auth.js               # Auth endpoints
│   │   ├── reviews.js            # Review endpoints
│   │   └── upload.js             # Upload endpoints
│   ├── seed/
│   │   ├── workoutSeeder.js      # Workout data (30)
│   │   ├── seedWorkouts.js       # Seed script
│   │   └── verifyWorkouts.js     # Verify script
│   ├── .env                      # Environment config
│   ├── server.js                 # Express server
│   └── package.json
│
├── fitguide_web/                 # Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoadingScreen.tsx       # Loading UI
│   │   │   └── ConfirmDialog.tsx       # Dialogs
│   │   ├── context/
│   │   │   └── WorkoutContext.tsx      # ⭐ Workout state
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx         # Auth state
│   │   ├── services/
│   │   │   └── workoutService.ts       # ⭐ API layer
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   └── AuthWrapper.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── components/
│   │   │   │       ├── HomeTab.tsx
│   │   │   │       ├── ExploreTab.tsx  # ⭐ Uses context
│   │   │   │       ├── ProgressTab.tsx
│   │   │   │       └── ReviewsTab.tsx
│   │   │   ├── workout/
│   │   │   │   ├── WorkoutDetails.tsx  # ⭐ Uses service
│   │   │   │   └── WorkoutExecution.tsx
│   │   │   ├── profile/
│   │   │   │   └── ProfileTab.tsx
│   │   │   └── reviews/
│   │   │       └── WorkoutReviews.tsx
│   │   ├── App.tsx               # ⭐ Main app with loading
│   │   ├── main.tsx              # ⭐ WorkoutProvider wrap
│   │   └── index.css
│   └── package.json
│
└── Documentation/
    ├── WORKOUT_INITIALIZATION_GUIDE.md    # Full guide
    ├── QUICK_START_IMPLEMENTATION.md      # Quick reference
    ├── DATABASE_SEED_SUMMARY.md           # Database info
    ├── WORKOUT_EXECUTION_FEATURE.md       # Execution docs
    └── ARCHITECTURE_DIAGRAM.md            # This file

⭐ = Modified/Created for workout initialization
```

---

## 🔑 Key Technologies

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Context API** - State management
- **Fetch API** - HTTP requests
- **Tailwind CSS** - Styling

### Backend
- **Express** - Web framework
- **Mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin requests
- **Multer** - File uploads

### Database
- **MongoDB Atlas** - Cloud database
- **30 workouts** - Seeded data
- **3 collections** - workouts, users, reviews

---

## 📊 Data Models

### Workout Model
```typescript
{
  id: string
  title: string
  slug: string
  description: string
  category: string          // HIIT, Yoga, Strength, etc.
  difficulty: string        // Beginner, Intermediate, Advanced
  duration: number          // minutes
  calories: number
  intensity: string         // Low, Moderate, High, Very High
  equipment: string[]
  targetMuscles: string[]
  benefits: string[]
  steps: Step[]            // Optional detailed instructions
  modifications: Mod[]     // Optional variations
  viewCount: number
  likeCount: number
  averageRating: number
  totalReviews: number
}
```

---

## 🎨 UI States

### 1. Loading State
```
┌──────────────────────────┐
│  🏋️ Dumbbell Animation   │
│  ⭕ Loading Spinner       │
│  "Loading workouts..."   │
│  • • •                   │
└──────────────────────────┘
```

### 2. Error State
```
┌──────────────────────────┐
│  ⚠️ Error Icon            │
│  "Failed to load"        │
│  [Try Again Button]      │
└──────────────────────────┘
```

### 3. Success State
```
┌─────────┬─────────┬─────────┐
│ Workout │ Workout │ Workout │
│  Card   │  Card   │  Card   │
├─────────┼─────────┼─────────┤
│ Workout │ Workout │ Workout │
│  Card   │  Card   │  Card   │
└─────────┴─────────┴─────────┘
```

---

## 🚀 Performance Features

### Caching
- Individual workouts cached for 5 minutes
- Reduces API calls
- Improves response time

### Filtering
- Done in memory (no API calls)
- Instant results
- Supports multiple filters

### Pagination
- Initial display: 6 workouts
- "See All" loads remaining
- Reduces initial render time

### Lazy Loading
- Workout details loaded on demand
- Step instructions loaded when needed
- Images loaded progressively

---

## 🔐 Security Features

### Backend
- MongoDB connection with authentication
- CORS restricted to localhost:5173
- Input validation on routes
- Password hashing with bcrypt

### Frontend
- Environment variables for API URL
- No sensitive data in client
- Token-based auth (future)

---

## ✅ Complete Feature List

### Implemented ✅
- [x] Database seeding (30 workouts)
- [x] API endpoints for workouts
- [x] Workout service layer
- [x] Global state management
- [x] Initialization on startup
- [x] Loading screen
- [x] Error handling
- [x] Workout filtering
- [x] Category filtering
- [x] Search functionality
- [x] Workout details page
- [x] Workout execution page
- [x] Step-by-step guidance
- [x] Timer and progress tracking
- [x] Reviews system
- [x] User authentication
- [x] TypeScript support
- [x] Responsive design

### Future Enhancements 🔮
- [ ] Workout favorites
- [ ] Workout history
- [ ] Progress tracking
- [ ] Recommendations
- [ ] Offline support
- [ ] Real-time updates
- [ ] Social features
- [ ] Achievement badges

---

**Complete system architecture for FitGuide fitness application** 🎉
