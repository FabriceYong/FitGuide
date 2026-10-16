const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password in queries by default
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
      default: 'Prefer not to say',
    },
    height: {
      type: Number,
      min: [50, 'Height must be at least 50 cm'],
      max: [250, 'Height cannot exceed 250 cm'],
      default: 170,
    },
    weight: {
      type: Number,
      min: [30, 'Weight must be at least 30 kg'],
      max: [250, 'Weight cannot exceed 250 kg'],
      default: 70,
    },
    targetWeight: {
      type: Number,
      min: [30, 'Weight must be at least 30 kg'],
      max: [250, 'Weight cannot exceed 250 kg'],
      default: 70,
    },
    fitnessLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
    },
    activityStatus: {
      type: String,
      enum: ['Active', 'Inactive', 'Moderately Active', 'Very Active'],
      default: 'Active',
    },
    goal: {
      type: String,
      enum: ['Vitality', 'Muscle', 'Weight', 'Flexibility'],
      default: 'Vitality',
    },
    diet: {
      type: String,
      enum: ['Keto Diet', 'Mediterranean Diet', 'Paleo Diet', 'Intermittent Fasting', 'Flexible Balanced Plan'],
      default: 'Mediterranean Diet',
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    favoriteWorkouts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workout',
    }],
    customWorkoutImages: [{
      workoutId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workout',
      },
      customImageUrl: {
        type: String,
      },
    }],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Return a clean public profile (exclude sensitive fields)
userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    gender: this.gender || 'Prefer not to say',
    height: this.height || 170,
    weight: this.weight || 70,
    targetWeight: this.targetWeight || 70,
    fitnessLevel: this.fitnessLevel || 'Beginner',
    activityStatus: this.activityStatus || 'Active',
    goal: this.goal || 'Vitality',
    diet: this.diet || 'Mediterranean Diet',
    avatarUrl: this.avatarUrl,
    favoriteWorkouts: this.favoriteWorkouts || [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
