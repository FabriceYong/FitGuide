'use client';

/**
 * Workout Service
 * Centralized API calls for workout-related operations
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const FALLBACK_WORKOUTS = [
  // ── ADVANCED ─────────────────────────────────────────────────────────────────
  {
    id: "w_1", slug: "high-intensity-tabata-burn", title: "High-Intensity Tabata Burn",
    description: "An intense 20-minute HIIT workout following the Tabata protocol. Alternates 20s max effort & 10s rest for peak calorie burn and metabolic conditioning.",
    shortDescription: "Intense 20-minute Tabata protocol for maximum fat burn",
    category: "HIIT", difficulty: "Advanced", duration: 20, calories: 250, intensity: "Very High",
    equipment: ["None"], targetMuscles: ["Full Body", "Quads", "Core"], tags: ["fat-loss", "tabata", "bodyweight"], viewCount: 1420,
  },
  {
    id: "w_7", slug: "powerlifting-peak-strength", title: "Powerlifting Peak Strength",
    description: "A 60-minute powerlifting session focusing on the big three: Squat, Bench Press, and Deadlift at near-maximal loads for strength peaks.",
    shortDescription: "Big three compound lifts for maximum strength",
    category: "Powerlifting", difficulty: "Advanced", duration: 60, calories: 450, intensity: "Very High",
    equipment: ["Barbell", "Power Rack", "Bench"], targetMuscles: ["Quads", "Chest", "Hamstrings", "Glutes", "Lats"],
    tags: ["powerlifting", "strength", "squat", "deadlift"], viewCount: 890,
  },
  {
    id: "w_8", slug: "crossfit-wod-hero", title: "CrossFit Hero WOD",
    description: "A brutal 35-minute CrossFit workout of the day combining Olympic lifting, gymnastics, and metabolic conditioning for elite fitness.",
    shortDescription: "Brutal CrossFit WOD combining lifting, gymnastics & metcon",
    category: "CrossFit", difficulty: "Advanced", duration: 35, calories: 420, intensity: "Very High",
    equipment: ["Barbell", "Pull-Up Bar", "Kettlebell"], targetMuscles: ["Full Body", "Shoulders", "Core"],
    tags: ["crossfit", "wod", "metcon", "olympic"], viewCount: 760,
  },
  {
    id: "w_9", slug: "boxing-heavy-bag-rounds", title: "Boxing Heavy Bag Rounds",
    description: "8 rounds of intense heavy bag boxing with technical combinations, footwork drills, and defensive movement. Total body conditioning.",
    shortDescription: "8 rounds of heavy bag boxing for power & conditioning",
    category: "Boxing", difficulty: "Advanced", duration: 40, calories: 480, intensity: "Very High",
    equipment: ["Boxing Gloves", "Heavy Bag"], targetMuscles: ["Shoulders", "Core", "Legs", "Arms"],
    tags: ["boxing", "combat", "cardio", "conditioning"], viewCount: 640,
  },
  {
    id: "w_10", slug: "plyometric-explosive-power", title: "Plyometric Explosive Power",
    description: "A 30-minute explosive plyometrics session with box jumps, depth jumps, broad jumps, and bounding to maximize athletic power output.",
    shortDescription: "Explosive plyometric circuit for athletic power development",
    category: "Plyometrics", difficulty: "Advanced", duration: 30, calories: 360, intensity: "Very High",
    equipment: ["Plyo Box", "None"], targetMuscles: ["Quads", "Glutes", "Calves", "Core"],
    tags: ["plyometrics", "explosive", "athletic", "jumping"], viewCount: 510,
  },
  // ── INTERMEDIATE ─────────────────────────────────────────────────────────────
  {
    id: "w_3", slug: "full-body-strength-hypertrophy", title: "Full Body Strength & Hypertrophy",
    description: "A comprehensive 45-minute strength training routine focusing on compound movements for mass & strength development.",
    shortDescription: "45-minute compound lifting session for total body growth",
    category: "Strength", difficulty: "Intermediate", duration: 45, calories: 380, intensity: "High",
    equipment: ["Barbell", "Dumbbell"], targetMuscles: ["Chest", "Lats", "Quads", "Glutes", "Deltoids"],
    tags: ["muscle-building", "compound", "hypertrophy"], viewCount: 2100,
  },
  {
    id: "w_4", slug: "cardio-endurance-booster", title: "Cardio Endurance Booster",
    description: "A 25-minute fast-paced cardio workout designed to boost heart rate, improve stamina, and torch calories efficiently.",
    shortDescription: "Fast-paced aerobic routine for peak stamina and heart health",
    category: "Cardio", difficulty: "Intermediate", duration: 25, calories: 290, intensity: "High",
    equipment: ["None"], targetMuscles: ["Heart", "Calves", "Quads", "Core"],
    tags: ["cardio", "stamina", "endurance"], viewCount: 850,
  },
  {
    id: "w_6", slug: "upper-body-pump-session", title: "Upper Body Pump Session",
    description: "Sculpt and strengthen your chest, back, shoulders, and arms with this high-volume upper body hypertrophy routine.",
    shortDescription: "High-volume hypertrophy for chest, back, shoulders, and arms",
    category: "Strength", difficulty: "Intermediate", duration: 35, calories: 310, intensity: "High",
    equipment: ["Dumbbell", "Cable Machine"], targetMuscles: ["Chest", "Lats", "Biceps", "Triceps", "Deltoids"],
    tags: ["upper-body", "pump", "strength"], viewCount: 1620,
  },
  {
    id: "w_11", slug: "pilates-power-core-sculpt", title: "Pilates Power Core Sculpt",
    description: "A 40-minute reformer-inspired mat Pilates session focused on precise core activation, spinal articulation, and total body sculpting.",
    shortDescription: "Mat Pilates for deep core strength and graceful control",
    category: "Pilates", difficulty: "Intermediate", duration: 40, calories: 200, intensity: "Moderate",
    equipment: ["Mat", "Resistance Band"], targetMuscles: ["Core", "Glutes", "Inner Thighs", "Shoulders"],
    tags: ["pilates", "core", "sculpt", "flexibility"], viewCount: 780,
  },
  {
    id: "w_12", slug: "calisthenics-skill-builder", title: "Calisthenics Skill Builder",
    description: "A 45-minute progressive calisthenics session developing handstand balance, muscle-up progressions, and L-sit strength.",
    shortDescription: "Progressive calisthenics for handstands, muscle-ups & skill work",
    category: "Calisthenics", difficulty: "Intermediate", duration: 45, calories: 320, intensity: "High",
    equipment: ["Pull-Up Bar", "Parallel Bars"], targetMuscles: ["Shoulders", "Core", "Chest", "Triceps"],
    tags: ["calisthenics", "bodyweight", "skill", "handstand"], viewCount: 930,
  },
  {
    id: "w_13", slug: "dance-fitness-cardio-fusion", title: "Dance Fitness Cardio Fusion",
    description: "A 30-minute high-energy dance fitness session combining Zumba-style movements with HIIT intervals for a fun, sweaty workout.",
    shortDescription: "Fun Zumba-HIIT fusion dance cardio for full body burn",
    category: "Dance Fitness", difficulty: "Intermediate", duration: 30, calories: 270, intensity: "High",
    equipment: ["None"], targetMuscles: ["Full Body", "Core", "Legs"],
    tags: ["dance", "zumba", "fun", "cardio"], viewCount: 1100,
  },
  {
    id: "w_14", slug: "functional-strength-circuit", title: "Functional Strength Circuit",
    description: "A 35-minute functional training circuit using kettlebells and bodyweight to build real-world strength, coordination, and balance.",
    shortDescription: "Kettlebell & bodyweight functional circuit for everyday strength",
    category: "Functional Training", difficulty: "Intermediate", duration: 35, calories: 340, intensity: "High",
    equipment: ["Kettlebell", "None"], targetMuscles: ["Full Body", "Core", "Glutes", "Shoulders"],
    tags: ["functional", "kettlebell", "circuit", "balance"], viewCount: 720,
  },
  {
    id: "w_15", slug: "olympic-lifting-foundations", title: "Olympic Lifting Foundations",
    description: "A 50-minute Olympic weightlifting session drilling the clean & jerk and snatch with technique focus and progressive loading.",
    shortDescription: "Technical Olympic lifting session for power and coordination",
    category: "Powerlifting", difficulty: "Intermediate", duration: 50, calories: 400, intensity: "High",
    equipment: ["Barbell", "Bumper Plates"], targetMuscles: ["Full Body", "Quads", "Traps", "Shoulders"],
    tags: ["olympic", "clean", "snatch", "technique"], viewCount: 560,
  },
  // ── BEGINNER ─────────────────────────────────────────────────────────────────
  {
    id: "w_2", slug: "morning-zen-yoga-flow", title: "Morning Zen Yoga Flow",
    description: "A gentle 30-minute morning yoga flow designed to awaken your body, improve flexibility, and calm your mind. Perfect for all levels.",
    shortDescription: "Gentle morning flow for flexibility and mindfulness",
    category: "Yoga", difficulty: "Beginner", duration: 30, calories: 120, intensity: "Low",
    equipment: ["Mat"], targetMuscles: ["Hamstrings", "Hips", "Lower Back", "Shoulders"],
    tags: ["flexibility", "mindfulness", "stretching"], viewCount: 980,
  },
  {
    id: "w_5", slug: "core-power-and-stability", title: "Core Power & Stability",
    description: "A targeted 15-minute core strength routine strengthening your abdominals, obliques, and lumbar spine for better posture.",
    shortDescription: "15-minute intense core stabilization workout",
    category: "Core", difficulty: "Beginner", duration: 15, calories: 140, intensity: "Moderate",
    equipment: ["Mat"], targetMuscles: ["Abs", "Obliques", "Lower Back"],
    tags: ["core", "abs", "posture"], viewCount: 1750,
  },
  {
    id: "w_16", slug: "beginners-full-body-start", title: "Beginner Full Body Kickstart",
    description: "A beginner-friendly 20-minute full body workout using only bodyweight. Learn proper movement patterns and build confidence in the gym.",
    shortDescription: "20-minute bodyweight routine for absolute beginners",
    category: "Strength", difficulty: "Beginner", duration: 20, calories: 150, intensity: "Low",
    equipment: ["None"], targetMuscles: ["Full Body", "Core", "Legs"],
    tags: ["beginner", "bodyweight", "fundamentals"], viewCount: 2800,
  },
  {
    id: "w_17", slug: "gentle-mobility-flow", title: "Gentle Mobility & Joint Care",
    description: "A 25-minute mobility session targeting major joints — hips, shoulders, spine, and ankles — for long-term health and injury prevention.",
    shortDescription: "Daily joint mobility routine for flexibility and injury prevention",
    category: "Mobility", difficulty: "Beginner", duration: 25, calories: 80, intensity: "Very Low",
    equipment: ["Mat", "Foam Roller"], targetMuscles: ["Hips", "Shoulders", "Spine", "Ankles"],
    tags: ["mobility", "joint-health", "recovery", "flexibility"], viewCount: 1560,
  },
  {
    id: "w_18", slug: "barre-sculpt-tone", title: "Barre Sculpt & Tone",
    description: "A 30-minute beginner barre class inspired by ballet that tones and sculpts the thighs, glutes, and core with small precise movements.",
    shortDescription: "Ballet-inspired barre class for lean leg and glute sculpting",
    category: "Barre", difficulty: "Beginner", duration: 30, calories: 180, intensity: "Moderate",
    equipment: ["Chair or Barre", "Mat"], targetMuscles: ["Quads", "Glutes", "Inner Thighs", "Core"],
    tags: ["barre", "ballet", "sculpt", "legs"], viewCount: 690,
  },
  {
    id: "w_19", slug: "beginner-pilates-foundations", title: "Pilates Foundations for Beginners",
    description: "Learn the 6 Pilates principles in this 25-minute class: breath, centering, concentration, control, precision, and flow.",
    shortDescription: "Introduction to core Pilates principles for newcomers",
    category: "Pilates", difficulty: "Beginner", duration: 25, calories: 130, intensity: "Low",
    equipment: ["Mat"], targetMuscles: ["Core", "Pelvic Floor", "Spine", "Glutes"],
    tags: ["pilates", "beginner", "core", "posture"], viewCount: 1230,
  },
  {
    id: "w_20", slug: "beginner-cardio-walk-run", title: "Walk-to-Run Cardio Starter",
    description: "A beginner cardio program alternating walking and jogging intervals to safely build cardiovascular endurance from the ground up.",
    shortDescription: "Walk-to-run intervals for beginner cardiovascular fitness",
    category: "Cardio", difficulty: "Beginner", duration: 30, calories: 180, intensity: "Low",
    equipment: ["None"], targetMuscles: ["Legs", "Heart", "Core"],
    tags: ["walking", "running", "beginner", "cardio"], viewCount: 3100,
  },
  {
    id: "w_21", slug: "intro-to-yoga-sun-salutation", title: "Introduction to Sun Salutation",
    description: "A beginner-focused 20-minute class breaking down each pose in the Sun Salutation A sequence with careful alignment cues.",
    shortDescription: "Step-by-step breakdown of Sun Salutation for yoga beginners",
    category: "Yoga", difficulty: "Beginner", duration: 20, calories: 90, intensity: "Low",
    equipment: ["Mat"], targetMuscles: ["Full Body", "Spine", "Hamstrings", "Shoulders"],
    tags: ["yoga", "sun-salutation", "beginner", "alignment"], viewCount: 2400,
  },
  {
    id: "w_22", slug: "beginner-boxing-basics", title: "Boxing Basics for Beginners",
    description: "Learn boxing stance, jabs, crosses, hooks, and footwork in this 25-minute beginner boxing fundamentals class. No bag required.",
    shortDescription: "Boxing stance and combination fundamentals for total beginners",
    category: "Boxing", difficulty: "Beginner", duration: 25, calories: 200, intensity: "Moderate",
    equipment: ["None"], targetMuscles: ["Shoulders", "Core", "Legs", "Arms"],
    tags: ["boxing", "beginner", "technique", "cardio"], viewCount: 1450,
  },
  {
    id: "w_23", slug: "beginner-calisthenics-fundamentals", title: "Calisthenics Fundamentals",
    description: "Master the 4 foundational calisthenics movements: push-up, pull-up, squat, and plank progressions in this 20-minute beginner class.",
    shortDescription: "4 foundational bodyweight movements for calisthenics beginners",
    category: "Calisthenics", difficulty: "Beginner", duration: 20, calories: 160, intensity: "Moderate",
    equipment: ["Pull-Up Bar"], targetMuscles: ["Chest", "Back", "Core", "Legs"],
    tags: ["calisthenics", "bodyweight", "beginner", "push-up"], viewCount: 1890,
  },
  {
    id: "w_24", slug: "recovery-stretch-and-breathe", title: "Recovery: Stretch & Breathe",
    description: "A 20-minute guided active recovery session combining gentle stretching, foam rolling, and breathwork to accelerate muscle recovery.",
    shortDescription: "Guided recovery session with stretching, foam rolling & breath",
    category: "Mobility", difficulty: "Beginner", duration: 20, calories: 60, intensity: "Very Low",
    equipment: ["Mat", "Foam Roller"], targetMuscles: ["Full Body", "Fascia"],
    tags: ["recovery", "stretching", "foam-rolling", "breathwork"], viewCount: 2200,
  },
  {
    id: "w_25", slug: "beginner-dance-fitness", title: "Dance Fitness for Beginners",
    description: "An easy-to-follow 25-minute beginner dance fitness class using simple choreography to get moving and have fun while burning calories.",
    shortDescription: "Simple fun choreography for dance fitness newcomers",
    category: "Dance Fitness", difficulty: "Beginner", duration: 25, calories: 190, intensity: "Moderate",
    equipment: ["None"], targetMuscles: ["Full Body", "Legs", "Core"],
    tags: ["dance", "beginner", "fun", "cardio"], viewCount: 870,
  },
  {
    id: "w_26", slug: "functional-movement-basics", title: "Functional Movement Basics",
    description: "A 30-minute introduction to the 7 primal movement patterns: squat, hinge, push, pull, carry, rotate, and gait.",
    shortDescription: "7 primal movements for everyday functional fitness beginners",
    category: "Functional Training", difficulty: "Beginner", duration: 30, calories: 170, intensity: "Low",
    equipment: ["None"], targetMuscles: ["Full Body", "Core", "Hips"],
    tags: ["functional", "movement", "beginner", "primal"], viewCount: 1340,
  },
  {
    id: "w_27", slug: "advanced-hiit-circuit", title: "Advanced HIIT Circuit Challenge",
    description: "A 40-minute advanced HIIT circuit alternating between 6 intense stations — no rest between stations, 90s between rounds.",
    shortDescription: "6-station HIIT circuit with no inter-exercise rest for elite athletes",
    category: "HIIT", difficulty: "Advanced", duration: 40, calories: 520, intensity: "Very High",
    equipment: ["None"], targetMuscles: ["Full Body", "Core", "Legs"],
    tags: ["hiit", "circuit", "advanced", "fat-loss"], viewCount: 1680,
  },
  {
    id: "w_28", slug: "advanced-yoga-inversions", title: "Advanced Yoga Inversions",
    description: "A 50-minute advanced yoga practice exploring handstands, headstands, forearm balance, and shoulderstand with safety progressions.",
    shortDescription: "Advanced inversion practice: handstands, headstands & more",
    category: "Yoga", difficulty: "Advanced", duration: 50, calories: 220, intensity: "Moderate",
    equipment: ["Mat", "Wall"], targetMuscles: ["Shoulders", "Core", "Arms", "Wrists"],
    tags: ["yoga", "inversions", "handstand", "advanced"], viewCount: 490,
  },
  {
    id: "w_29", slug: "barre-advanced-full-body", title: "Advanced Barre Full Body Burn",
    description: "A 45-minute advanced barre class with weighted arm sequences, deep plié marathons, and extended stretching for intense sculpting.",
    shortDescription: "Intense weighted barre class for advanced toning and burn",
    category: "Barre", difficulty: "Advanced", duration: 45, calories: 280, intensity: "High",
    equipment: ["Chair or Barre", "Light Dumbbells", "Mat"], targetMuscles: ["Quads", "Glutes", "Core", "Shoulders"],
    tags: ["barre", "advanced", "sculpt", "weighted"], viewCount: 380,
  },
  {
    id: "w_30", slug: "intermediate-mobility-deep-work", title: "Deep Mobility & Flexibility Work",
    description: "A 35-minute intermediate mobility session using PNF stretching, loaded stretching techniques, and CARs for superior range of motion.",
    shortDescription: "PNF and loaded stretching for intermediate mobility gains",
    category: "Mobility", difficulty: "Intermediate", duration: 35, calories: 110, intensity: "Low",
    equipment: ["Mat", "Resistance Band", "Foam Roller"], targetMuscles: ["Hips", "Thoracic Spine", "Shoulders", "Hamstrings"],
  }
];

export async function fetchWorkouts(filters) {
    try {
        const queryParams = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    queryParams.append(key, String(value));
                }
            });
        }
        const url = `${API_BASE}/workouts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.warn('⚠️ Local API offline/unreachable. Using rich default workouts library:', error.message);
        return {
            success: true,
            workouts: FALLBACK_WORKOUTS,
            isOfflineFallback: true
        };
    }
}

export async function fetchWorkoutBySlug(slug) {
    try {
        const response = await fetch(`${API_BASE}/workouts/${slug}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.warn(`⚠️ Local API offline/unreachable for slug ${slug}. Looking up in fallback dataset.`);
        const found = FALLBACK_WORKOUTS.find(w => w.slug === slug);
        if (found) {
            return { success: true, workout: found };
        }
        return { success: false, message: 'Workout not found' };
    }
}

export async function likeWorkout(slug) {
    try {
        const response = await fetch(`${API_BASE}/workouts/${slug}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error liking workout ${slug}:`, error);
        throw error;
    }
}

export async function fetchCategories() {
    try {
        const response = await fetch(`${API_BASE}/workouts/categories/list`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
}

export async function fetchWorkoutsByCategory(category) {
    return fetchWorkouts({ category });
}

export async function fetchWorkoutsByDifficulty(difficulty) {
    return fetchWorkouts({ difficulty });
}

export async function searchWorkouts(searchQuery) {
    return fetchWorkouts({ search: searchQuery });
}

export async function fetchFeaturedWorkouts() {
    try {
        const response = await fetchWorkouts();
        return response.workouts.filter(w => w.steps && w.steps.length > 0);
    } catch (error) {
        console.error('Error fetching featured workouts:', error);
        return [];
    }
}

export async function fetchPopularWorkouts(limit = 6) {
    try {
        const response = await fetchWorkouts();
        return response.workouts
            .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, limit);
    } catch (error) {
        console.error('Error fetching popular workouts:', error);
        return [];
    }
}

class WorkoutCache {
    cache = new Map();
    cacheTimeout = 5 * 60 * 1000;
    set(slug, workout) {
        this.cache.set(slug, { data: workout, timestamp: Date.now() });
    }
    get(slug) {
        const cached = this.cache.get(slug);
        if (!cached) return null;
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(slug);
            return null;
        }
        return cached.data;
    }
    clear() { this.cache.clear(); }
    has(slug) { return this.cache.has(slug); }
}

export const workoutCache = new WorkoutCache();

export async function fetchWorkoutWithCache(slug, useCache = true) {
    if (useCache) {
        const cached = workoutCache.get(slug);
        if (cached) return { success: true, workout: cached };
    }
    const response = await fetchWorkoutBySlug(slug);
    if (response.success && useCache) {
        workoutCache.set(slug, response.workout);
    }
    return response;
}
