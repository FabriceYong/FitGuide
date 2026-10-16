const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Workout title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [200, 'Short description cannot exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['HIIT', 'Yoga', 'Strength', 'Cardio', 'Flexibility', 'Pilates', 'CrossFit', 'Dance', 'Martial Arts', 'Swimming'],
    },
    difficulty: {
      type: String,
      required: [true, 'Difficulty level is required'],
      enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
    },
    duration: {
      type: Number, // in minutes
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    calories: {
      type: Number, // estimated calories burned
      min: [0, 'Calories cannot be negative'],
    },
    intensity: {
      type: String,
      enum: ['Low', 'Moderate', 'High', 'Very High'],
      default: 'Moderate',
    },
    equipment: [{
      type: String,
      trim: true,
    }],
    targetMuscles: [{
      type: String,
      trim: true,
    }],
    benefits: [{
      type: String,
      trim: true,
    }],
    steps: [{
      stepNumber: Number,
      instruction: String,
      duration: Number,        // in seconds
      imageUrl: String,        // static image URL (legacy / manual)
      gifUrl: String,          // animated GIF from ExerciseDB (auto-assigned)
      exerciseDbId: String,    // ExerciseDB exercise ID for future lookups
      exerciseName: String,    // matched exercise name from ExerciseDB
      formCues: [String],      // Array of form tips
      commonMistakes: [String], // Array of mistakes to avoid
      breathingPattern: String, // Breathing guidance
    }],
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    videoUrl: {
      type: String,
      trim: true,
    },
    customImageUrl: {
      type: String,
      trim: true,
    },
    imageGallery: [{
      type: String,
      trim: true,
    }],
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    prerequisites: [{
      type: String,
      trim: true,
    }],
    cautions: [{
      type: String,
      trim: true,
    }],
    modifications: [{
      level: String, // 'easier' or 'harder'
      description: String,
    }],
    restPeriod: {
      type: Number, // in seconds
      default: 30,
    },
    sets: {
      type: Number,
      default: 1,
    },
    reps: {
      type: Number,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    likedBy: {
      type: [String], // user ids, so each user can like a workout once
      default: [],
      select: false,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for faster queries
workoutSchema.index({ category: 1 });
workoutSchema.index({ difficulty: 1 });
workoutSchema.index({ tags: 1 });
workoutSchema.index({ isPublished: 1 });

// Method to generate slug from title
workoutSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }
  next();
});

// Method to return public workout data
workoutSchema.methods.toPublicObject = function () {
  return {
    id: this._id,
    title: this.title,
    slug: this.slug,
    description: this.description,
    shortDescription: this.shortDescription,
    category: this.category,
    difficulty: this.difficulty,
    duration: this.duration,
    calories: this.calories,
    intensity: this.intensity,
    equipment: this.equipment,
    targetMuscles: this.targetMuscles,
    benefits: this.benefits,
    steps: this.steps,
    thumbnailUrl: this.thumbnailUrl,
    videoUrl: this.videoUrl,
    imageGallery: this.imageGallery,
    tags: this.tags,
    prerequisites: this.prerequisites,
    cautions: this.cautions,
    modifications: this.modifications,
    restPeriod: this.restPeriod,
    sets: this.sets,
    reps: this.reps,
    viewCount: this.viewCount,
    likeCount: this.likeCount,
    averageRating: this.averageRating,
    totalReviews: this.totalReviews,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Workout = mongoose.model('Workout', workoutSchema);

module.exports = Workout;