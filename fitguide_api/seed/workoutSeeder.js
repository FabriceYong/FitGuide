// Auto-updated by scripts/assignExerciseGifs.js
// GIF URLs from static.exercisedb.dev (AscendAPI - non-commercial)
// Attribution: https://ascendapi.com
const workoutsData = [
  {
    "title": "High-Intensity Tabata Burn",
    "description": "An intense 20-minute HIIT workout following the Tabata protocol. This workout alternates between 20 seconds of maximum effort and 10 seconds of rest. Perfect for burning fat and building cardiovascular endurance in a short time.",
    "shortDescription": "Intense 20-minute Tabata protocol for maximum fat burn",
    "category": "HIIT",
    "difficulty": "Advanced",
    "duration": 20,
    "calories": 250,
    "intensity": "Very High",
    "equipment": [
      "None",
      "Timer"
    ],
    "targetMuscles": [
      "Full Body",
      "Core",
      "Legs",
      "Arms"
    ],
    "benefits": [
      "Burns fat rapidly",
      "Improves cardiovascular fitness",
      "Boosts metabolism",
      "Time-efficient"
    ],
    "tags": [
      "tabata",
      "hiit",
      "fat-burn",
      "cardio",
      "no-equipment"
    ],
    "prerequisites": [
      "Good cardiovascular health",
      "Basic fitness level"
    ],
    "cautions": [
      "Not suitable for beginners",
      "Consult doctor if you have heart conditions"
    ],
    "restPeriod": 10,
    "sets": 8,
    "slug": "highintensity-tabata-burn"
  },
  {
    "title": "HIIT Sprint Intervals",
    "description": "A powerful interval training workout alternating between high-speed sprints and recovery periods. This workout dramatically improves speed, endurance, and fat burning capacity.",
    "shortDescription": "Sprint intervals for explosive power and endurance",
    "category": "HIIT",
    "difficulty": "Advanced",
    "duration": 25,
    "calories": 300,
    "intensity": "Very High",
    "equipment": [
      "Track or Treadmill"
    ],
    "targetMuscles": [
      "Legs",
      "Glutes",
      "Core"
    ],
    "benefits": [
      "Increases speed",
      "Burns fat",
      "Builds explosive power",
      "Improves anaerobic capacity"
    ],
    "tags": [
      "hiit",
      "sprints",
      "intervals",
      "running"
    ],
    "prerequisites": [
      "Good running form",
      "Strong cardiovascular base"
    ],
    "cautions": [
      "Warm up extensively",
      "Not for those with joint issues"
    ],
    "restPeriod": 120,
    "sets": 8,
    "slug": "hiit-sprint-intervals"
  },
  {
    "title": "Bodyweight HIIT Challenge",
    "description": "An intense bodyweight circuit that requires no equipment. Perfect for home workouts, this HIIT session uses compound movements to maximize calorie burn and build functional strength.",
    "shortDescription": "No-equipment HIIT workout for anywhere",
    "category": "HIIT",
    "difficulty": "Intermediate",
    "duration": 30,
    "calories": 280,
    "intensity": "High",
    "equipment": [
      "None"
    ],
    "targetMuscles": [
      "Full Body"
    ],
    "benefits": [
      "Burns fat",
      "Builds endurance",
      "Increases strength",
      "No equipment needed"
    ],
    "tags": [
      "hiit",
      "bodyweight",
      "no-equipment",
      "home-workout"
    ],
    "prerequisites": [
      "Basic fitness level"
    ],
    "cautions": [
      "Land softly",
      "Maintain proper form"
    ],
    "restPeriod": 20,
    "sets": 5,
    "slug": "bodyweight-hiit-challenge"
  },
  {
    "title": "Morning Sun Salutation Flow",
    "slug": "morning-yoga-flow",
    "description": "A gentle yet invigorating yoga sequence perfect for starting your day. This classic Sun Salutation flow warms up the entire body, improves flexibility, and creates mental clarity through synchronized breath and movement.",
    "shortDescription": "Gentle morning yoga flow to energize your day",
    "category": "Yoga",
    "difficulty": "Beginner",
    "duration": 15,
    "calories": 60,
    "intensity": "Low",
    "equipment": [
      "Yoga Mat"
    ],
    "targetMuscles": [
      "Full Body",
      "Core",
      "Back",
      "Legs"
    ],
    "benefits": [
      "Increases flexibility",
      "Improves posture",
      "Reduces stress",
      "Energizes body"
    ],
    "tags": [
      "yoga",
      "morning",
      "flexibility",
      "stretching",
      "beginner-friendly"
    ],
    "prerequisites": [
      "None"
    ],
    "cautions": [
      "Avoid if you have wrist injuries",
      "Move slowly if you have back pain"
    ],
    "restPeriod": 0,
    "sets": 5,
    "steps": [
      {
        "stepNumber": 1,
        "instruction": "Begin in Mountain Pose (Tadasana). Stand tall with feet hip-width apart, arms at your sides. Take 3 deep breaths, grounding yourself and setting your intention for practice.",
        "duration": 60,
        "formCues": [
          "Distribute weight evenly across both feet",
          "Engage your core and lengthen your spine",
          "Relax your shoulders away from your ears",
          "Gaze forward with a soft focus"
        ],
        "commonMistakes": [
          "Locking knees or hyperextending joints",
          "Leaning weight into one side",
          "Holding tension in shoulders or neck"
        ],
        "breathingPattern": "Deep, slow breaths through the nose - inhale for 4 counts, exhale for 4 counts"
      },
      {
        "stepNumber": 2,
        "instruction": "Inhale and raise your arms overhead, bringing palms together in prayer position. Gently arch your back and look up toward your thumbs (Raised Arms Pose).",
        "duration": 45,
        "formCues": [
          "Keep shoulders relaxed as arms rise",
          "Engage core to protect lower back in backbend",
          "Lift from the chest, not just tilting head back",
          "Maintain length in the spine"
        ],
        "commonMistakes": [
          "Crunching lower back excessively",
          "Forcing neck backwards",
          "Holding breath during the stretch"
        ],
        "breathingPattern": "Smooth inhale as arms rise, filling lungs completely"
      },
      {
        "stepNumber": 3,
        "instruction": "Exhale and fold forward from your hips, bringing your hands to the floor beside your feet (Forward Fold). Bend your knees slightly if needed. Let your head hang heavy.",
        "duration": 45,
        "formCues": [
          "Hinge from hips, not waist",
          "Keep knees soft to protect hamstrings",
          "Let head and neck completely relax",
          "Weight slightly forward in the toes"
        ],
        "commonMistakes": [
          "Rounding from the back instead of hinging at hips",
          "Locking knees with tight hamstrings",
          "Forcing hands to floor if inflexible"
        ],
        "breathingPattern": "Long exhale as you fold forward, releasing tension with the breath"
      },
      {
        "stepNumber": 4,
        "instruction": "Inhale and lift halfway up with a flat back (Half Lift). Place your hands on your shins, keeping your spine long and gaze forward.",
        "duration": 30,
        "formCues": [
          "Lengthen spine from tailbone to crown",
          "Pull shoulders back to open chest",
          "Keep neck in neutral alignment",
          "Engage core muscles"
        ],
        "commonMistakes": [
          "Rounding the back",
          "Looking up too high and crunching neck",
          "Hands too low causing shoulder hunch"
        ],
        "breathingPattern": "Inhale to create length and space in the spine"
      },
      {
        "stepNumber": 5,
        "instruction": "Exhale and step or jump back to Plank Pose. Keep your body in a straight line from head to heels, engaging your core.",
        "duration": 45,
        "formCues": [
          "Shoulders stacked over wrists",
          "Engage core and glutes",
          "Press through hands spreading fingers wide",
          "Neutral spine - don't sag or pike hips"
        ],
        "commonMistakes": [
          "Hips sagging or piking up",
          "Shoulders collapsing toward the floor",
          "Holding breath"
        ],
        "breathingPattern": "Steady breathing - don't hold your breath during core engagement",
        "gifUrl": "https://static.exercisedb.dev/media/hCjGsRQ.gif",
        "exerciseDbId": "hCjGsRQ",
        "exerciseName": "plank"
      },
      {
        "stepNumber": 6,
        "instruction": "Lower down through Chaturanga Dandasana (Four-Limbed Staff Pose), keeping elbows close to your ribs. Modify by lowering knees first if needed.",
        "duration": 30,
        "formCues": [
          "Elbows bend to 90 degrees, hugging ribs",
          "Lower body and shoulders at same height",
          "Engage entire core",
          "Shoulders stay above elbows"
        ],
        "commonMistakes": [
          "Elbows flaring out to sides",
          "Lowering too far toward floor",
          "Shoulders dropping below elbows",
          "Rushing the movement"
        ],
        "breathingPattern": "Controlled exhale as you lower down with strength"
      },
      {
        "stepNumber": 7,
        "instruction": "Inhale into Upward-Facing Dog. Press through your hands, straighten your arms, and lift your chest forward and up. Roll over your toes with tops of feet on the mat.",
        "duration": 45,
        "formCues": [
          "Press firmly through palms",
          "Roll shoulders back and down",
          "Lift chest forward and through arms",
          "Engage legs - thighs off the mat"
        ],
        "commonMistakes": [
          "Sinking into shoulders",
          "Crunching lower back excessively",
          "Forgetting to engage legs",
          "Keeping feet flat instead of rolling over toes"
        ],
        "breathingPattern": "Deep inhale as chest opens and expands forward"
      },
      {
        "stepNumber": 8,
        "instruction": "Exhale into Downward-Facing Dog. Lift your hips high, press your chest toward your thighs, and relax your head. Hold for 5 breaths.",
        "duration": 60,
        "formCues": [
          "Hands shoulder-width, feet hip-width",
          "Press firmly through entire hand",
          "Lift hips up and back",
          "Rotate inner elbows forward",
          "Pedal feet to stretch calves"
        ],
        "commonMistakes": [
          "Walking hands too close to feet",
          "Letting shoulders collapse toward ears",
          "Locking elbows",
          "Forcing heels down with tight calves"
        ],
        "breathingPattern": "5 deep breaths - inhale through nose, exhale through nose, finding length with each breath"
      },
      {
        "stepNumber": 9,
        "instruction": "Look forward and step or jump your feet between your hands. Inhale to Half Lift with a flat back.",
        "duration": 30,
        "formCues": [
          "Gaze forward before stepping",
          "Bend knees to help feet reach forward",
          "Land feet between hands if jumping",
          "Immediately lengthen spine"
        ],
        "commonMistakes": [
          "Not looking forward first",
          "Feet landing too far back",
          "Rounding back as you step"
        ],
        "breathingPattern": "Inhale as you step forward and lengthen"
      },
      {
        "stepNumber": 10,
        "instruction": "Exhale and fold forward completely, releasing your head toward your knees.",
        "duration": 45,
        "formCues": [
          "Relax upper body completely",
          "Soften knees if needed",
          "Let gravity do the work",
          "Release tension in neck and jaw"
        ],
        "commonMistakes": [
          "Forcing the stretch",
          "Creating tension trying to go deeper",
          "Forgetting to breathe"
        ],
        "breathingPattern": "Long exhale, surrendering to gravity and releasing tension"
      },
      {
        "stepNumber": 11,
        "instruction": "Inhale and rise up to standing, sweeping your arms out to the sides and overhead. Bring palms together and look up.",
        "duration": 45,
        "formCues": [
          "Engage core before rising",
          "Rise with a flat back",
          "Sweep arms wide like wings",
          "Lift from the chest"
        ],
        "commonMistakes": [
          "Rounding back as you rise",
          "Rushing the movement",
          "Losing core engagement"
        ],
        "breathingPattern": "Full inhale as you rise and expand"
      },
      {
        "stepNumber": 12,
        "instruction": "Exhale and return to Mountain Pose, bringing your hands to heart center. Complete 4 more rounds of this sequence, moving with your breath.",
        "duration": 360,
        "formCues": [
          "Find your center and stillness",
          "Each round moves with breath",
          "Quality over speed",
          "Stay present and mindful"
        ],
        "commonMistakes": [
          "Rushing through the rounds",
          "Losing breath connection",
          "Not maintaining awareness"
        ],
        "breathingPattern": "Return to natural, steady breath between rounds"
      },
      {
        "stepNumber": 13,
        "instruction": "Cool down: Finish in Child's Pose for 5 deep breaths, then come to a comfortable seated position for a moment of gratitude.",
        "duration": 60,
        "formCues": [
          "Knees wide, big toes touching",
          "Sink hips back toward heels",
          "Forehead rests on mat",
          "Arms extended or alongside body"
        ],
        "commonMistakes": [
          "Rushing the recovery",
          "Not allowing body to fully relax",
          "Skipping the cool down"
        ],
        "breathingPattern": "5 slow, deep breaths - feel your back expand with each inhale"
      }
    ],
    "modifications": [
      {
        "level": "Easier",
        "description": "Keep knees bent in Forward Folds. Lower knees to the mat during Plank and Chaturanga. Skip Upward Dog and stay in Cobra Pose instead."
      },
      {
        "level": "Harder",
        "description": "Add a jump from Forward Fold to Plank. Hold Chaturanga for 3 breaths. Lift one leg in Downward Dog for extra challenge."
      }
    ]
  },
  {
    "title": "Power Yoga Strength Flow",
    "description": "A dynamic, athletic yoga practice that builds strength while maintaining flexibility. This vigorous flow challenges your body and mind through sustained poses and controlled transitions.",
    "shortDescription": "Athletic yoga for strength and flexibility",
    "category": "Yoga",
    "difficulty": "Intermediate",
    "duration": 45,
    "calories": 200,
    "intensity": "Moderate",
    "equipment": [
      "Yoga Mat"
    ],
    "targetMuscles": [
      "Core",
      "Arms",
      "Legs",
      "Back"
    ],
    "benefits": [
      "Builds strength",
      "Improves balance",
      "Increases flexibility",
      "Enhances focus"
    ],
    "tags": [
      "yoga",
      "power-yoga",
      "strength",
      "vinyasa"
    ],
    "prerequisites": [
      "Basic yoga knowledge"
    ],
    "cautions": [
      "Listen to your body",
      "Don't force poses"
    ],
    "restPeriod": 0,
    "sets": 1,
    "slug": "power-yoga-strength-flow"
  },
  {
    "title": "Restorative Evening Yoga",
    "description": "A calming sequence designed to release tension and prepare your body for restful sleep. This gentle practice uses supported poses and deep breathing to activate the parasympathetic nervous system.",
    "shortDescription": "Calming evening routine for better sleep",
    "category": "Yoga",
    "difficulty": "Beginner",
    "duration": 30,
    "calories": 70,
    "intensity": "Low",
    "equipment": [
      "Yoga Mat",
      "Bolster",
      "Blocks"
    ],
    "targetMuscles": [
      "Full Body"
    ],
    "benefits": [
      "Reduces stress",
      "Improves sleep",
      "Releases tension",
      "Calms mind"
    ],
    "tags": [
      "yoga",
      "evening",
      "relaxation",
      "sleep",
      "restorative"
    ],
    "prerequisites": [
      "None"
    ],
    "cautions": [
      "Hold poses gently",
      "Focus on breathing"
    ],
    "restPeriod": 0,
    "sets": 1,
    "slug": "restorative-evening-yoga"
  },
  {
    "title": "Yin Yoga Deep Stretch",
    "description": "A meditative practice holding passive poses for extended periods to target deep connective tissues. This slow-paced style improves flexibility and promotes mindfulness.",
    "shortDescription": "Meditative practice for deep tissue release",
    "category": "Yoga",
    "difficulty": "All Levels",
    "duration": 60,
    "calories": 90,
    "intensity": "Low",
    "equipment": [
      "Yoga Mat",
      "Blocks",
      "Bolster"
    ],
    "targetMuscles": [
      "Hips",
      "Spine",
      "Legs"
    ],
    "benefits": [
      "Increases flexibility",
      "Reduces anxiety",
      "Improves joint mobility",
      "Promotes meditation"
    ],
    "tags": [
      "yoga",
      "yin",
      "meditation",
      "flexibility"
    ],
    "prerequisites": [
      "None"
    ],
    "cautions": [
      "Don't force stretches",
      "Breathe into discomfort"
    ],
    "restPeriod": 0,
    "sets": 1,
    "slug": "yin-yoga-deep-stretch"
  },
  {
    "title": "Full Body Strength Builder",
    "description": "A comprehensive 45-minute strength training workout targeting all major muscle groups. Using compound movements, this workout builds muscle, increases strength, and improves overall body composition.",
    "shortDescription": "Complete 45-minute full body strength training",
    "category": "Strength",
    "difficulty": "Intermediate",
    "duration": 45,
    "calories": 300,
    "intensity": "High",
    "equipment": [
      "Dumbbells",
      "Barbell",
      "Bench",
      "Pull-up Bar"
    ],
    "targetMuscles": [
      "Chest",
      "Back",
      "Legs",
      "Shoulders",
      "Arms",
      "Core"
    ],
    "benefits": [
      "Builds muscle mass",
      "Increases strength",
      "Improves bone density",
      "Boosts metabolism"
    ],
    "tags": [
      "strength",
      "muscle-building",
      "weights",
      "compound-movements"
    ],
    "prerequisites": [
      "Proper form knowledge",
      "Basic strength foundation"
    ],
    "cautions": [
      "Use spotter for heavy lifts",
      "Warm up thoroughly",
      "Don't sacrifice form for weight"
    ],
    "restPeriod": 60,
    "sets": 4,
    "reps": 10,
    "slug": "full-body-strength-builder"
  },
  {
    "title": "Upper Body Power Session",
    "description": "Focused upper body workout to build strength and muscle in chest, back, shoulders, and arms. This session uses progressive overload principles for maximum gains.",
    "shortDescription": "Intense upper body strength training",
    "category": "Strength",
    "difficulty": "Intermediate",
    "duration": 40,
    "calories": 250,
    "intensity": "High",
    "equipment": [
      "Dumbbells",
      "Barbell",
      "Bench"
    ],
    "targetMuscles": [
      "Chest",
      "Back",
      "Shoulders",
      "Arms"
    ],
    "benefits": [
      "Builds upper body strength",
      "Increases muscle mass",
      "Improves posture"
    ],
    "tags": [
      "strength",
      "upper-body",
      "muscle-building"
    ],
    "prerequisites": [
      "Form knowledge"
    ],
    "cautions": [
      "Spotter recommended",
      "Warm up shoulders"
    ],
    "restPeriod": 60,
    "sets": 4,
    "reps": 8,
    "slug": "upper-body-power-session"
  },
  {
    "title": "Leg Day Destroyer",
    "description": "An intense lower body workout targeting quads, hamstrings, glutes, and calves. This comprehensive leg session builds strength, power, and muscle mass in your lower body.",
    "shortDescription": "Complete lower body strength training",
    "category": "Strength",
    "difficulty": "Advanced",
    "duration": 50,
    "calories": 350,
    "intensity": "Very High",
    "equipment": [
      "Barbell",
      "Dumbbells",
      "Leg Press",
      "Squat Rack"
    ],
    "targetMuscles": [
      "Quads",
      "Hamstrings",
      "Glutes",
      "Calves"
    ],
    "benefits": [
      "Builds leg strength",
      "Increases power",
      "Burns calories",
      "Improves athletic performance"
    ],
    "tags": [
      "strength",
      "legs",
      "lower-body",
      "squats"
    ],
    "prerequisites": [
      "Good form",
      "Strong foundation"
    ],
    "cautions": [
      "Protect your back",
      "Use proper depth",
      "Spotter for heavy squats"
    ],
    "restPeriod": 90,
    "sets": 5,
    "reps": 8,
    "slug": "leg-day-destroyer"
  },
  {
    "title": "Core Strength Circuit",
    "slug": "core-power-blast",
    "description": "A targeted core workout that strengthens abs, obliques, and lower back. This circuit-style session improves core stability, posture, and functional strength.",
    "shortDescription": "Comprehensive core strengthening routine",
    "category": "Strength",
    "difficulty": "Intermediate",
    "duration": 20,
    "calories": 150,
    "intensity": "Moderate",
    "equipment": [
      "Mat",
      "Medicine Ball"
    ],
    "targetMuscles": [
      "Abs",
      "Obliques",
      "Lower Back"
    ],
    "benefits": [
      "Strengthens core",
      "Improves stability",
      "Enhances posture",
      "Reduces back pain"
    ],
    "tags": [
      "strength",
      "core",
      "abs",
      "circuit"
    ],
    "prerequisites": [
      "Basic fitness"
    ],
    "cautions": [
      "Protect lower back",
      "Engage core throughout all movements"
    ],
    "restPeriod": 30,
    "sets": 3,
    "reps": 15,
    "steps": [
      {
        "stepNumber": 1,
        "instruction": "Warm-up: Start with 2 minutes of gentle core engagement. Lie on your back, knees bent, feet flat. Practice engaging your core by drawing belly button to spine. Add pelvic tilts and cat-cow stretches.",
        "duration": 120,
        "formCues": [
          "Focus on mind-muscle connection",
          "Breathe naturally while engaging core",
          "Start gently to prepare muscles",
          "Warm up lower back with cat-cow movements"
        ],
        "commonMistakes": [
          "Skipping the warm-up",
          "Engaging too aggressively too soon",
          "Holding breath during engagement"
        ],
        "breathingPattern": "Natural breathing - don't hold your breath during warm-up movements"
      },
      {
        "stepNumber": 2,
        "instruction": "Plank Hold: Get into forearm plank position. Keep body in straight line from head to heels, engage core and glutes. Hold for 45 seconds. Focus on breathing steadily.",
        "duration": 45,
        "formCues": [
          "Forearms parallel, elbows under shoulders",
          "Squeeze glutes and engage quads",
          "Neutral neck - look at floor between hands",
          "Don't let hips sag or pike up",
          "Press forearms into floor"
        ],
        "commonMistakes": [
          "Hips sagging toward floor",
          "Piking hips up too high",
          "Holding breath",
          "Shoulders collapsing"
        ],
        "breathingPattern": "Steady rhythmic breathing - inhale through nose for 3 counts, exhale for 3 counts",
        "gifUrl": "https://static.exercisedb.dev/media/CosupLu.gif",
        "exerciseDbId": "CosupLu",
        "exerciseName": "forearm plank"
      },
      {
        "stepNumber": 3,
        "instruction": "Rest: Take 30 seconds to recover. Stay active with light stretching or march in place.",
        "duration": 30,
        "formCues": [
          "Shake out arms and legs gently",
          "Keep moving lightly",
          "Hydrate if needed",
          "Mentally prepare for next exercise"
        ],
        "commonMistakes": [
          "Completely stopping movement",
          "Not using rest time to recover"
        ],
        "breathingPattern": "Return to natural breathing, catch your breath"
      },
      {
        "stepNumber": 4,
        "instruction": "Bicycle Crunches: Lie on back, hands behind head. Bring right elbow to left knee while extending right leg. Alternate sides in controlled motion. Do 15 reps per side.",
        "duration": 60,
        "formCues": [
          "Rotate from torso, not just moving elbows",
          "Fully extend the non-working leg",
          "Keep lower back pressed to floor",
          "Elbows stay wide - don't pull on neck",
          "Control the rotation speed"
        ],
        "commonMistakes": [
          "Pulling on neck with hands",
          "Moving too fast, losing form",
          "Not fully rotating torso",
          "Lower back lifting off floor"
        ],
        "breathingPattern": "Exhale as you crunch and rotate, inhale as you switch sides",
        "gifUrl": "https://static.exercisedb.dev/media/tZkGYZ9.gif",
        "exerciseDbId": "tZkGYZ9",
        "exerciseName": "bicycle crunch"
      },
      {
        "stepNumber": 5,
        "instruction": "Rest: 30 seconds recovery period.",
        "duration": 30,
        "formCues": [
          "Stretch out gently",
          "Stay mentally focused",
          "Prepare for next movement"
        ],
        "commonMistakes": [
          "Rushing into next exercise",
          "Not recovering adequately"
        ],
        "breathingPattern": "Deep, calming breaths to recover"
      },
      {
        "stepNumber": 6,
        "instruction": "Russian Twists: Sit with knees bent, feet lifted. Hold medicine ball or hands clasped. Rotate torso side to side, tapping ball/hands on floor beside hips. 15 reps per side.",
        "duration": 60,
        "formCues": [
          "Lean back slightly to engage core",
          "Keep chest lifted and open",
          "Rotate from torso, not just arms",
          "Move with control, not momentum",
          "Feet can touch floor if needed (easier)"
        ],
        "commonMistakes": [
          "Rounding back excessively",
          "Using only arms, not torso rotation",
          "Moving too fast with momentum",
          "Holding breath during twists"
        ],
        "breathingPattern": "Exhale as you twist to each side, quick inhale in the center"
      },
      {
        "stepNumber": 7,
        "instruction": "Rest: 30 seconds recovery period.",
        "duration": 30,
        "formCues": [
          "Shake out arms if holding weight",
          "Roll shoulders back",
          "Stay active with light movement"
        ],
        "commonMistakes": [
          "Collapsing posture during rest",
          "Not preparing mentally for next move"
        ],
        "breathingPattern": "Steady, natural breathing to recover"
      },
      {
        "stepNumber": 8,
        "instruction": "Mountain Climbers: Start in plank position. Drive knees toward chest alternating quickly. Keep core tight and hips level. 30 seconds at steady pace.",
        "duration": 30,
        "formCues": [
          "Start in strong plank position",
          "Drive knees to chest",
          "Keep hips down and level",
          "Maintain straight back",
          "Quick but controlled movements"
        ],
        "commonMistakes": [
          "Hips piking up too high",
          "Not bringing knees far enough forward",
          "Losing plank form",
          "Moving too slow or too fast"
        ],
        "breathingPattern": "Quick rhythmic breathing matching the pace - exhale, exhale, inhale pattern"
      },
      {
        "stepNumber": 9,
        "instruction": "Rest: 30 seconds recovery period.",
        "duration": 30,
        "formCues": [
          "Walk it out gently",
          "Hands on hips, deep breaths",
          "Mentally reset for next exercise"
        ],
        "commonMistakes": [
          "Bending over with hands on knees",
          "Not actively recovering"
        ],
        "breathingPattern": "Deep recovery breaths - in through nose, out through mouth"
      },
      {
        "stepNumber": 10,
        "instruction": "Dead Bug: Lie on back, arms extended toward ceiling, knees bent at 90 degrees. Lower opposite arm and leg toward floor while keeping lower back pressed down. Alternate sides. 15 reps per side.",
        "duration": 60,
        "formCues": [
          "Press lower back firmly into floor",
          "Move opposite arm and leg",
          "Keep movements slow and controlled",
          "Hover limbs just above floor",
          "Don't let back arch"
        ],
        "commonMistakes": [
          "Lower back lifting off floor",
          "Moving too fast",
          "Not fully extending limbs",
          "Holding breath during the movement"
        ],
        "breathingPattern": "Exhale as you extend limbs, inhale as you return to start"
      },
      {
        "stepNumber": 11,
        "instruction": "Rest: 30 seconds recovery period.",
        "duration": 30,
        "formCues": [
          "Stay on back, knees bent",
          "Gentle twists side to side",
          "Prepare for side plank"
        ],
        "commonMistakes": [
          "Rushing to next position",
          "Not setting up properly for side plank"
        ],
        "breathingPattern": "Calm, steady breathing"
      },
      {
        "stepNumber": 12,
        "instruction": "Side Plank (Right): Lie on right side, prop up on right forearm. Stack feet and lift hips. Hold for 30 seconds. Keep body in straight line.",
        "duration": 30,
        "formCues": [
          "Elbow directly under shoulder",
          "Stack feet or stagger them (easier)",
          "Lift hips high",
          "Engage obliques",
          "Top arm can be on hip or extended"
        ],
        "commonMistakes": [
          "Hips sagging toward floor",
          "Shoulder collapsing",
          "Rolling forward or back",
          "Not engaging core"
        ],
        "breathingPattern": "Steady breathing - don't hold your breath during the hold"
      },
      {
        "stepNumber": 13,
        "instruction": "Side Plank (Left): Switch to left side and repeat. Hold for 30 seconds maintaining proper form.",
        "duration": 30,
        "formCues": [
          "Elbow under shoulder",
          "Maintain straight body line",
          "Engage left oblique",
          "Keep neck neutral",
          "Press forearm into floor"
        ],
        "commonMistakes": [
          "Hips dropping",
          "Losing alignment",
          "Holding breath",
          "Rushing through the hold"
        ],
        "breathingPattern": "Controlled breathing throughout the hold"
      },
      {
        "stepNumber": 14,
        "instruction": "Rest: 60 seconds before second round.",
        "duration": 60,
        "formCues": [
          "Walk around, shake out muscles",
          "Hydrate",
          "Review any exercises that felt challenging",
          "Mental reset for round 2"
        ],
        "commonMistakes": [
          "Sitting or lying down completely",
          "Not hydrating",
          "Losing focus"
        ],
        "breathingPattern": "Deep recovery breaths to bring heart rate down slightly"
      },
      {
        "stepNumber": 15,
        "instruction": "Round 2: Repeat all exercises for second set. Push yourself but maintain proper form. You're doing great!",
        "duration": 360,
        "formCues": [
          "Focus on quality over quantity",
          "Maintain all form cues from round 1",
          "Challenge yourself but stay safe",
          "Keep breathing throughout"
        ],
        "commonMistakes": [
          "Sacrificing form for speed",
          "Not pushing hard enough",
          "Holding breath during hard parts"
        ],
        "breathingPattern": "Match breathing patterns from each exercise in round 1"
      },
      {
        "stepNumber": 16,
        "instruction": "Rest: 60 seconds before final round.",
        "duration": 60,
        "formCues": [
          "Active recovery - keep moving",
          "Positive self-talk",
          "You've got one more round!",
          "Stay hydrated"
        ],
        "commonMistakes": [
          "Getting discouraged",
          "Not recovering properly",
          "Losing mental focus"
        ],
        "breathingPattern": "Slow, deep breaths to prepare for final push"
      },
      {
        "stepNumber": 17,
        "instruction": "Round 3: Final set! Give it your all while maintaining control and form. This is where the real gains happen.",
        "duration": 360,
        "formCues": [
          "This is your best round - finish strong",
          "Every rep counts",
          "Maintain perfect form",
          "Push through fatigue with good technique"
        ],
        "commonMistakes": [
          "Giving up mentally",
          "Form breaking down due to fatigue",
          "Rushing to finish"
        ],
        "breathingPattern": "Power through with strong, rhythmic breathing on each exercise"
      },
      {
        "stepNumber": 18,
        "instruction": "Cool Down: Lie on back and hug knees to chest for 30 seconds. Then stretch in child's pose for 30 seconds. Finish with cat-cow stretches to release spine.",
        "duration": 120,
        "formCues": [
          "Gentle compression on lower back",
          "Relax into child's pose completely",
          "Slow, gentle cat-cow movements",
          "End in neutral spine, feel the work you've done"
        ],
        "commonMistakes": [
          "Skipping the cool-down",
          "Rushing through stretches",
          "Not allowing muscles to relax"
        ],
        "breathingPattern": "Deep, slow breaths to bring body back to resting state - in for 5 counts, out for 5 counts"
      }
    ],
    "modifications": [
      {
        "level": "Easier",
        "description": "Reduce plank hold to 30 seconds. Do bicycle crunches with feet on floor. Russian twists without weight. Mountain climbers at slower pace."
      },
      {
        "level": "Harder",
        "description": "Increase plank hold to 60 seconds. Add weight to Russian twists. Increase mountain climber speed. Do side planks with leg lift."
      }
    ]
  },
  {
    "title": "30-Minute Cardio Blast",
    "description": "An energetic cardio workout designed to elevate your heart rate and burn calories. This workout combines various cardio exercises to keep things interesting while maximizing fat burn and cardiovascular benefits.",
    "shortDescription": "High-energy 30-minute cardio for fat burning",
    "category": "Cardio",
    "difficulty": "Intermediate",
    "duration": 30,
    "calories": 350,
    "intensity": "High",
    "equipment": [
      "None",
      "Optional: Jump Rope"
    ],
    "targetMuscles": [
      "Legs",
      "Core",
      "Full Body"
    ],
    "benefits": [
      "Burns calories",
      "Improves heart health",
      "Increases endurance",
      "Boosts mood"
    ],
    "tags": [
      "cardio",
      "fat-burn",
      "endurance",
      "no-equipment"
    ],
    "prerequisites": [
      "Basic fitness level"
    ],
    "cautions": [
      "Land softly to protect joints",
      "Stay hydrated"
    ],
    "restPeriod": 30,
    "sets": 3,
    "slug": "30minute-cardio-blast"
  },
  {
    "title": "Steady State Endurance Run",
    "description": "A moderate-intensity continuous cardio session perfect for building aerobic base and endurance. This workout improves cardiovascular efficiency and fat-burning capacity.",
    "shortDescription": "45-minute steady-pace endurance building",
    "category": "Cardio",
    "difficulty": "Intermediate",
    "duration": 45,
    "calories": 400,
    "intensity": "Moderate",
    "equipment": [
      "Running Shoes",
      "Track or Treadmill"
    ],
    "targetMuscles": [
      "Legs",
      "Core"
    ],
    "benefits": [
      "Builds endurance",
      "Improves heart health",
      "Burns fat",
      "Increases stamina"
    ],
    "tags": [
      "cardio",
      "running",
      "endurance",
      "fat-burn"
    ],
    "prerequisites": [
      "Basic running ability"
    ],
    "cautions": [
      "Proper running shoes essential",
      "Stay hydrated"
    ],
    "restPeriod": 0,
    "sets": 1,
    "slug": "steady-state-endurance-run"
  },
  {
    "title": "Stair Climber Challenge",
    "description": "An intense lower body cardio workout using stairs or a step platform. This workout builds leg strength while providing excellent cardiovascular benefits.",
    "shortDescription": "Stair climbing for cardio and strength",
    "category": "Cardio",
    "difficulty": "Intermediate",
    "duration": 25,
    "calories": 300,
    "intensity": "High",
    "equipment": [
      "Stairs or Step Platform"
    ],
    "targetMuscles": [
      "Legs",
      "Glutes",
      "Core"
    ],
    "benefits": [
      "Strengthens legs",
      "Burns calories",
      "Improves stamina",
      "Low impact option"
    ],
    "tags": [
      "cardio",
      "stairs",
      "legs",
      "functional"
    ],
    "prerequisites": [
      "Basic fitness"
    ],
    "cautions": [
      "Watch your step",
      "Use handrail if needed"
    ],
    "restPeriod": 30,
    "sets": 1,
    "slug": "stair-climber-challenge"
  },
  {
    "title": "Deep Stretch & Flexibility",
    "description": "A relaxing 25-minute flexibility routine focusing on deep stretches for all major muscle groups. Perfect for recovery days, improving range of motion, and reducing muscle tension.",
    "shortDescription": "Relaxing 25-minute deep stretch routine",
    "category": "Flexibility",
    "difficulty": "All Levels",
    "duration": 25,
    "calories": 50,
    "intensity": "Low",
    "equipment": [
      "Yoga Mat",
      "Optional: Blocks",
      "Strap"
    ],
    "targetMuscles": [
      "Hamstrings",
      "Hip Flexors",
      "Back",
      "Shoulders",
      "Calves"
    ],
    "benefits": [
      "Increases flexibility",
      "Reduces muscle tension",
      "Improves posture",
      "Promotes relaxation"
    ],
    "tags": [
      "flexibility",
      "stretching",
      "recovery",
      "relaxation"
    ],
    "prerequisites": [
      "None"
    ],
    "cautions": [
      "Don't bounce in stretches",
      "Breathe deeply",
      "Never stretch to pain"
    ],
    "restPeriod": 0,
    "sets": 1,
    "slug": "deep-stretch-flexibility"
  },
  {
    "title": "Dynamic Mobility Flow",
    "description": "An active flexibility routine using dynamic movements to improve range of motion and prepare the body for activity. Perfect as a warm-up or standalone mobility session.",
    "shortDescription": "Dynamic movements for improved mobility",
    "category": "Flexibility",
    "difficulty": "Beginner",
    "duration": 15,
    "calories": 60,
    "intensity": "Low",
    "equipment": [
      "None"
    ],
    "targetMuscles": [
      "Full Body"
    ],
    "benefits": [
      "Improves mobility",
      "Warms up body",
      "Prevents injury",
      "Enhances performance"
    ],
    "tags": [
      "flexibility",
      "mobility",
      "warm-up",
      "dynamic"
    ],
    "prerequisites": [
      "None"
    ],
    "cautions": [
      "Start slowly",
      "Control movements"
    ],
    "restPeriod": 0,
    "sets": 2,
    "slug": "dynamic-mobility-flow"
  },
  {
    "title": "Mat Pilates Core Flow",
    "description": "A classical Pilates mat workout focusing on core strength, stability, and control. This low-impact session builds deep core muscles while improving posture and body awareness.",
    "shortDescription": "Classical Pilates for core strength",
    "category": "Pilates",
    "difficulty": "Intermediate",
    "duration": 35,
    "calories": 180,
    "intensity": "Moderate",
    "equipment": [
      "Mat"
    ],
    "targetMuscles": [
      "Core",
      "Back",
      "Hip Flexors"
    ],
    "benefits": [
      "Strengthens core",
      "Improves posture",
      "Increases flexibility",
      "Enhances control"
    ],
    "tags": [
      "pilates",
      "core",
      "low-impact",
      "control"
    ],
    "prerequisites": [
      "Basic Pilates knowledge"
    ],
    "cautions": [
      "Engage core throughout",
      "Move with control"
    ],
    "restPeriod": 10,
    "sets": 1,
    "slug": "mat-pilates-core-flow"
  },
  {
    "title": "Reformer-Style Pilates",
    "description": "A challenging Pilates workout inspired by reformer exercises but adapted for mat work. This session uses resistance and control to sculpt long, lean muscles.",
    "shortDescription": "Reformer-inspired mat Pilates workout",
    "category": "Pilates",
    "difficulty": "Advanced",
    "duration": 45,
    "calories": 220,
    "intensity": "Moderate",
    "equipment": [
      "Mat",
      "Resistance Band"
    ],
    "targetMuscles": [
      "Core",
      "Legs",
      "Arms"
    ],
    "benefits": [
      "Tones muscles",
      "Improves strength",
      "Enhances flexibility",
      "Builds control"
    ],
    "tags": [
      "pilates",
      "reformer",
      "resistance",
      "toning"
    ],
    "prerequisites": [
      "Pilates experience"
    ],
    "cautions": [
      "Maintain alignment",
      "Breathe consistently"
    ],
    "restPeriod": 15,
    "sets": 1,
    "slug": "reformerstyle-pilates"
  },
  {
    "title": "CrossFit WOD: Cindy",
    "description": "A classic CrossFit benchmark workout. Complete as many rounds as possible (AMRAP) in 20 minutes of 5 pull-ups, 10 push-ups, and 15 squats. Tests both strength and conditioning.",
    "shortDescription": "20-minute AMRAP benchmark workout",
    "category": "CrossFit",
    "difficulty": "Intermediate",
    "duration": 20,
    "calories": 280,
    "intensity": "High",
    "equipment": [
      "Pull-up Bar"
    ],
    "targetMuscles": [
      "Full Body"
    ],
    "benefits": [
      "Builds work capacity",
      "Tests endurance",
      "Improves strength",
      "Benchmarks progress"
    ],
    "tags": [
      "crossfit",
      "amrap",
      "benchmark",
      "functional"
    ],
    "prerequisites": [
      "Can do pull-ups",
      "Good fitness base"
    ],
    "cautions": [
      "Scale as needed",
      "Maintain form under fatigue"
    ],
    "restPeriod": 0,
    "sets": 1,
    "slug": "crossfit-wod-cindy"
  },
  {
    "title": "CrossFit Chipper Challenge",
    "description": "A long, grueling workout completing a ladder of exercises only once. Work through 50-40-30-20-10 reps of various movements. This tests mental toughness and physical endurance.",
    "shortDescription": "Descending rep ladder challenge",
    "category": "CrossFit",
    "difficulty": "Advanced",
    "duration": 40,
    "calories": 450,
    "intensity": "Very High",
    "equipment": [
      "Barbell",
      "Pull-up Bar",
      "Box"
    ],
    "targetMuscles": [
      "Full Body"
    ],
    "benefits": [
      "Tests endurance",
      "Builds mental toughness",
      "Full body conditioning",
      "High calorie burn"
    ],
    "tags": [
      "crossfit",
      "chipper",
      "conditioning",
      "endurance"
    ],
    "prerequisites": [
      "CrossFit experience",
      "Strong fitness base"
    ],
    "cautions": [
      "Pace yourself",
      "Scale if needed",
      "Maintain form"
    ],
    "restPeriod": 0,
    "sets": 1,
    "slug": "crossfit-chipper-challenge"
  },
  {
    "title": "Zumba Cardio Party",
    "description": "A fun, high-energy dance workout set to Latin and international music. This cardio session disguised as a dance party burns calories while improving coordination and boosting mood.",
    "shortDescription": "Fun Latin-inspired dance cardio",
    "category": "Dance",
    "difficulty": "Beginner",
    "duration": 45,
    "calories": 400,
    "intensity": "High",
    "equipment": [
      "None"
    ],
    "targetMuscles": [
      "Full Body",
      "Core",
      "Legs"
    ],
    "benefits": [
      "Burns calories",
      "Improves coordination",
      "Boosts mood",
      "Fun and engaging"
    ],
    "tags": [
      "dance",
      "zumba",
      "cardio",
      "fun"
    ],
    "prerequisites": [
      "None - just move"
    ],
    "cautions": [
      "Stay hydrated",
      "Move at your pace"
    ],
    "restPeriod": 0,
    "sets": 1,
    "slug": "zumba-cardio-party"
  },
  {
    "title": "Hip Hop Dance Fitness",
    "description": "An energetic street-style dance workout featuring hip hop moves and music. This class improves rhythm, coordination, and cardiovascular fitness while having fun.",
    "shortDescription": "Street-style dance for fitness",
    "category": "Dance",
    "difficulty": "Intermediate",
    "duration": 40,
    "calories": 350,
    "intensity": "Moderate",
    "equipment": [
      "None"
    ],
    "targetMuscles": [
      "Full Body",
      "Core"
    ],
    "benefits": [
      "Improves coordination",
      "Burns calories",
      "Enhances rhythm",
      "Builds confidence"
    ],
    "tags": [
      "dance",
      "hip-hop",
      "cardio",
      "coordination"
    ],
    "prerequisites": [
      "Basic rhythm helpful"
    ],
    "cautions": [
      "Warm up joints",
      "Land softly"
    ],
    "restPeriod": 0,
    "sets": 1,
    "slug": "hip-hop-dance-fitness"
  },
  {
    "title": "Boxing Cardio Workout",
    "description": "A high-intensity boxing-inspired cardio workout combining punches, footwork, and conditioning drills. This session improves cardiovascular fitness, coordination, and upper body endurance.",
    "shortDescription": "Boxing-inspired cardio and conditioning",
    "category": "Martial Arts",
    "difficulty": "Intermediate",
    "duration": 35,
    "calories": 380,
    "intensity": "High",
    "equipment": [
      "Boxing Gloves",
      "Heavy Bag",
      "Optional: Jump Rope"
    ],
    "targetMuscles": [
      "Arms",
      "Shoulders",
      "Core",
      "Legs"
    ],
    "benefits": [
      "Improves cardio",
      "Builds upper body endurance",
      "Enhances coordination",
      "Stress relief"
    ],
    "tags": [
      "boxing",
      "cardio",
      "martial-arts",
      "conditioning"
    ],
    "prerequisites": [
      "Basic boxing stance knowledge"
    ],
    "cautions": [
      "Wrap hands properly",
      "Maintain guard",
      "Don't overextend punches"
    ],
    "restPeriod": 30,
    "sets": 3,
    "slug": "boxing-cardio-workout"
  },
  {
    "title": "Kickboxing HIIT Fusion",
    "description": "A fusion of kickboxing techniques and HIIT principles. This workout combines kicks, punches, and bodyweight exercises for a full-body conditioning session that burns serious calories.",
    "shortDescription": "Kickboxing meets HIIT for explosive workout",
    "category": "Martial Arts",
    "difficulty": "Intermediate",
    "duration": 30,
    "calories": 400,
    "intensity": "Very High",
    "equipment": [
      "None"
    ],
    "targetMuscles": [
      "Full Body"
    ],
    "benefits": [
      "High calorie burn",
      "Improves power",
      "Builds coordination",
      "Stress relief"
    ],
    "tags": [
      "kickboxing",
      "hiit",
      "martial-arts",
      "full-body"
    ],
    "prerequisites": [
      "Basic fitness"
    ],
    "cautions": [
      "Control kicks",
      "Protect knees",
      "Land softly"
    ],
    "restPeriod": 20,
    "sets": 4,
    "slug": "kickboxing-hiit-fusion"
  },
  {
    "title": "Lap Swimming Endurance",
    "description": "A structured swimming workout focusing on building endurance through varied strokes and distances. This low-impact cardio session works the entire body while being easy on joints.",
    "shortDescription": "Full-body swimming endurance session",
    "category": "Swimming",
    "difficulty": "Intermediate",
    "duration": 45,
    "calories": 450,
    "intensity": "Moderate",
    "equipment": [
      "Pool",
      "Goggles",
      "Optional: Kickboard"
    ],
    "targetMuscles": [
      "Full Body",
      "Back",
      "Shoulders",
      "Core"
    ],
    "benefits": [
      "Low-impact cardio",
      "Full body workout",
      "Improves technique",
      "Joint-friendly"
    ],
    "tags": [
      "swimming",
      "cardio",
      "low-impact",
      "endurance"
    ],
    "prerequisites": [
      "Can swim multiple strokes"
    ],
    "cautions": [
      "Don't overexert",
      "Breathe properly",
      "Rest between sets"
    ],
    "restPeriod": 30,
    "sets": 4,
    "slug": "lap-swimming-endurance"
  },
  {
    "title": "Aqua Aerobics",
    "description": "A fun, low-impact water aerobics class perfect for all fitness levels. The water provides natural resistance while protecting joints, making this ideal for active recovery or those with joint issues.",
    "shortDescription": "Low-impact water aerobics for all levels",
    "category": "Swimming",
    "difficulty": "Beginner",
    "duration": 40,
    "calories": 250,
    "intensity": "Moderate",
    "equipment": [
      "Pool",
      "Optional: Water Weights"
    ],
    "targetMuscles": [
      "Full Body"
    ],
    "benefits": [
      "Low-impact",
      "Joint-friendly",
      "Improves cardio",
      "Fun group activity"
    ],
    "tags": [
      "aqua",
      "low-impact",
      "water",
      "recovery"
    ],
    "prerequisites": [
      "Comfortable in water"
    ],
    "cautions": [
      "Stay hydrated even in water",
      "Don't overdo it"
    ],
    "restPeriod": 20,
    "sets": 1,
    "slug": "aqua-aerobics"
  },
  {
    "title": "Kettlebell Total Body",
    "description": "A dynamic kettlebell workout using swings, cleans, and presses to build functional strength and power. This workout combines strength and cardio for an efficient full-body session.",
    "shortDescription": "Kettlebell exercises for strength and power",
    "category": "Strength",
    "difficulty": "Intermediate",
    "duration": 35,
    "calories": 320,
    "intensity": "High",
    "equipment": [
      "Kettlebell"
    ],
    "targetMuscles": [
      "Full Body",
      "Core",
      "Posterior Chain"
    ],
    "benefits": [
      "Builds functional strength",
      "Improves power",
      "Burns calories",
      "Enhances grip strength"
    ],
    "tags": [
      "kettlebell",
      "strength",
      "functional",
      "full-body"
    ],
    "prerequisites": [
      "Kettlebell safety knowledge"
    ],
    "cautions": [
      "Start with appropriate weight",
      "Protect back",
      "Control swings"
    ],
    "restPeriod": 45,
    "sets": 4,
    "slug": "kettlebell-total-body"
  },
  {
    "title": "TRX Suspension Training",
    "description": "A challenging bodyweight workout using suspension straps. Every exercise engages the core while building strength, balance, and flexibility using your own bodyweight as resistance.",
    "shortDescription": "Suspension training for functional strength",
    "category": "Strength",
    "difficulty": "Intermediate",
    "duration": 30,
    "calories": 250,
    "intensity": "Moderate",
    "equipment": [
      "TRX Straps"
    ],
    "targetMuscles": [
      "Full Body",
      "Core"
    ],
    "benefits": [
      "Builds functional strength",
      "Improves balance",
      "Engages core",
      "Scalable difficulty"
    ],
    "tags": [
      "trx",
      "suspension",
      "bodyweight",
      "functional"
    ],
    "prerequisites": [
      "TRX setup knowledge"
    ],
    "cautions": [
      "Secure anchor point",
      "Control movements",
      "Engage core"
    ],
    "restPeriod": 30,
    "sets": 3,
    "slug": "trx-suspension-training"
  },
  {
    "title": "Barre Sculpt & Tone",
    "description": "A ballet-inspired workout combining small, controlled movements with isometric holds. This low-impact class sculpts long, lean muscles while improving posture and flexibility.",
    "shortDescription": "Ballet-inspired sculpting workout",
    "category": "Pilates",
    "difficulty": "Beginner",
    "duration": 40,
    "calories": 180,
    "intensity": "Moderate",
    "equipment": [
      "Barre or Chair",
      "Light Weights"
    ],
    "targetMuscles": [
      "Legs",
      "Glutes",
      "Core",
      "Arms"
    ],
    "benefits": [
      "Tones muscles",
      "Improves posture",
      "Increases flexibility",
      "Low-impact"
    ],
    "tags": [
      "barre",
      "toning",
      "ballet",
      "low-impact"
    ],
    "prerequisites": [
      "None"
    ],
    "cautions": [
      "Don't lock joints",
      "Maintain alignment",
      "Breathe steadily"
    ],
    "restPeriod": 10,
    "sets": 1,
    "slug": "barre-sculpt-tone"
  },
  {
    "title": "Battle Ropes Conditioning",
    "description": "An intense upper body and core workout using heavy ropes. This conditioning session builds strength, power, and muscular endurance while providing serious cardio benefits.",
    "shortDescription": "Intense rope training for power and conditioning",
    "category": "HIIT",
    "difficulty": "Advanced",
    "duration": 20,
    "calories": 280,
    "intensity": "Very High",
    "equipment": [
      "Battle Ropes"
    ],
    "targetMuscles": [
      "Arms",
      "Shoulders",
      "Core",
      "Back"
    ],
    "benefits": [
      "Builds power",
      "Improves conditioning",
      "Strengthens grip",
      "High calorie burn"
    ],
    "tags": [
      "battle-ropes",
      "conditioning",
      "power",
      "hiit"
    ],
    "prerequisites": [
      "Good upper body strength"
    ],
    "cautions": [
      "Engage core",
      "Don't overgrip",
      "Control movements"
    ],
    "restPeriod": 30,
    "sets": 6,
    "slug": "battle-ropes-conditioning"
  },
  {
    "title": "ACE Cardiorespiratory Fitness Builder",
    "description": "A professional cardiovascular program following the ACE IFT model. It blends steady-state Zone 1 training (Talk Test threshold) with dynamic Zone 2 fitness intervals to build aerobic power, fat oxidation, and cardiac health.",
    "shortDescription": "Aerobic and interval training following the ACE IFT protocol",
    "category": "Cardio",
    "difficulty": "Intermediate",
    "duration": 30,
    "calories": 240,
    "intensity": "Moderate",
    "equipment": [
      "None"
    ],
    "targetMuscles": [
      "Full Body",
      "Heart",
      "Legs"
    ],
    "benefits": [
      "Improves aerobic capacity",
      "Enhances cardiovascular endurance",
      "Burns fat",
      "Lowers resting heart rate"
    ],
    "tags": [
      "ace-ift",
      "cardio",
      "endurance",
      "aerobic",
      "active-recovery"
    ],
    "prerequisites": [
      "Basic physical activity readiness"
    ],
    "cautions": [
      "Maintain moderate intensity",
      "Slow down if dizzy"
    ],
    "restPeriod": 30,
    "sets": 1,
    "steps": [
      {
        "stepNumber": 1,
        "instruction": "Warm-up: Light marching in place. Start slow to gradually increase heart rate and warm up major muscle groups.",
        "duration": 180,
        "formCues": [
          "Keep posture tall",
          "Pump arms gently at your sides",
          "Breathe deeply through your nose"
        ],
        "commonMistakes": [
          "Marching too fast immediately",
          "Slouching shoulders forward"
        ],
        "breathingPattern": "Inhale 4 seconds, exhale 4 seconds, steady rhythm",
        "gifUrl": "",
        "exerciseDbId": "",
        "exerciseName": "Marching in place"
      },
      {
        "stepNumber": 2,
        "instruction": "Zone 1 Steady State Aerobic Run: Jog at a comfortable pace where you can easily talk (Talk Test threshold). This builds your base aerobic capacity.",
        "duration": 600,
        "formCues": [
          "Land softly on midfoot",
          "Relax neck and shoulders",
          "Engage core slightly"
        ],
        "commonMistakes": [
          "Running too fast to speak",
          "Landing heavily on heels"
        ],
        "breathingPattern": "Regular rhythmic breathing matching your stride",
        "gifUrl": "",
        "exerciseDbId": "",
        "exerciseName": "Steady jogging"
      },
      {
        "stepNumber": 3,
        "instruction": "Zone 2 Fitness Intervals: Increase pace to just above comfortable conversation level for 2 minutes, then recover back to Zone 1 for 2 minutes. Repeat for 3 intervals.",
        "duration": 720,
        "formCues": [
          "Drive knees forward slightly",
          "Control arm swing",
          "Maintain upright posture"
        ],
        "commonMistakes": [
          "Sprinting completely out of breath",
          "Not recovering properly in recovery intervals"
        ],
        "breathingPattern": "Increased breath rate, control the exhalation to calm heart rate during recovery",
        "gifUrl": "",
        "exerciseDbId": "",
        "exerciseName": "Interval running"
      },
      {
        "stepNumber": 4,
        "instruction": "Cool-down & Stretch: Light walking followed by static stretches focusing on hamstrings, quads, and calves.",
        "duration": 300,
        "formCues": [
          "Let heart rate decrease naturally",
          "Hold stretches for 20-30 seconds without bouncing"
        ],
        "commonMistakes": [
          "Stopping abruptly",
          "Bouncing in stretches"
        ],
        "breathingPattern": "Slow, calming deep breaths",
        "gifUrl": "",
        "exerciseDbId": "",
        "exerciseName": "Walking cooldown and stretches"
      }
    ],
    "slug": "ace-cardio-fitness-builder"
  },
  {
    "title": "ACE Functional Muscular Prep",
    "description": "Designed using the Muscular Training component of the ACE IFT model, this program establishes joint mobility, stability, and core endurance. Ideal for pre-conditioning and preventing injuries before adding heavy weight loads.",
    "shortDescription": "Core stability and joint mobility training matching the ACE IFT protocol",
    "category": "Strength",
    "difficulty": "Beginner",
    "duration": 20,
    "calories": 120,
    "intensity": "Low",
    "equipment": [
      "Yoga Mat"
    ],
    "targetMuscles": [
      "Core",
      "Glutes",
      "Shoulders",
      "Back"
    ],
    "benefits": [
      "Improves joint stability",
      "Enhances core strength",
      "Corrects muscular imbalances",
      "Prepares body for loaded exercises"
    ],
    "tags": [
      "ace-ift",
      "functional-training",
      "stability",
      "mobility",
      "beginner-friendly"
    ],
    "prerequisites": [
      "None"
    ],
    "cautions": [
      "Move with control",
      "Stop if you feel sharp pain"
    ],
    "restPeriod": 15,
    "sets": 2,
    "steps": [
      {
        "stepNumber": 1,
        "instruction": "Warm-up Cat-Cow Stretch: On hands and knees, arch your back upward (exhale) and sink it downward (inhale) to mobilize the spine.",
        "duration": 120,
        "formCues": [
          "Keep hands under shoulders, knees under hips",
          "Move slowly with the breath",
          "Relax your neck"
        ],
        "commonMistakes": [
          "Moving too fast",
          "Forcing spine end ranges"
        ],
        "breathingPattern": "Inhale as you look up (Cow), exhale as you round your spine (Cat)",
        "gifUrl": "",
        "exerciseDbId": "",
        "exerciseName": "Cat cow pose"
      },
      {
        "stepNumber": 2,
        "instruction": "Glute Bridge for Hip Extension: Lie on your back, knees bent, feet flat on the floor. Raise hips until body is straight from knees to shoulders to activate glutes.",
        "duration": 180,
        "formCues": [
          "Drive through heels",
          "Squeeze glutes at top",
          "Keep core engaged to avoid arching back"
        ],
        "commonMistakes": [
          "Hyperextending lower back",
          "Allowing knees to cave in"
        ],
        "breathingPattern": "Inhale down, exhale as you lift",
        "gifUrl": "",
        "exerciseDbId": "",
        "exerciseName": "Glute bridge"
      },
      {
        "stepNumber": 3,
        "instruction": "Bird-Dog Core Stability: On all fours, extend your right arm forward and left leg backward until parallel to floor. Hold 2 seconds, alternate sides.",
        "duration": 240,
        "formCues": [
          "Keep hips square to the mat",
          "Neutral neck, look down",
          "Extend, don't lift too high"
        ],
        "commonMistakes": [
          "Arching lower back",
          "Tipping hips side-to-side"
        ],
        "breathingPattern": "Exhale as you extend, inhale as you return to center",
        "gifUrl": "",
        "exerciseDbId": "",
        "exerciseName": "Bird dog exercise"
      },
      {
        "stepNumber": 4,
        "instruction": "Plank Hold for Core Endurance: Place forearms on the ground, extend legs, and hold a straight-line body position.",
        "duration": 160,
        "formCues": [
          "Keep elbows under shoulders",
          "Squeeze thighs and glutes",
          "Don't let hips sag"
        ],
        "commonMistakes": [
          "Sagging hips",
          "Poking butt in the air",
          "Holding breath"
        ],
        "breathingPattern": "Shallow, steady breathing while keeping core braced",
        "gifUrl": "https://static.exercisedb.dev/media/CosupLu.gif",
        "exerciseDbId": "CosupLu",
        "exerciseName": "forearm plank"
      },
      {
        "stepNumber": 5,
        "instruction": "Cool-down Child's Pose: Sink hips back to heels, extend arms forward, and rest forehead on the mat.",
        "duration": 100,
        "formCues": [
          "Relax whole body",
          "Sink deeper into hips with each exhale"
        ],
        "commonMistakes": [
          "Holding shoulders tight"
        ],
        "breathingPattern": "Deep diaphragmatic breathing",
        "gifUrl": "",
        "exerciseDbId": "",
        "exerciseName": "Childs pose"
      }
    ],
    "slug": "ace-functional-muscular-prep"
  }
];

workoutsData.forEach(workout => {
  if (!workout.slug) {
    workout.slug = workout.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }
});

module.exports = workoutsData;
