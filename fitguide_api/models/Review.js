const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    userAvatar: {
      type: String,
      default: null,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    workoutRegiment: {
      type: String,
      default: null,
      trim: true,
    },
    workoutId: {
      type: String,
      default: null,
      trim: true,
      index: true, // Add index for faster queries
    },
    beforeImage: {
      type: String,
      default: null,
    },
    afterImage: {
      type: String,
      default: null,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: {
      type: [String], // user ids, so each user can like a review once
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Clean public model output
reviewSchema.methods.toPublicObject = function () {
  return {
    id: this._id,
    userId: this.userId,
    name: this.name,
    userAvatar: this.userAvatar,
    rating: this.rating,
    comment: this.comment,
    workoutRegiment: this.workoutRegiment,
    workoutId: this.workoutId,
    beforeImage: this.beforeImage,
    afterImage: this.afterImage,
    likes: this.likes,
    createdAt: this.createdAt,
  };
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
