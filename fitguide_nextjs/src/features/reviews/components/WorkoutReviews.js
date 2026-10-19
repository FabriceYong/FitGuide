'use client';

import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, Plus, Image as ImageIcon, X, Check, User } from 'lucide-react';

import { apiRequest, assetUrl } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

export const WorkoutReviews = ({ workoutId, workoutTitle }) => {
    const { hasAccount } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddReview, setShowAddReview] = useState(false);
    const [averageRating, setAverageRating] = useState(0);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await apiRequest('/reviews', { query: { workoutId } });
            setReviews(data.reviews);
            const total = data.reviews.reduce((sum, r) => sum + r.rating, 0);
            setAverageRating(data.reviews.length > 0 ? total / data.reviews.length : 0);
        } catch (err) {
            setError(err.message || 'Could not connect to review service');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (workoutId) {
            fetchReviews();
        }
    }, [workoutId]);

    const handleLikeReview = async (reviewId) => {
        try {
            if (!hasAccount) return;
            const data = await apiRequest(`/reviews/${reviewId}/like`, { method: 'POST', auth: true });
            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, likes: data.likes } : r));
        } catch (err) {
            console.error('Error liking review:', err);
        }
    };

    const handleReviewSubmitted = () => {
        setShowAddReview(false);
        fetchReviews();
    };

    return (
        <div className="space-y-6">
            {/* Header / Summary */}
            <div className="flex items-center justify-between bg-obsidian-wave p-6 rounded-2xl border border-white-30/10">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">Community Reviews</h3>
                    <div className="flex items-center gap-2">
                        <div className="flex text-amber-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-4 h-4 ${star <= Math.round(averageRating) ? 'text-lime-light fill-current' : 'text-white-30'}`}
                                />
                            ))}
                        </div>
                        <span className="text-sm text-white-70">
                            {averageRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                        </span>
                    </div>
                </div>

                {hasAccount && (
                    <button
                        onClick={() => setShowAddReview(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-lime-light text-noir-eclipse rounded-xl font-bold text-sm hover:bg-lime-light/90 transition-all cursor-pointer border border-lime-light/30"
                    >
                        <Plus className="w-4 h-4" />
                        Add Review
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-300 text-sm">
                    {error}
                </div>
            )}

            {/* Reviews List */}
            {reviews.length === 0 && !loading ? (
                <div className="text-center py-12 bg-obsidian-wave/50 rounded-2xl border border-white-30/10">
                    <div className="w-16 h-16 bg-white-30/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Star className="w-8 h-8 text-white-30" />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2">No reviews yet</h4>
                    <p className="text-white-70 text-sm mb-4">Be the first to share your experience with this workout!</p>
                    {hasAccount && (
                        <button
                            onClick={() => setShowAddReview(true)}
                            className="px-6 py-3 bg-lime-light text-noir-eclipse rounded-xl font-bold text-sm hover:bg-lime-light/90 transition-all cursor-pointer border border-lime-light/30"
                        >
                            Write First Review
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <ReviewCard key={review.id} review={review} onLike={() => handleLikeReview(review.id)} />
                    ))}
                </div>
            )}

            {/* Add Review Modal */}
            {showAddReview && (
                <AddReviewModal
                    workoutId={workoutId}
                    workoutTitle={workoutTitle}
                    onClose={() => setShowAddReview(false)}
                    onReviewSubmitted={handleReviewSubmitted}
                />
            )}
        </div>
    );
};

const ReviewCard = ({ review, onLike }) => {
    const [showFullImages, setShowFullImages] = useState(false);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="bg-obsidian-wave rounded-2xl p-6 border border-white-30/10">
            {/* User Info and Rating */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-noir-eclipse rounded-full flex items-center justify-center border border-white-30/20">
                        {review.userAvatar ? (
                            <img src={assetUrl(review.userAvatar)} alt={review.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <User className="w-5 h-5 text-white-70" />
                        )}
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-sm">{review.name}{review.verified && <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300" title="Completed this workout in FitGuide">Verified</span>}</h4>
                        <p className="text-white-70 text-xs">{formatDate(review.createdAt)}</p>
                    </div>
                </div>

                <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={`w-4 h-4 ${star <= review.rating ? 'text-lime-light fill-current' : 'text-white-30'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Comment */}
            <p className="text-white-90 text-sm leading-relaxed mb-4">{review.comment}</p>

            {/* Photos (Before / After) */}
            {(review.beforeImage || review.afterImage) && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-4 h-4 text-lime-light" />
                        <span className="text-xs font-bold text-lime-light uppercase">Transformation Photos</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {review.beforeImage && (
                            <div className="relative rounded-xl overflow-hidden aspect-video bg-noir-eclipse border border-white-30/10">
                                <img src={assetUrl(review.beforeImage)} alt="Before" className="w-full h-full object-cover" />
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-noir-eclipse/80 backdrop-blur-sm rounded text-[10px] text-white font-bold">
                                    Before
                                </span>
                            </div>
                        )}
                        {review.afterImage && (
                            <div className="relative rounded-xl overflow-hidden aspect-video bg-noir-eclipse border border-lime-light/30">
                                <img src={assetUrl(review.afterImage)} alt="After" className="w-full h-full object-cover" />
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-lime-light text-noir-eclipse rounded text-[10px] font-bold">
                                    After
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-white-30/10 text-xs">
                <button
                    onClick={onLike}
                    className="flex items-center gap-1.5 text-white-70 hover:text-lime-light transition-colors cursor-pointer"
                >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Helpful ({review.likes || 0})</span>
                </button>
            </div>
        </div>
    );
};

const AddReviewModal = ({ workoutId, workoutTitle, onClose, onReviewSubmitted }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [beforePhoto, setBeforePhoto] = useState(null);
    const [afterPhoto, setAfterPhoto] = useState(null);
    const [beforePreview, setBeforePreview] = useState(null);
    const [afterPreview, setAfterPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handlePhotoChange = (e, setPhoto, setPreview) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('workoutId', workoutId);
            formData.append('rating', rating);
            formData.append('comment', comment);

            if (beforePhoto) formData.append('beforeImage', beforePhoto);
            if (afterPhoto) formData.append('afterImage', afterPhoto);

            await apiRequest('/reviews', { method: 'POST', formData, auth: true });
            onReviewSubmitted();
        } catch (err) {
            setError(err.message || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-noir-eclipse/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-obsidian-wave border border-white-30/20 rounded-3xl max-w-lg w-full p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Write a Review</h3>
                    <button onClick={onClose} className="p-2 text-white-70 hover:text-white transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-xs">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Star Rating */}
                    <div>
                        <label className="text-xs font-bold text-white-70 uppercase tracking-wider block mb-2">
                            Rating
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                                >
                                    <Star
                                        className={`w-8 h-8 ${star <= rating ? 'text-lime-light fill-current' : 'text-white-30'}`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="text-xs font-bold text-white-70 uppercase tracking-wider block mb-2">
                            Review
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share details of your experience..."
                            required
                            rows={4}
                            className="w-full bg-noir-eclipse border border-white-30/20 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-lime-light transition-colors"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="flex-1 px-4 py-3 border border-white-30/20 text-white-70 rounded-xl font-bold text-sm hover:bg-white-30/5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !comment.trim()}
                            className="flex-1 px-4 py-3 bg-lime-light text-noir-eclipse rounded-xl font-bold text-sm hover:bg-lime-light/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-lime-light/30"
                        >
                            {submitting ? 'Submitting...' : 'Submit Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
