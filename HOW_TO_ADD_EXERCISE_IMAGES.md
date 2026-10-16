# How to Add Exercise Images/GIFs to Workouts

This guide explains how to enhance workouts with visual demonstrations (images, GIFs, or videos).

---

## Option 1: Using ExerciseDB API (Recommended for Exercise GIFs)

### What is ExerciseDB?
ExerciseDB is a free API that provides exercise data including animated GIFs for over 1,300 exercises.

### Setup Steps

1. **Get API Key** (Free)
   - Visit: https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb
   - Sign up for a free account
   - Get your API key

2. **Install axios** (if not already installed)
   ```bash
   cd fitguide_api
   npm install axios
   ```

3. **Create Exercise Service** (`fitguide_api/services/exerciseService.js`)
   ```javascript
   const axios = require('axios');

   const EXERCISE_DB_API_KEY = process.env.EXERCISEDB_API_KEY;
   const BASE_URL = 'https://exercisedb.p.rapidapi.com';

   const exerciseService = {
     // Search for exercise by name
     async searchExercise(name) {
       try {
         const response = await axios.get(`${BASE_URL}/exercises/name/${name}`, {
           headers: {
             'X-RapidAPI-Key': EXERCISE_DB_API_KEY,
             'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
           }
         });
         return response.data;
       } catch (error) {
         console.error('ExerciseDB API error:', error);
         return null;
       }
     },

     // Get exercise GIF URL
     getGifUrl(exerciseData) {
       return exerciseData?.gifUrl || null;
     }
   };

   module.exports = exerciseService;
   ```

4. **Add API Key to .env**
   ```bash
   EXERCISEDB_API_KEY=your_api_key_here
   ```

5. **Use in Workout Seeder**
   ```javascript
   const exerciseService = require('../services/exerciseService');

   // Example: Getting a plank GIF
   const plankData = await exerciseService.searchExercise('plank');
   const plankGifUrl = exerciseService.getGifUrl(plankData[0]);

   // Add to step
   steps: [
     {
       stepNumber: 1,
       instruction: "Plank Hold",
       duration: 45,
       imageUrl: plankGifUrl,
       formCues: [...],
       commonMistakes: [...],
       breathingPattern: "..."
     }
   ]
   ```

---

## Option 2: Using Local Images/GIFs

### For Custom or Purchased Assets

1. **Create images directory**
   ```bash
   mkdir fitguide_web/public/exercises
   ```

2. **Organize by category**
   ```
   fitguide_web/public/exercises/
   ├── yoga/
   │   ├── mountain-pose.gif
   │   ├── downward-dog.gif
   │   └── ...
   ├── strength/
   │   ├── plank.gif
   │   ├── push-up.gif
   │   └── ...
   └── cardio/
       ├── jumping-jack.gif
       └── ...
   ```

3. **Reference in workout data**
   ```javascript
   steps: [
     {
       stepNumber: 1,
       instruction: "Mountain Pose",
       duration: 60,
       imageUrl: "/exercises/yoga/mountain-pose.gif",
       formCues: [...],
       commonMistakes: [...],
       breathingPattern: "..."
     }
   ]
   ```

---

## Option 3: YouTube Video Integration

### For Video Demonstrations

1. **Get YouTube Video ID**
   - From URL: `https://www.youtube.com/watch?v=VIDEO_ID`
   - Extract: `VIDEO_ID`

2. **Add to workout**
   ```javascript
   {
     title: "Full Workout Video",
     videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
     steps: [...]
   }
   ```

3. **Or embed in step**
   ```javascript
   steps: [
     {
       stepNumber: 1,
       instruction: "Watch and follow along",
       duration: 300,
       imageUrl: "https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg", // Thumbnail
       videoUrl: "https://www.youtube.com/watch?v=VIDEO_ID"
     }
   ]
   ```

4. **Update EnhancedWorkoutExecution to embed video** (optional)
   ```tsx
   {currentStep.videoUrl ? (
     <iframe
       width="100%"
       height="100%"
       src={`https://www.youtube.com/embed/${extractVideoId(currentStep.videoUrl)}`}
       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
       allowFullScreen
     />
   ) : (
     // Existing image/placeholder logic
   )}
   ```

---

## Option 4: Using Free Exercise Assets

### Websites with Free Exercise GIFs/Images

1. **Giphy** (https://giphy.com)
   - Search: "workout", "exercise", "fitness"
   - Right-click GIF → Copy image address
   - Use URL directly in imageUrl field

2. **Unsplash** (https://unsplash.com)
   - Free high-quality workout photos
   - API available: https://unsplash.com/developers
   - No attribution required but recommended

3. **Pexels** (https://www.pexels.com)
   - Free stock photos and videos
   - Search: "workout", "exercise"
   - Free to use, no attribution required

4. **Wikimedia Commons** (https://commons.wikimedia.org)
   - Free-use media
   - Check license for each image
   - Many exercise demonstration photos available

---

## Option 5: Create Custom Animations

### Using Simple Animation Tools

1. **Canva** (Free tier available)
   - Create simple animated GIFs
   - Add text overlays for instructions
   - Export as GIF

2. **Figma + Plugin**
   - Design exercise illustrations
   - Use animation plugins
   - Export frames as GIF

3. **Screen Recording**
   - Record yourself or trainer doing exercise
   - Convert video to GIF using tools like:
     - ezgif.com
     - CloudConvert
     - Gifski (Mac app)

---

## Quick Implementation Example

### Adding Images to "Morning Sun Salutation Flow"

```javascript
// In workoutSeeder.js
{
  title: "Morning Sun Salutation Flow",
  slug: "morning-yoga-flow",
  steps: [
    {
      stepNumber: 1,
      instruction: "Begin in Mountain Pose (Tadasana)...",
      duration: 60,
      imageUrl: "https://media.giphy.com/media/yoga-mountain-pose.gif",
      formCues: [...],
      commonMistakes: [...],
      breathingPattern: "..."
    },
    {
      stepNumber: 2,
      instruction: "Inhale and raise your arms overhead...",
      duration: 45,
      imageUrl: "https://media.giphy.com/media/yoga-raised-arms.gif",
      formCues: [...],
      commonMistakes: [...],
      breathingPattern: "..."
    },
    // ... more steps
  ]
}
```

### Then re-seed database
```bash
cd fitguide_api
npm run seed
```

---

## Best Practices

### Image Guidelines
- **Format**: GIF for animations, JPG/PNG for static
- **Size**: Under 500KB for fast loading
- **Dimensions**: 800x600 or 16:9 aspect ratio recommended
- **Quality**: Clear demonstration of form
- **Background**: Clean, minimal distractions

### Accessibility
- Always include text instructions (imageUrl is optional enhancement)
- Ensure GIFs loop smoothly
- Use high contrast for visibility
- Consider adding alt text in future updates

### Performance
- Lazy load images outside viewport
- Use CDN for external images
- Compress GIFs before upload
- Consider WebP format for better compression

### Legal
- Only use images with proper licenses
- Credit photographers when required
- Don't use copyrighted workout program content
- Free stock photo sites are safest

---

## Testing After Adding Images

1. **Check image loads**
   ```bash
   # Visit workout detail page
   # Click "Let's Begin"
   # Verify images display in execution screen
   ```

2. **Check mobile performance**
   - Images should load quickly
   - GIFs should be smooth
   - No layout shifts

3. **Fallback behavior**
   - If imageUrl is missing, placeholder should show
   - No broken image icons
   - Instruction text still visible

---

## Future Automation Ideas

### Bulk Image Assignment Script
```javascript
// scripts/assignExerciseImages.js
const Workout = require('./models/Workout');
const exerciseService = require('./services/exerciseService');

async function assignImagesAutomatically() {
  const workouts = await Workout.find({});

  for (const workout of workouts) {
    for (const step of workout.steps) {
      // Extract exercise name from instruction
      const exerciseName = step.instruction.split(':')[0].trim();

      // Search for matching exercise
      const exerciseData = await exerciseService.searchExercise(exerciseName);

      if (exerciseData && exerciseData[0]) {
        step.imageUrl = exerciseService.getGifUrl(exerciseData[0]);
      }
    }

    await workout.save();
  }

  console.log('✅ Images assigned to all workouts');
}
```

---

## Summary

**Quickest Option**: Use Giphy or free stock photo URLs directly
**Best Quality**: Use ExerciseDB API for professional exercise GIFs
**Full Control**: Create or purchase custom exercise animations
**Long-term**: Build automation to match exercises with visual assets

Choose the option that best fits your timeline, budget, and quality requirements.
