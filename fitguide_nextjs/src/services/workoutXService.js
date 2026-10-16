/**
 * WorkoutX API Integration Service
 * 
 * Features:
 * - Single-request mass data retrieval to minimize API calls
 * - Multi-day LocalStorage caching (3-day default TTL)
 * - Exact schema alignment with WorkoutX API v1 response
 * - Rich metadata extraction (MET, caloriesPerMinute, recommendedSets/Reps, joint_focus, intensity_level, movement_tags, etc.)
 */

const WORKOUTX_API_BASE = process.env.NEXT_PUBLIC_WORKOUTX_API_BASE || 'https://workoutxapp.com/v1';
const API_KEY = process.env.NEXT_PUBLIC_WORKOUTX_API_KEY || process.env.WORKOUTX_API_KEY || '';
const MONGODB_API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const CACHE_KEY = 'fitguide_workoutx_dataset_v2';
const CACHE_META_KEY = 'fitguide_workoutx_meta_v2';
const CACHE_TTL_DAYS = 3;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000; // 3 Days in milliseconds

/**
 * Rich Fallback Exercise Dataset matching exact WorkoutX API v1 production JSON schema
 */
const DEFAULT_WORKOUTX_EXERCISES = [
  // ── CHEST (10 Exercises) ──────────────────────────────────────────────────
  {
    id: "1001", name: "Barbell Bench Press", bodyPart: "Chest", equipment: "Barbell", target: "Pectorals",
    secondaryMuscles: ["Triceps", "Anterior Deltoids"],
    instructions: ["Lie flat on bench with feet planted.", "Grasp bar slightly wider than shoulder-width.", "Lower bar to mid-chest under control.", "Press bar up until arms are fully extended."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/1001.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "push",
    met: 6.0, caloriesPerMinute: 7.2, description: "Barbell Bench Press is a cornerstone compound pushing exercise targeting the Pectorals.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "4", recommendedReps: "8-12", joint_focus: "shoulder", intensity_level: "high", movement_tags: ["compound", "hypertrophy", "strength"]
  },
  {
    id: "1002", name: "Incline Dumbbell Press", bodyPart: "Chest", equipment: "Dumbbell", target: "Upper Chest",
    secondaryMuscles: ["Anterior Deltoids", "Triceps"],
    instructions: ["Set bench to 30-45 degree incline.", "Hold dumbbells at chest level.", "Press dumbbells upward until fully extended.", "Lower slowly to upper chest."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/1002.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "push",
    met: 5.5, caloriesPerMinute: 6.8, description: "Incline Dumbbell Press targets the upper clavicular head of the chest.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3-4", recommendedReps: "10-12", joint_focus: "shoulder", intensity_level: "moderate", movement_tags: ["hypertrophy", "upper-chest"]
  },
  {
    id: "1003", name: "Bodyweight Push-Up", bodyPart: "Chest", equipment: "Body Weight", target: "Pectorals",
    secondaryMuscles: ["Triceps", "Core", "Anterior Deltoids"],
    instructions: ["Place hands slightly wider than shoulder-width in high plank.", "Lower body until chest nearly touches floor.", "Keep core tight and spine straight.", "Push body back to starting plank."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/1003.gif", category: "strength", difficulty: "beginner", mechanic: "compound", force: "push",
    met: 4.5, caloriesPerMinute: 5.4, description: "Classic bodyweight exercise for chest, shoulder, and core strength.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "3-4", recommendedReps: "15-20", joint_focus: "shoulder", intensity_level: "gentle", movement_tags: ["bodyweight", "beginner-friendly"]
  },
  {
    id: "1004", name: "Standing Cable Crossover Fly", bodyPart: "Chest", equipment: "Cable", target: "Pectorals",
    secondaryMuscles: ["Anterior Deltoids"],
    instructions: ["Set pulley handles at chest height.", "Step forward with one foot for stability.", "Bring handles together in a hugging motion.", "Control return to starting position."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/1004.gif", category: "strength", difficulty: "intermediate", mechanic: "isolation", force: "push",
    met: 4.0, caloriesPerMinute: 4.8, description: "Constant-tension cable isolation exercise for inner chest definition.",
    isUnilateral: false, popularityRank: 3, recommendedSets: "3", recommendedReps: "12-15", joint_focus: "shoulder", intensity_level: "moderate", movement_tags: ["isolation", "cables", "pump"]
  },
  {
    id: "1005", name: "Parallel Bar Chest Dips", bodyPart: "Chest", equipment: "Body Weight", target: "Lower Chest",
    secondaryMuscles: ["Triceps", "Anterior Deltoids"],
    instructions: ["Mount dip station with arms extended.", "Lean torso forward 30 degrees.", "Lower body until shoulders are below elbows.", "Drive body up to starting position."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/1005.gif", category: "strength", difficulty: "advanced", mechanic: "compound", force: "push",
    met: 7.0, caloriesPerMinute: 8.5, description: "Advanced bodyweight movement targeting the lower pectoral region.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3-4", recommendedReps: "8-12", joint_focus: "shoulder", intensity_level: "high", movement_tags: ["bodyweight", "advanced", "lower-chest"]
  },
  {
    id: "1006", name: "Dumbbell Pullover", bodyPart: "Chest", equipment: "Dumbbell", target: "Pectorals",
    secondaryMuscles: ["Lats", "Serratus Anterior", "Triceps"],
    instructions: ["Lie perpendicular across bench with shoulders supported.", "Hold single dumbbell overhead with both hands.", "Lower dumbbell backward over head in an arc.", "Pull dumbbell back to vertical position."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/1006.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "pull",
    met: 4.5, caloriesPerMinute: 5.5, description: "Classic chest expander movement engaging the serratus and lats.",
    isUnilateral: false, popularityRank: 4, recommendedSets: "3", recommendedReps: "10-12", joint_focus: "shoulder", intensity_level: "moderate", movement_tags: ["chest-expansion", "serratus"]
  },
  {
    id: "1007", name: "Pec Deck Butterfly Machine", bodyPart: "Chest", equipment: "Leverage Machine", target: "Pectorals",
    secondaryMuscles: ["Anterior Deltoids"],
    instructions: ["Sit with back flat against machine pad.", "Place forearms against pads or grasp handles.", "Squeeze handles together in front of chest.", "Slowly return to start under control."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/1007.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "push",
    met: 3.8, caloriesPerMinute: 4.6, description: "Machine-assisted pectoral isolation exercise for maximum chest squeeze.",
    isUnilateral: false, popularityRank: 3, recommendedSets: "3", recommendedReps: "12-15", joint_focus: "shoulder", intensity_level: "gentle", movement_tags: ["machine", "isolation", "beginner"]
  },
  {
    id: "1008", name: "Decline Barbell Bench Press", bodyPart: "Chest", equipment: "Barbell", target: "Lower Chest",
    secondaryMuscles: ["Triceps", "Anterior Deltoids"],
    instructions: ["Secure feet at top of decline bench.", "Grasp barbell with medium grip.", "Lower bar to lower sternum level.", "Press bar straight up to extension."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/1008.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "push",
    met: 5.8, caloriesPerMinute: 7.0, description: "Decline variation focusing power on the inferior pectoral fibers.",
    isUnilateral: false, popularityRank: 4, recommendedSets: "3-4", recommendedReps: "8-10", joint_focus: "shoulder", intensity_level: "high", movement_tags: ["decline", "lower-chest", "strength"]
  },
  {
    id: "1009", name: "Landmine Chest Press", bodyPart: "Chest", equipment: "Barbell", target: "Upper Chest",
    secondaryMuscles: ["Anterior Deltoids", "Core"],
    instructions: ["Place one end of barbell in landmine base.", "Hold free end with both hands at chest level.", "Press sleeve upward and forward at an angle.", "Lower with control to chest."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/1009.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "push",
    met: 5.0, caloriesPerMinute: 6.0, description: "Joint-friendly angled pressing movement for upper chest and shoulders.",
    isUnilateral: false, popularityRank: 4, recommendedSets: "3", recommendedReps: "10-12", joint_focus: "shoulder", intensity_level: "moderate", movement_tags: ["landmine", "joint-friendly"]
  },
  {
    id: "1010", name: "Dumbbell Svend Press", bodyPart: "Chest", equipment: "Dumbbell", target: "Inner Chest",
    secondaryMuscles: ["Anterior Deltoids"],
    instructions: ["Stand tall holding weight plate or dumbbell between palms.", "Squeeze hands inward continuously.", "Extend arms straight out from chest.", "Pull back to chest while maintaining inward pressure."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/1010.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "push",
    met: 3.5, caloriesPerMinute: 4.2, description: "Isometric squeeze pressing exercise for maximum inner chest activation.",
    isUnilateral: false, popularityRank: 5, recommendedSets: "3", recommendedReps: "15-20", joint_focus: "elbow", intensity_level: "gentle", movement_tags: ["isometric", "squeeze", "finisher"]
  },

  // ── BACK (10 Exercises) ───────────────────────────────────────────────────
  {
    id: "2001", name: "Barbell Conventional Deadlift", bodyPart: "Back", equipment: "Barbell", target: "Erector Spinae",
    secondaryMuscles: ["Hamstrings", "Glutes", "Traps", "Lats"],
    instructions: ["Stand with feet hip-width apart under bar.", "Hinge at hips to grasp bar with overhand grip.", "Keep spine neutral and chest up.", "Drive through heels to stand tall."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/2001.gif", category: "strength", difficulty: "advanced", mechanic: "compound", force: "pull",
    met: 8.0, caloriesPerMinute: 9.6, description: "King of compound movements building full posterior chain power.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "3-5", recommendedReps: "5-8", joint_focus: "hip", intensity_level: "very_high", movement_tags: ["deadlift", "posterior-chain", "strength"]
  },
  {
    id: "2002", name: "Bent-Over Barbell Row", bodyPart: "Back", equipment: "Barbell", target: "Lats",
    secondaryMuscles: ["Rhomboids", "Rear Deltoids", "Biceps"],
    instructions: ["Hinge forward to 45 degrees with knees slightly bent.", "Grasp bar with overhand grip.", "Pull bar to lower sternum/navel.", "Lower bar under control."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/2002.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "pull",
    met: 6.0, caloriesPerMinute: 7.2, description: "Fundamental back thickness builder targeting mid-back and lats.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "4", recommendedReps: "8-10", joint_focus: "shoulder", intensity_level: "high", movement_tags: ["rowing", "back-thickness"]
  },
  {
    id: "2003", name: "Wide-Grip Lat Pulldown", bodyPart: "Back", equipment: "Cable", target: "Lats",
    secondaryMuscles: ["Biceps", "Rhomboids"],
    instructions: ["Grasp wide bar with overhand grip.", "Sit with thighs secured under roller pads.", "Pull bar down to upper chest while arching upper back slightly.", "Return smoothly to full arm stretch."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/2003.gif", category: "strength", difficulty: "beginner", mechanic: "compound", force: "pull",
    met: 4.5, caloriesPerMinute: 5.5, description: "Essential cable pulling exercise building upper back width.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "3-4", recommendedReps: "10-12", joint_focus: "shoulder", intensity_level: "moderate", movement_tags: ["cables", "lat-width", "beginner-friendly"]
  },
  {
    id: "2004", name: "Overhand Bodyweight Pull-Up", bodyPart: "Back", equipment: "Pull-Up Bar", target: "Lats",
    secondaryMuscles: ["Biceps", "Core", "Rhomboids"],
    instructions: ["Hang from bar with overhand grip slightly wider than shoulders.", "Pull body upward until chin passes bar.", "Lower body back down to full arm hanging lockout.", "Avoid swinging or kicking legs."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/2004.gif", category: "strength", difficulty: "advanced", mechanic: "compound", force: "pull",
    met: 7.5, caloriesPerMinute: 9.0, description: "Ultimate upper body pulling test for back breadth and grip strength.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3-4", recommendedReps: "6-10", joint_focus: "shoulder", intensity_level: "high", movement_tags: ["bodyweight", "pull-up", "advanced"]
  },
  {
    id: "2005", name: "Seated Cable Row (V-Bar Handle)", bodyPart: "Back", equipment: "Cable", target: "Rhomboids",
    secondaryMuscles: ["Lats", "Rear Deltoids", "Biceps"],
    instructions: ["Sit on cable row bench with feet on footplates.", "Grasp V-bar handle with arms extended.", "Pull handle to lower abdomen while squeezing shoulder blades.", "Return to stretch position."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/2005.gif", category: "strength", difficulty: "beginner", mechanic: "compound", force: "pull",
    met: 5.0, caloriesPerMinute: 6.0, description: "Mid-back builder improving posture and scapular retraction.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3-4", recommendedReps: "10-12", joint_focus: "shoulder", intensity_level: "moderate", movement_tags: ["seated-row", "posture", "rhomboids"]
  },
  {
    id: "2006", name: "Single-Arm Dumbbell Row", bodyPart: "Back", equipment: "Dumbbell", target: "Lats",
    secondaryMuscles: ["Rhomboids", "Biceps", "Core"],
    instructions: ["Place left knee and hand on flat bench.", "Hold dumbbell in right hand hanging straight down.", "Pull dumbbell to hip crease while driving elbow back.", "Lower under control."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/2006.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "pull",
    met: 5.5, caloriesPerMinute: 6.6, description: "Unilateral back exercise correcting left-to-right strength imbalances.",
    isUnilateral: true, popularityRank: 2, recommendedSets: "3", recommendedReps: "10-12 per side", joint_focus: "shoulder", intensity_level: "moderate", movement_tags: ["unilateral", "dumbbell-row"]
  },
  {
    id: "2007", name: "T-Bar Landmine Row", bodyPart: "Back", equipment: "Barbell", target: "Mid-Back",
    secondaryMuscles: ["Lats", "Traps", "Rear Deltoids"],
    instructions: ["Straddle landmine bar with V-handle placed under bar.", "Hinge forward at 45 degrees.", "Pull handles to chest keeping elbows close.", "Lower bar under control."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/2007.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "pull",
    met: 6.5, caloriesPerMinute: 7.8, description: "Heavy rowing movement for thick upper and middle back development.",
    isUnilateral: false, popularityRank: 3, recommendedSets: "4", recommendedReps: "8-10", joint_focus: "shoulder", intensity_level: "high", movement_tags: ["t-bar", "landmine", "back-thickness"]
  },
  {
    id: "2008", name: "Hyperextension Back Extension", bodyPart: "Back", equipment: "Body Weight", target: "Erector Spinae",
    secondaryMuscles: ["Glutes", "Hamstrings"],
    instructions: ["Lock ankles in 45-degree hyperextension bench.", "Cross arms across chest.", "Hinge down at waist until torso is perpendicular to floor.", "Raise torso until aligned with legs."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/2008.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "pull",
    met: 4.0, caloriesPerMinute: 4.8, description: "Lower back strengthening exercise improving spinal endurance.",
    isUnilateral: false, popularityRank: 3, recommendedSets: "3", recommendedReps: "12-15", joint_focus: "hip", intensity_level: "gentle", movement_tags: ["lower-back", "spine-health"]
  },
  {
    id: "2009", name: "Cable Face Pull", bodyPart: "Back", equipment: "Cable", target: "Rear Deltoids",
    secondaryMuscles: ["Rhomboids", "Infraspinatus", "Traps"],
    instructions: ["Set rope attachment at eye height on cable column.", "Grasp rope ends with thumbs pointing back.", "Pull rope toward face, spreading ends apart at nose level.", "Return under control."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/2009.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "pull",
    met: 3.5, caloriesPerMinute: 4.2, description: "Essential rotator cuff and posterior deltoid prehab exercise.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3", recommendedReps: "15-20", joint_focus: "shoulder", intensity_level: "gentle", movement_tags: ["prehab", "shoulder-health", "face-pull"]
  },
  {
    id: "2010", name: "Straight-Arm Cable Lat Pulldown", bodyPart: "Back", equipment: "Cable", target: "Lats",
    secondaryMuscles: ["Triceps Long Head", "Core"],
    instructions: ["Stand facing high cable with straight bar attachment.", "Grasp bar overhead with arms almost straight.", "Pull bar down in an arc to thighs keeping arms rigid.", "Return to top stretch."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/2010.gif", category: "strength", difficulty: "intermediate", mechanic: "isolation", force: "pull",
    met: 4.2, caloriesPerMinute: 5.0, description: "Lat isolation exercise isolating the lats without bicep involvement.",
    isUnilateral: false, popularityRank: 4, recommendedSets: "3", recommendedReps: "12-15", joint_focus: "shoulder", intensity_level: "moderate", movement_tags: ["lat-isolation", "straight-arm"]
  },

  // ── SHOULDERS (10 Exercises) ──────────────────────────────────────────────
  {
    id: "3001", name: "Overhead Barbell Military Press", bodyPart: "Shoulders", equipment: "Barbell", target: "Anterior Deltoids",
    secondaryMuscles: ["Lateral Deltoids", "Triceps", "Upper Chest"],
    instructions: ["Stand tall holding barbell at collarbone height.", "Brace core and squeeze glutes.", "Press bar straight overhead to lockout.", "Lower under control to chest."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/3001.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "push",
    met: 6.0, caloriesPerMinute: 7.2, description: "Premier vertical press for shoulder mass and upper body strength.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "4", recommendedReps: "6-8", joint_focus: "shoulder", intensity_level: "high", movement_tags: ["overhead-press", "military-press"]
  },
  {
    id: "3002", name: "Seated Dumbbell Arnold Press", bodyPart: "Shoulders", equipment: "Dumbbell", target: "Deltoids",
    secondaryMuscles: ["Triceps", "Upper Traps"],
    instructions: ["Sit on upright bench holding dumbbells at chin height, palms facing in.", "As you press upward, rotate wrists so palms face forward at top.", "Reverse motion on descent."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/3002.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "push",
    met: 5.5, caloriesPerMinute: 6.6, description: "Rotational shoulder press engaging all three deltoid heads.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3-4", recommendedReps: "10-12", joint_focus: "shoulder", intensity_level: "moderate", movement_tags: ["arnold-press", "rotational"]
  },
  {
    id: "3003", name: "Standing Dumbbell Lateral Raise", bodyPart: "Shoulders", equipment: "Dumbbell", target: "Lateral Deltoids",
    secondaryMuscles: ["Traps"],
    instructions: ["Stand tall with dumbbells by your sides.", "Raise arms out to sides with soft bend in elbows.", "Lift until arms are parallel to floor.", "Lower slowly."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/3003.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "push",
    met: 4.0, caloriesPerMinute: 4.8, description: "Key isolation exercise for building shoulder width (capped delts).",
    isUnilateral: false, popularityRank: 1, recommendedSets: "3-4", recommendedReps: "12-15", joint_focus: "shoulder", intensity_level: "moderate", movement_tags: ["lateral-raise", "capped-delts"]
  },
  {
    id: "3004", name: "Dumbbell Front Raise", bodyPart: "Shoulders", equipment: "Dumbbell", target: "Anterior Deltoids",
    secondaryMuscles: ["Upper Chest"],
    instructions: ["Hold dumbbells in front of thighs.", "Raise one or both arms straight forward to shoulder height.", "Pause briefly at top.", "Lower back down under control."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/3004.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "push",
    met: 3.8, caloriesPerMinute: 4.5, description: "Targeted anterior shoulder head builder.",
    isUnilateral: false, popularityRank: 3, recommendedSets: "3", recommendedReps: "12-15", joint_focus: "shoulder", intensity_level: "gentle", movement_tags: ["front-raise", "isolation"]
  },
  {
    id: "3005", name: "Reverse Pec Deck Rear Delt Fly", bodyPart: "Shoulders", equipment: "Leverage Machine", target: "Rear Deltoids",
    secondaryMuscles: ["Rhomboids", "Mid Traps"],
    instructions: ["Sit chest against pec deck machine facing handles.", "Grasp handles at shoulder level.", "Pull handles out and back in arc motion.", "Squeeze rear shoulders at full extension."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/3005.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "pull",
    met: 3.8, caloriesPerMinute: 4.6, description: "Machine rear deltoid builder for shoulder posture and balance.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3-4", recommendedReps: "12-15", joint_focus: "shoulder", intensity_level: "gentle", movement_tags: ["rear-delt", "machine", "posture"]
  },
  {
    id: "3006", name: "Barbell Upright Row", bodyPart: "Shoulders", equipment: "Barbell", target: "Lateral Deltoids",
    secondaryMuscles: ["Traps", "Biceps"],
    instructions: ["Hold barbell at thighs with overhand grip width.", "Pull bar straight up close to body toward chin level.", "Elbows should lead movement and stay higher than hands.", "Lower with control."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/3006.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "pull",
    met: 5.0, caloriesPerMinute: 6.0, description: "Compound shoulder builder hitting side delts and upper traps.",
    isUnilateral: false, popularityRank: 3, recommendedSets: "3", recommendedReps: "10-12", joint_focus: "shoulder", intensity_level: "moderate", movement_tags: ["upright-row", "traps"]
  },
  {
    id: "3007", name: "Barbell Push Press", bodyPart: "Shoulders", equipment: "Barbell", target: "Anterior Deltoids",
    secondaryMuscles: ["Quads", "Triceps", "Core"],
    instructions: ["Rack barbell across shoulders at collarbone.", "Dip knees slightly in quick quarter squat.", "Explode upward through legs and drive bar overhead.", "Lock out arms at top."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/3007.gif", category: "strength", difficulty: "advanced", mechanic: "compound", force: "push",
    met: 7.5, caloriesPerMinute: 9.0, description: "Explosive full-body overhead press for power and overhead stability.",
    isUnilateral: false, popularityRank: 3, recommendedSets: "4", recommendedReps: "5-8", joint_focus: "shoulder", intensity_level: "very_high", movement_tags: ["explosive", "push-press", "power"]
  },
  {
    id: "3008", name: "Dumbbell Shrugs", bodyPart: "Shoulders", equipment: "Dumbbell", target: "Upper Traps",
    secondaryMuscles: ["Forearms"],
    instructions: ["Stand holding heavy dumbbells at sides.", "Elevate shoulders straight up toward ears as high as possible.", "Hold top squeeze for 1-2 seconds.", "Lower back down fully."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/3008.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "pull",
    met: 4.0, caloriesPerMinute: 4.8, description: "Direct upper trapezius isolation exercise for thick neck and upper back.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3-4", recommendedReps: "12-15", joint_focus: "scapula", intensity_level: "gentle", movement_tags: ["shrugs", "traps", "grip"]
  },
  {
    id: "3009", name: "Cuban Dumbbell Press", bodyPart: "Shoulders", equipment: "Dumbbell", target: "Rotator Cuff",
    secondaryMuscles: ["Rear Deltoids", "Lateral Deltoids"],
    instructions: ["Upright row dumbbells to chest height with elbows high.", "Externally rotate shoulders so dumbbells swing up beside ears.", "Press overhead to lockout.", "Reverse steps back."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/3009.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "push",
    met: 4.2, caloriesPerMinute: 5.0, description: "Complex shoulder mobility and rotator cuff health builder.",
    isUnilateral: false, popularityRank: 5, recommendedSets: "3", recommendedReps: "10-12", joint_focus: "shoulder", intensity_level: "moderate", movement_tags: ["rotator-cuff", "mobility"]
  },
  {
    id: "3010", name: "Single-Arm Landmine Shoulder Press", bodyPart: "Shoulders", equipment: "Barbell", target: "Anterior Deltoids",
    secondaryMuscles: ["Core", "Triceps"],
    instructions: ["Hold sleeve end of landmine barbell at shoulder in one hand.", "Press up and forward diagonally.", "Lower back to shoulder under control."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/3010.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "push",
    met: 5.2, caloriesPerMinute: 6.2, description: "Unilateral shoulder press providing shoulder-blade-friendly arc motion.",
    isUnilateral: true, popularityRank: 4, recommendedSets: "3", recommendedReps: "10-12 per side", joint_focus: "shoulder", intensity_level: "moderate", movement_tags: ["unilateral", "landmine"]
  },

  // ── ARMS (10 Exercises) ───────────────────────────────────────────────────
  {
    id: "4001", name: "Standing Barbell Bicep Curl", bodyPart: "Arms", equipment: "Barbell", target: "Biceps Brachii",
    secondaryMuscles: ["Brachialis", "Forearms"],
    instructions: ["Stand tall holding barbell with underhand shoulder-width grip.", "Keep upper arms pinned to sides.", "Curl bar up toward shoulders by flexing biceps.", "Lower back down under 2-second control."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/4001.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "pull",
    met: 4.5, caloriesPerMinute: 5.4, description: "The classic bicep mass builder for peak and arm thickness.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "3-4", recommendedReps: "8-12", joint_focus: "elbow", intensity_level: "moderate", movement_tags: ["bicep-curl", "barbell", "arm-mass"]
  },
  {
    id: "4002", name: "Standing Dumbbell Hammer Curl", bodyPart: "Arms", equipment: "Dumbbell", target: "Brachialis",
    secondaryMuscles: ["Biceps", "Brachioradialis"],
    instructions: ["Hold dumbbells at sides with neutral grip (palms facing body).", "Curl dumbbells upward keeping palms facing each other throughout.", "Squeeze at top.", "Lower under control."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/4002.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "pull",
    met: 4.2, caloriesPerMinute: 5.0, description: "Neutral grip curl building forearm size and deep brachialis muscle.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "3-4", recommendedReps: "10-12", joint_focus: "elbow", intensity_level: "moderate", movement_tags: ["hammer-curl", "forearms", "brachialis"]
  },
  {
    id: "4003", name: "Incline Dumbbell Bicep Curl", bodyPart: "Arms", equipment: "Dumbbell", target: "Biceps Long Head",
    secondaryMuscles: ["Forearms"],
    instructions: ["Sit on incline bench set to 45-60 degrees.", "Let arms hang straight down behind torso stretch.", "Curl dumbbells up while keeping elbows pointing down.", "Lower for maximum long-head stretch."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/4003.gif", category: "strength", difficulty: "intermediate", mechanic: "isolation", force: "pull",
    met: 4.0, caloriesPerMinute: 4.8, description: "Incline position stretches long head of bicep for superior peak creation.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3", recommendedReps: "10-12", joint_focus: "elbow", intensity_level: "moderate", movement_tags: ["bicep-peak", "incline-curl"]
  },
  {
    id: "4004", name: "Preacher EZ-Bar Curl", bodyPart: "Arms", equipment: "EZ Bar", target: "Biceps Short Head",
    secondaryMuscles: ["Forearms"],
    instructions: ["Rest upper arms flat against preacher bench pad.", "Grasp inner handles of EZ bar.", "Curl bar up until forearms are vertical.", "Lower smoothly to full elbow extension."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/4004.gif", category: "strength", difficulty: "intermediate", mechanic: "isolation", force: "pull",
    met: 4.2, caloriesPerMinute: 5.0, description: "Strict isolated bicep curl eliminating momentum and chest compensation.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3-4", recommendedReps: "10-12", joint_focus: "elbow", intensity_level: "moderate", movement_tags: ["preacher-curl", "strict"]
  },
  {
    id: "4005", name: "Concentration Seated Dumbbell Curl", bodyPart: "Arms", equipment: "Dumbbell", target: "Biceps",
    secondaryMuscles: ["Brachialis"],
    instructions: ["Sit on bench, brace elbow against inner thigh.", "Curl dumbbell up to chest level.", "Focus entirely on bicep contraction.", "Lower under full control."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/4005.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "pull",
    met: 3.8, caloriesPerMinute: 4.5, description: "Unilateral bicep exercise maximizing mind-muscle connection.",
    isUnilateral: true, popularityRank: 3, recommendedSets: "3", recommendedReps: "12-15 per side", joint_focus: "elbow", intensity_level: "gentle", movement_tags: ["concentration-curl", "mind-muscle"]
  },
  {
    id: "4006", name: "Tricep Parallel Bar Dips", bodyPart: "Arms", equipment: "Body Weight", target: "Triceps",
    secondaryMuscles: ["Chest", "Anterior Deltoids"],
    instructions: ["Hold yourself at arm length above dip bars.", "Keep torso upright (don't lean forward).", "Bend elbows to lower body until upper arms are parallel to floor.", "Push back up to arm lockout."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/4006.gif", category: "strength", difficulty: "advanced", mechanic: "compound", force: "push",
    met: 7.0, caloriesPerMinute: 8.4, description: "Heavy compound movement targeting all three tricep heads.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "3-4", recommendedReps: "8-12", joint_focus: "elbow", intensity_level: "high", movement_tags: ["tricep-dips", "bodyweight"]
  },
  {
    id: "4007", name: "Skull Crushers (EZ-Bar)", bodyPart: "Arms", equipment: "EZ Bar", target: "Triceps Long Head",
    secondaryMuscles: ["Forearms"],
    instructions: ["Lie flat on bench holding EZ bar straight overhead.", "Keeping upper arms vertical, bend elbows to lower bar to forehead.", "Extend elbows back up to full lockout."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/4007.gif", category: "strength", difficulty: "intermediate", mechanic: "isolation", force: "push",
    met: 4.8, caloriesPerMinute: 5.7, description: "Classic extension movement targeting long head for horseshoe triceps.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "3-4", recommendedReps: "10-12", joint_focus: "elbow", intensity_level: "moderate", movement_tags: ["skullcrushers", "tricep-extension"]
  },
  {
    id: "4008", name: "High Cable Tricep Rope Pushdown", bodyPart: "Arms", equipment: "Cable", target: "Triceps Lateral Head",
    secondaryMuscles: ["Forearms"],
    instructions: ["Attach rope to high cable pulley.", "Grasp rope ends with elbows pinned to ribs.", "Push rope down and spread ends apart at bottom of motion.", "Control return up to chest height."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/4008.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "push",
    met: 4.0, caloriesPerMinute: 4.8, description: "Cable isolation exercise giving peak lateral tricep contraction.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "3-4", recommendedReps: "12-15", joint_focus: "elbow", intensity_level: "gentle", movement_tags: ["pushdown", "cables", "triceps"]
  },
  {
    id: "4009", name: "Overhead Dumbbell Tricep Extension", bodyPart: "Arms", equipment: "Dumbbell", target: "Triceps Long Head",
    secondaryMuscles: ["Core"],
    instructions: ["Sit or stand holding single heavy dumbbell overhead with both hands.", "Lower dumbbell behind head by bending elbows while keeping upper arms close to ears.", "Extend back to top position."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/4009.gif", category: "strength", difficulty: "intermediate", mechanic: "isolation", force: "push",
    met: 4.5, caloriesPerMinute: 5.4, description: "Overhead extension placing maximum stretch on tricep long head.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3", recommendedReps: "10-12", joint_focus: "elbow", intensity_level: "moderate", movement_tags: ["overhead-extension", "triceps"]
  },
  {
    id: "4010", name: "Close-Grip Barbell Bench Press", bodyPart: "Arms", equipment: "Barbell", target: "Triceps",
    secondaryMuscles: ["Chest", "Anterior Deltoids"],
    instructions: ["Lie on flat bench, grasp bar with shoulder-width or slightly narrower grip.", "Lower bar to lower chest keeping elbows tucked tight to ribs.", "Press barbell straight up."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/4010.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "push",
    met: 6.0, caloriesPerMinute: 7.2, description: "Compound tricep overload exercise allowing heavy weights.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3-4", recommendedReps: "6-8", joint_focus: "elbow", intensity_level: "high", movement_tags: ["close-grip", "tricep-mass"]
  },

  // ── LEGS (10 Exercises) ───────────────────────────────────────────────────
  {
    id: "5001", name: "Barbell High-Bar Back Squat", bodyPart: "Legs", equipment: "Barbell", target: "Quads",
    secondaryMuscles: ["Glutes", "Hamstrings", "Core", "Erector Spinae"],
    instructions: ["Place bar on upper traps, feet shoulder-width apart.", "Break at hips and knees simultaneously.", "Squat deep until thighs are parallel or below parallel to floor.", "Drive upward through midfoot to stand."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/5001.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "push",
    met: 7.5, caloriesPerMinute: 9.0, description: "The definitive lower body strength and quad hypertrophy exercise.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "4", recommendedReps: "8-10", joint_focus: "knee", intensity_level: "high", movement_tags: ["squat", "quads", "leg-day"]
  },
  {
    id: "5002", name: "Romanian Deadlift (RDL)", bodyPart: "Legs", equipment: "Barbell", target: "Hamstrings",
    secondaryMuscles: ["Glutes", "Lower Back"],
    instructions: ["Stand holding bar at hip height with soft knees.", "Hinge backward at hips sliding bar down quads to mid-shin.", "Feel deep hamstring stretch.", "Drive hips forward to return upright."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/5002.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "pull",
    met: 6.0, caloriesPerMinute: 7.2, description: "Premier hip-hinge exercise for loaded hamstring and glute development.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "3-4", recommendedReps: "8-12", joint_focus: "hip", intensity_level: "high", movement_tags: ["rdl", "hamstrings", "hip-hinge"]
  },
  {
    id: "5003", name: "Bulgarian Split Squat", bodyPart: "Legs", equipment: "Dumbbell", target: "Quads",
    secondaryMuscles: ["Glutes", "Hamstrings", "Core"],
    instructions: ["Place rear foot on bench behind you.", "Lower front thigh to parallel by bending front knee.", "Keep front knee tracking over toes.", "Push up through front heel."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/5003.gif", category: "strength", difficulty: "advanced", mechanic: "compound", force: "push",
    met: 6.5, caloriesPerMinute: 7.8, description: "Brutal unilateral quad and glute builder building single-leg power.",
    isUnilateral: true, popularityRank: 1, recommendedSets: "3", recommendedReps: "8-10 per side", joint_focus: "knee", intensity_level: "high", movement_tags: ["unilateral", "bulgarian", "leg-growth"]
  },
  {
    id: "5004", name: "45° Incline Leg Press", bodyPart: "Legs", equipment: "Leverage Machine", target: "Quads",
    secondaryMuscles: ["Glutes", "Hamstrings"],
    instructions: ["Sit in leg press with back firmly against pad.", "Place feet hip-width apart on sled.", "Release safeties and lower sled until knees bend to 90 degrees.", "Press sled back up without locking knees."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/5004.gif", category: "strength", difficulty: "beginner", mechanic: "compound", force: "push",
    met: 5.5, caloriesPerMinute: 6.6, description: "Machine squat alternative allowing high-volume quad overload safely.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "4", recommendedReps: "10-15", joint_focus: "knee", intensity_level: "moderate", movement_tags: ["leg-press", "machine", "quads"]
  },
  {
    id: "5005", name: "Kettlebell Goblet Squat", bodyPart: "Legs", equipment: "Kettlebell", target: "Quads",
    secondaryMuscles: ["Glutes", "Core"],
    instructions: ["Hold kettlebell against chest by horns.", "Squat down between knees keeping chest upright.", "Drive elbows inside knees at bottom.", "Press back up to standing."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/5005.gif", category: "strength", difficulty: "beginner", mechanic: "compound", force: "push",
    met: 5.0, caloriesPerMinute: 6.0, description: "Excellent beginner-friendly squat builder encouraging upright torso posture.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3", recommendedReps: "12-15", joint_focus: "knee", intensity_level: "gentle", movement_tags: ["goblet-squat", "beginner", "kettlebell"]
  },
  {
    id: "5006", name: "Lying Hamstring Leg Curl Machine", bodyPart: "Legs", equipment: "Leverage Machine", target: "Hamstrings",
    secondaryMuscles: ["Calves"],
    instructions: ["Lie face down on leg curl machine with roller pad above ankles.", "Curl legs upward toward glutes in smooth motion.", "Squeeze hamstrings at peak contraction.", "Lower back down under 2-second control."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/5006.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "pull",
    met: 4.0, caloriesPerMinute: 4.8, description: "Isolated hamstring knee-flexion exercise.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3-4", recommendedReps: "10-12", joint_focus: "knee", intensity_level: "gentle", movement_tags: ["hamstring-curl", "isolation"]
  },
  {
    id: "5007", name: "Seated Leg Extension Machine", bodyPart: "Legs", equipment: "Leverage Machine", target: "Quads",
    secondaryMuscles: [],
    instructions: ["Sit in machine with back pad adjusted firmly.", "Place lower shins under roller pad.", "Extend legs upward until knees are fully extended.", "Lower under control back to 90 degrees."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/5007.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "push",
    met: 3.8, caloriesPerMinute: 4.5, description: "Pure quad isolation movement hitting the rectus femoris.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3-4", recommendedReps: "12-15", joint_focus: "knee", intensity_level: "gentle", movement_tags: ["leg-extension", "quad-isolation"]
  },
  {
    id: "5008", name: "Standing Barbell Calf Raise", bodyPart: "Legs", equipment: "Barbell", target: "Gastrocnemius",
    secondaryMuscles: ["Soleus"],
    instructions: ["Place balls of feet on raised block with heels hanging off.", "Hold barbell across traps.", "Lower heels as far down as stretch permits.", "Drive up onto big toes for high squeeze."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/5008.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "push",
    met: 3.5, caloriesPerMinute: 4.2, description: "Direct calf builder for lower leg strength and ankle stability.",
    isUnilateral: false, popularityRank: 3, recommendedSets: "4", recommendedReps: "15-20", joint_focus: "ankle", intensity_level: "gentle", movement_tags: ["calf-raise", "ankle-strength"]
  },
  {
    id: "5009", name: "Dumbbell Walking Lunges", bodyPart: "Legs", equipment: "Dumbbell", target: "Quads",
    secondaryMuscles: ["Glutes", "Hamstrings", "Calves"],
    instructions: ["Hold dumbbells at sides.", "Step forward with right leg, lowering left knee toward floor.", "Push through right heel to step forward into next lunge.", "Continue alternating forward."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/5009.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "push",
    met: 6.0, caloriesPerMinute: 7.2, description: "Dynamic locomotion lunge building stamina and unilateral leg drive.",
    isUnilateral: true, popularityRank: 2, recommendedSets: "3", recommendedReps: "10-12 steps per leg", joint_focus: "knee", intensity_level: "high", movement_tags: ["walking-lunges", "dynamic"]
  },
  {
    id: "5010", name: "Barbell Glute Hip Thrust", bodyPart: "Legs", equipment: "Barbell", target: "Gluteus Maximus",
    secondaryMuscles: ["Hamstrings", "Core"],
    instructions: ["Sit on floor with upper back against bench, padded barbell across hips.", "Drive through heels to extend hips horizontally until body forms straight line.", "Squeeze glutes hard at top.", "Lower hips to floor."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/5010.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "push",
    met: 5.5, caloriesPerMinute: 6.6, description: "Premier glute builder for hip extension power and glute shape.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "4", recommendedReps: "10-12", joint_focus: "hip", intensity_level: "moderate", movement_tags: ["hip-thrust", "glutes"]
  },

  // ── WAIST / CORE (10 Exercises) ───────────────────────────────────────────
  {
    id: "6001", name: "Classic Abdominal Crunch", bodyPart: "Waist", equipment: "Body Weight", target: "Abs",
    secondaryMuscles: ["Obliques"],
    instructions: ["Lie on back with knees bent and feet flat.", "Place hands behind ears.", "Flex waist to lift shoulder blades 3-4 inches off mat.", "Pause and lower slowly."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/6001.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "push",
    met: 3.5, caloriesPerMinute: 4.2, description: "Basic abdominal flexor builder targeting the rectus abdominis.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "3", recommendedReps: "15-20", joint_focus: "lumbar_spine", intensity_level: "gentle", movement_tags: ["crunches", "beginner", "abs"]
  },
  {
    id: "6002", name: "Hanging Straight Leg Raise", bodyPart: "Waist", equipment: "Pull-Up Bar", target: "Lower Abs",
    secondaryMuscles: ["Hip Flexors", "Grip"],
    instructions: ["Hang straight from pull-up bar.", "Keeping legs fully extended, raise legs to 90 degrees in front.", "Pause at parallel level.", "Lower under full control without swinging."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/6002.gif", category: "strength", difficulty: "advanced", mechanic: "isolation", force: "pull",
    met: 5.0, caloriesPerMinute: 6.0, description: "Advanced lower abdominal and hip flexor strength exercise.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3", recommendedReps: "10-12", joint_focus: "hip", intensity_level: "high", movement_tags: ["hanging", "lower-abs", "advanced"]
  },
  {
    id: "6003", name: "Bicycle Crunch with Rotation", bodyPart: "Waist", equipment: "Body Weight", target: "Abs",
    secondaryMuscles: ["Obliques", "Hip Flexors"],
    instructions: ["Lie on back, lift legs to tabletop with knees bent.", "Touch right elbow to left knee while extending right leg straight.", "Switch continuously in pedaling motion."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/6003.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "push",
    met: 4.0, caloriesPerMinute: 4.8, description: "Top-rated exercise for simultaneous rectus abdominis and oblique work.",
    isUnilateral: true, popularityRank: 1, recommendedSets: "3", recommendedReps: "20 reps total", joint_focus: "lumbar_spine", intensity_level: "gentle", movement_tags: ["bicycle-crunch", "obliques"]
  },
  {
    id: "6004", name: "Weighted Russian Twists", bodyPart: "Waist", equipment: "Dumbbell", target: "Obliques",
    secondaryMuscles: ["Abs", "Lower Back"],
    instructions: ["Sit on mat with knees bent, lean torso back to 45 degrees.", "Hold dumbbell or weight at chest.", "Rotate torso from left side to right side smoothly.", "Keep feet elevated for extra challenge."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/6004.gif", category: "strength", difficulty: "intermediate", mechanic: "isolation", force: "push",
    met: 4.5, caloriesPerMinute: 5.4, description: "Rotational core builder strengthening lateral abdominal walls.",
    isUnilateral: true, popularityRank: 2, recommendedSets: "3", recommendedReps: "20 twists total", joint_focus: "spine", intensity_level: "moderate", movement_tags: ["russian-twist", "rotational"]
  },
  {
    id: "6005", name: "Isometric Forearm Plank Hold", bodyPart: "Waist", equipment: "Body Weight", target: "Transverse Abdominis",
    secondaryMuscles: ["Glutes", "Shoulders", "Quads"],
    instructions: ["Rest on forearms and toes with elbows directly below shoulders.", "Squeeze glutes and draw navel toward spine.", "Maintain straight rigid plank from head to heels.", "Hold for duration without letting hips sag."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/6005.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "push",
    met: 3.5, caloriesPerMinute: 4.2, description: "Core stabilization benchmark building deep transverse abdominal strength.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "3", recommendedReps: "45-60 second hold", joint_focus: "spine", intensity_level: "gentle", movement_tags: ["plank", "isometric", "core-stability"]
  },
  {
    id: "6006", name: "Forearm Side Plank Hold", bodyPart: "Waist", equipment: "Body Weight", target: "Obliques",
    secondaryMuscles: ["Glute Medius", "Shoulders"],
    instructions: ["Lie on side supported on one forearm.", "Lift hips high until body forms diagonal line.", "Hold top arm skyward or on hip.", "Maintain hip elevation."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/6006.gif", category: "strength", difficulty: "intermediate", mechanic: "isolation", force: "push",
    met: 3.8, caloriesPerMinute: 4.5, description: "Lateral core stability hold strengthening obliques and hip abductors.",
    isUnilateral: true, popularityRank: 2, recommendedSets: "3", recommendedReps: "30-45 sec per side", joint_focus: "spine", intensity_level: "moderate", movement_tags: ["side-plank", "obliques"]
  },
  {
    id: "6007", name: "Ab Wheel Rollout", bodyPart: "Waist", equipment: "Ab Wheel", target: "Abs",
    secondaryMuscles: ["Lats", "Shoulders", "Lower Back"],
    instructions: ["Kneel on mat holding ab wheel handles.", "Roll wheel forward extending arms and body straight out.", "Lower torso near floor without letting back arch.", "Pull wheel back using abs."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/6007.gif", category: "strength", difficulty: "advanced", mechanic: "compound", force: "pull",
    met: 6.0, caloriesPerMinute: 7.2, description: "Elite anti-extension core exercise building severe core strength.",
    isUnilateral: false, popularityRank: 2, recommendedSets: "3", recommendedReps: "8-10", joint_focus: "shoulder", intensity_level: "high", movement_tags: ["ab-wheel", "anti-extension", "advanced"]
  },
  {
    id: "6008", name: "High Cable Woodchopper", bodyPart: "Waist", equipment: "Cable", target: "Obliques",
    secondaryMuscles: ["Abs", "Shoulders"],
    instructions: ["Set cable high. Stand sideways to machine holding handle with both hands.", "Pull handle diagonally downward across body toward opposite knee.", "Pivot back foot as you rotate.", "Control return."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/6008.gif", category: "strength", difficulty: "intermediate", mechanic: "compound", force: "pull",
    met: 4.8, caloriesPerMinute: 5.7, description: "Functional rotational cable exercise for athletic oblique power.",
    isUnilateral: true, popularityRank: 3, recommendedSets: "3", recommendedReps: "12 per side", joint_focus: "spine", intensity_level: "moderate", movement_tags: ["woodchopper", "cables", "athletic"]
  },
  {
    id: "6009", name: "Dynamic Speed Mountain Climbers", bodyPart: "Waist", equipment: "Body Weight", target: "Abs",
    secondaryMuscles: ["Shoulders", "Cardio", "Quads"],
    instructions: ["Start in high plank position.", "Drive right knee rapidly up toward chest.", "Switch legs quickly in running motion.", "Keep hips down and hands firmly under shoulders."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/6009.gif", category: "cardio", difficulty: "intermediate", mechanic: "compound", force: "push",
    met: 7.0, caloriesPerMinute: 8.4, description: "Cardio-core hybrid movement building abdominal endurance.",
    isUnilateral: false, popularityRank: 1, recommendedSets: "3", recommendedReps: "40 seconds continuous", joint_focus: "hip", intensity_level: "high", movement_tags: ["mountain-climber", "cardio-core"]
  },
  {
    id: "6010", name: "Supine Flutter Kicks", bodyPart: "Waist", equipment: "Body Weight", target: "Lower Abs",
    secondaryMuscles: ["Hip Flexors"],
    instructions: ["Lie flat on back with hands under lower back for support.", "Lift legs 6 inches off floor.", "Kick legs up and down rapidly in small alternating scissor motions.", "Press lower back firmly into floor."],
    gifUrl: "https://api.workoutxapp.com/v1/gifs/6010.gif", category: "strength", difficulty: "beginner", mechanic: "isolation", force: "push",
    met: 4.0, caloriesPerMinute: 4.8, description: "Endurance leg-hovering exercise targeting lower core region.",
    isUnilateral: false, popularityRank: 3, recommendedSets: "3", recommendedReps: "30-45 seconds", joint_focus: "hip", intensity_level: "gentle", movement_tags: ["flutter-kicks", "lower-abs"]
  }
];

function getLocalCache() {
  if (typeof window === 'undefined') return null;
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    const metaRaw = localStorage.getItem(CACHE_META_KEY);

    if (!cachedRaw || !metaRaw) return null;

    const meta = JSON.parse(metaRaw);
    const data = JSON.parse(cachedRaw);
    const now = Date.now();
    const age = now - meta.timestamp;

    return {
      data,
      meta,
      isExpired: age > CACHE_TTL_MS,
      ageHours: Math.round(age / (1000 * 60 * 60)),
      daysRemaining: Math.max(0, Math.round((CACHE_TTL_MS - age) / (1000 * 60 * 60 * 24)))
    };
  } catch (err) {
    console.warn('⚠️ Error reading WorkoutX cache:', err);
    return null;
  }
}

function setLocalCache(exercises, source = 'api') {
  if (typeof window === 'undefined') return;
  try {
    const meta = {
      timestamp: Date.now(),
      count: exercises.length,
      source: source,
      ttlDays: CACHE_TTL_DAYS,
      nextSyncAllowed: Date.now() + CACHE_TTL_MS
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(exercises));
    localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
    console.log(`💾 WorkoutX Cache Updated: ${exercises.length} exercises cached (Valid for 3 days)`);
  } catch (err) {
    console.warn('⚠️ Could not save to LocalStorage:', err);
  }
}

/**
 * Format raw WorkoutX API exercise object to guarantee all parameters are available
 */
function formatWorkoutXItem(item, idx) {
  return {
    id: item.id || `wx_${idx}`,
    name: item.name || 'Exercise',
    bodyPart: item.bodyPart || 'General',
    equipment: item.equipment || 'Body Weight',
    target: item.target || 'Abs',
    secondaryMuscles: Array.isArray(item.secondaryMuscles) ? item.secondaryMuscles : [],
    instructions: Array.isArray(item.instructions) ? item.instructions : [item.instructions || 'Perform movement with good form.'],
    gifUrl: item.gifUrl || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
    category: item.category || 'strength',
    difficulty: item.difficulty || 'beginner',
    mechanic: item.mechanic || 'compound',
    force: item.force || 'push',
    met: item.met || 3.5,
    caloriesPerMinute: item.caloriesPerMinute || 4.3,
    estimatedCalorieBurn30Min: Math.round((item.caloriesPerMinute || 4.3) * 30),
    description: item.description || '',
    isUnilateral: Boolean(item.isUnilateral),
    popularityRank: item.popularityRank || 5,
    recommendedSets: item.recommendedSets || '3',
    recommendedReps: item.recommendedReps || '10-15',
    joint_focus: item.joint_focus || 'general_spine',
    intensity_level: item.intensity_level || 'moderate',
    movement_tags: Array.isArray(item.movement_tags) ? item.movement_tags : []
  };
}

/**
 * Map a MongoDB workout document (from /api/workouts) to the WorkoutX exercise schema
 * so it can be displayed seamlessly in ExploreTab alongside WorkoutX exercises.
 */
function mapMongoWorkoutToExercise(workout, idx) {
  return formatWorkoutXItem({
    id: workout.id || workout._id || `mongo_${idx}`,
    name: workout.title || workout.name || 'Workout',
    bodyPart: (workout.targetMuscles && workout.targetMuscles[0]) || 'General',
    equipment: (workout.equipment && workout.equipment[0]) || 'Body Weight',
    target: (workout.targetMuscles && workout.targetMuscles[0]) || 'General',
    secondaryMuscles: workout.targetMuscles ? workout.targetMuscles.slice(1) : [],
    instructions: workout.steps
      ? workout.steps.map(s => s.instruction || '')
      : (workout.description ? [workout.description] : ['Perform movement with good form.']),
    gifUrl: workout.thumbnailUrl || workout.videoUrl || (workout.steps && workout.steps[0]?.gifUrl) || '',
    category: workout.category ? workout.category.toLowerCase() : 'strength',
    difficulty: workout.difficulty ? workout.difficulty.toLowerCase() : 'beginner',
    mechanic: 'compound',
    force: 'push',
    met: 4.0,
    caloriesPerMinute: workout.calories && workout.duration ? Math.round(workout.calories / workout.duration * 10) / 10 : 4.3,
    description: workout.description || '',
    isUnilateral: false,
    popularityRank: workout.viewCount || 5,
    recommendedSets: workout.sets ? String(workout.sets) : '3',
    recommendedReps: workout.reps ? String(workout.reps) : '10-15',
    joint_focus: 'general_spine',
    intensity_level: workout.intensity ? workout.intensity.toLowerCase().replace(' ', '_') : 'moderate',
    movement_tags: workout.tags || []
  });
}

/**
 * Attempt to fetch workouts from the local MongoDB API and map them to WorkoutX schema.
 * Returns null if the request fails or returns no data.
 */
async function fetchMongoDBWorkoutsAsExercises() {
  try {
    console.log('🗄️ Attempting to fetch workouts from MongoDB database...');
    const response = await fetch(`${MONGODB_API_BASE}/workouts`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      console.warn(`⚠️ MongoDB API returned HTTP ${response.status}.`);
      return null;
    }
    const json = await response.json();
    const rawWorkouts = json.workouts || json.data || [];
    if (!Array.isArray(rawWorkouts) || rawWorkouts.length === 0) {
      console.warn('⚠️ MongoDB returned no workouts.');
      return null;
    }
    const mapped = rawWorkouts.map(mapMongoWorkoutToExercise);
    console.log(`✅ Loaded ${mapped.length} workouts from MongoDB as exercise fallback.`);
    return mapped;
  } catch (err) {
    console.warn('⚠️ Could not reach MongoDB API:', err.message);
    return null;
  }
}

/**
 * Mass Data Retrieval from WorkoutX API with 3-day caching policy.
 * Fallback chain: Cache → WorkoutX Cloud API → MongoDB Database → Offline Library
 * Collects up to 100 items in a single request.
 */
export async function getWorkoutXExercises(forceRefresh = false) {
  // 1. Check Cache first
  const cache = getLocalCache();

  if (cache && !cache.isExpired && !forceRefresh) {
    console.log(`⚡ Using WorkoutX cached dataset (${cache.data.length} exercises, synced ${cache.ageHours}h ago)`);
    return {
      success: true,
      exercises: cache.data,
      source: cache.meta.source,
      cachedAt: new Date(cache.meta.timestamp).toLocaleString(),
      nextSyncAllowed: new Date(cache.meta.nextSyncAllowed).toLocaleString(),
      isFromCache: true,
      count: cache.data.length
    };
  }

  // 2. Fetch mass dataset from WorkoutX API if key is present
  if (API_KEY) {
    try {
      console.log('🌐 Fetching mass exercise dataset from WorkoutX API...');
      const response = await fetch(`${WORKOUTX_API_BASE}/exercises?limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-WorkoutX-Key': API_KEY
        }
      });

      if (response.ok) {
        const json = await response.json();
        const rawData = json.data || json.exercises || json;
        
        if (Array.isArray(rawData) && rawData.length > 0) {
          const formatted = rawData.map(formatWorkoutXItem);

          setLocalCache(formatted, `WorkoutX Cloud API (${json.total || formatted.length} total in DB)`);
          return {
            success: true,
            exercises: formatted,
            source: 'WorkoutX Cloud API',
            totalAvailableInCloud: json.total || formatted.length,
            cachedAt: new Date().toLocaleString(),
            nextSyncAllowed: new Date(Date.now() + CACHE_TTL_MS).toLocaleString(),
            isFromCache: false,
            count: formatted.length
          };
        }
      } else {
        console.warn(`⚠️ WorkoutX API returned HTTP status ${response.status}. Trying MongoDB fallback.`);
      }
    } catch (err) {
      console.warn('⚠️ Error reaching WorkoutX API:', err.message, '— Trying MongoDB fallback.');
    }
  } else {
    console.log('ℹ️ No WorkoutX API Key configured. Trying MongoDB database fallback.');
  }

  // 3. MongoDB database fallback
  const mongoExercises = await fetchMongoDBWorkoutsAsExercises();
  if (mongoExercises && mongoExercises.length > 0) {
    setLocalCache(mongoExercises, 'MongoDB Database');
    return {
      success: true,
      exercises: mongoExercises,
      source: 'MongoDB Database',
      cachedAt: new Date().toLocaleString(),
      nextSyncAllowed: new Date(Date.now() + CACHE_TTL_MS).toLocaleString(),
      isFromCache: false,
      count: mongoExercises.length
    };
  }

  // 4. Final offline fallback dataset
  console.warn('⚠️ MongoDB unavailable. Falling back to offline exercise library.');
  const dataset = cache?.data || DEFAULT_WORKOUTX_EXERCISES.map(formatWorkoutXItem);
  setLocalCache(dataset, 'WorkoutX Offline Library');

  return {
    success: true,
    exercises: dataset,
    source: cache?.meta?.source || 'WorkoutX Offline Library',
    cachedAt: new Date(cache?.meta?.timestamp || Date.now()).toLocaleString(),
    nextSyncAllowed: new Date(Date.now() + CACHE_TTL_MS).toLocaleString(),
    isFromCache: true,
    count: dataset.length
  };
}

export function getWorkoutXCacheInfo() {
  const cache = getLocalCache();
  if (!cache) {
    return {
      hasCache: false,
      count: 0,
      ageHours: 0,
      ttlDays: CACHE_TTL_DAYS,
      status: 'No local cache found. Next sync will fetch mass data.'
    };
  }
  return {
    hasCache: true,
    count: cache.data.length,
    ageHours: cache.ageHours,
    daysRemaining: cache.daysRemaining,
    source: cache.meta.source,
    cachedAt: new Date(cache.meta.timestamp).toLocaleString(),
    nextSyncAllowed: new Date(cache.meta.nextSyncAllowed).toLocaleString(),
    status: cache.isExpired ? 'Cache expired. Sync allowed.' : `Cache active (${cache.daysRemaining} days remaining until auto-resync)`
  };
}

export function clearWorkoutXCache() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_META_KEY);
    console.log('🧹 WorkoutX cache cleared.');
  }
}
