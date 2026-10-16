'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Star, MessageSquare, ThumbsUp, Loader2, Sparkles, Upload, X, AlertCircle, Award } from 'lucide-react';
import { apiRequest, assetUrl } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

export const ReviewsTab = () => {
    const { user, hasAccount } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(null);
    const [comment, setComment] = useState('');
    const [workoutRegiment, setWorkoutRegiment] = useState('');
    const [beforeImageFile, setBeforeImageFile] = useState(null);
    const [beforePreview, setBeforePreview] = useState(null);
    const [afterImageFile, setAfterImageFile] = useState(null);
    const [afterPreview, setAfterPreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const beforeInputRef = useRef(null);
    const afterInputRef = useRef(null);

    const workoutOptions = [
        'Core with Sarah',
        'Morning Zen',
        'Abs Blaster',
        'Yoga Flow',
        'Full Body Crush',
    ];

    // Fetch reviews
    const fetchReviews = async () => {
        try {
            setError(null);
            const data = await apiRequest('/reviews');
            setReviews(data.reviews || []);
        }
        catch (err) {
            setError(err.message || 'Failed to load reviews.');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchReviews();
        }, 0);
        return () => clearTimeout(timer);
    }, []);
    // Handle Likes
    const handleLike = async (id) => {
        if (!hasAccount)
            return;
        try {
            const data = await apiRequest(`/reviews/${id}/like`, { method: 'POST', auth: true });
            // Update with exact backend value (a user's like counts once)
            setReviews(prev => prev.map(r => (r.id === id ? { ...r, likes: data.likes } : r)));
        }
        catch (err) {
            console.error('Liking review failed:', err);
        }
    };
    // Form image handlers
    const handleImageChange = (e, type) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            setSubmitError('Only JPEG, PNG, WebP, and GIF images are allowed.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setSubmitError('Images must be under 5 MB.');
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        if (type === 'before') {
            setBeforeImageFile(file);
            setBeforePreview(previewUrl);
        }
        else {
            setAfterImageFile(file);
            setAfterPreview(previewUrl);
        }
        setSubmitError(null);
    };
    const removeImage = (type) => {
        if (type === 'before') {
            setBeforeImageFile(null);
            if (beforePreview)
                URL.revokeObjectURL(beforePreview);
            setBeforePreview(null);
            if (beforeInputRef.current)
                beforeInputRef.current.value = '';
        }
        else {
            setAfterImageFile(null);
            if (afterPreview)
                URL.revokeObjectURL(afterPreview);
            setAfterPreview(null);
            if (afterInputRef.current)
                afterInputRef.current.value = '';
        }
    };
    // Submit Review Form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('rating', String(rating));
            formData.append('comment', comment);
            if (workoutRegiment)
                formData.append('workoutRegiment', workoutRegiment);
            if (beforeImageFile) {
                formData.append('beforeImage', beforeImageFile);
            }
            if (afterImageFile) {
                formData.append('afterImage', afterImageFile);
            }
            const data = await apiRequest('/reviews', { method: 'POST', formData, auth: true });
            // Refresh list, close form, and reset values
            setShowForm(false);
            setComment('');
            setWorkoutRegiment('');
            setRating(5);
            removeImage('before');
            removeImage('after');
            // Update local state by prepending the new review
            setReviews(prev => [data.review, ...prev]);
        }
        catch (err) {
            if (err instanceof Error) {
                setSubmitError(err.message);
            }
            else {
                setSubmitError('An unexpected error occurred.');
            }
        }
        finally {
            setIsSubmitting(false);
        }
    };
    // Calculate statistics
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
        : '0.0';
    const transformationsCount = reviews.filter(r => r.beforeImage || r.afterImage).length;
    return (<div className="space-y-8 pb-10 text-left">
      {/* Header section */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            Testimonials & Reviews
          </h1>
          <p className="text-sm text-white-70 mt-1">
            Real stories, real progress from the FitGuide community.
          </p>
        </div>
        {hasAccount && <button onClick={() => setShowForm(!showForm)} className="bg-lime-light text-noir-eclipse font-bold px-6 py-3 rounded-full hover:shadow-[0_0_15px_rgba(0, 196, 180,0.3)] transition-all uppercase tracking-wider text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4"/>
          {showForm ? 'Cancel Review' : 'Write a Review'}
        </button>}
      </div>

      {/* Top statistics summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-obsidian-wave p-5 rounded-[20px] border border-white-30/10 flex items-center gap-4">
          <div className="p-3 bg-lime-light/10 rounded-xl text-lime-light">
            <Star className="w-6 h-6 fill-current"/>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{avgRating} / 5</div>
            <div className="text-xs text-white-70">Average Community Rating</div>
          </div>
        </div>

        <div className="bg-obsidian-wave p-5 rounded-[20px] border border-white-30/10 flex items-center gap-4">
          <div className="p-3 bg-royal-nebula/20 rounded-xl text-purple-400">
            <MessageSquare className="w-6 h-6"/>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalReviews}</div>
            <div className="text-xs text-white-70">Total User Reviews</div>
          </div>
        </div>

        <div className="bg-obsidian-wave p-5 rounded-[20px] border border-white-30/10 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Award className="w-6 h-6"/>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{transformationsCount}</div>
            <div className="text-xs text-white-70">Progress Photo Galleries</div>
          </div>
        </div>
      </div>

      {/* Write a review glassmorphic panel */}
      {showForm && (<form onSubmit={handleSubmit} className="bg-obsidian-wave border border-white-30/20 p-6 rounded-[24px] space-y-6 shadow-xl animate-[fadeIn_0.3s_ease-out]">
          <div className="flex justify-between items-center border-b border-white-30/15 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Share Your Journey
            </h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-white-30 hover:text-white">
              <X className="w-5 h-5"/>
            </button>
          </div>

          {submitError && (<div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 animate-[fadeIn_0.2s_ease-out]">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-red-300 leading-snug">{submitError}</p>
            </div>)}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white-70 uppercase tracking-widest">
                  Your Name
                </label>
                <p className="bg-noir-eclipse text-white w-full border border-white-30/40 rounded-2xl px-4 py-3.5 text-sm font-medium">{user?.name}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white-70 uppercase tracking-widest block">
                  Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (<button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(null)} className="p-1 transition-transform active:scale-95">
                      <Star className={`w-8 h-8 transition-colors ${star <= (hoverRating ?? rating)
                    ? 'text-lime-light fill-current shadow-[0_0_10px_rgba(0, 196, 180,0.15)]'
                    : 'text-white-30'}`}/>
                    </button>))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white-70 uppercase tracking-widest">
                  Workout Regiment (Optional)
                </label>
                <select value={workoutRegiment} onChange={(e) => setWorkoutRegiment(e.target.value)} className="bg-noir-eclipse text-white w-full border border-white-30/40 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-lime-light text-sm font-medium">
                  <option value="">Choose a workout program...</option>
                  {workoutOptions.map((opt) => (<option key={opt} value={opt}>
                      {opt}
                    </option>))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white-70 uppercase tracking-widest">
                  Your Experience
                </label>
                <textarea placeholder="How did FitGuide help you? Share your experience with the routines, diet programs, and trainers..." value={comment} onChange={(e) => setComment(e.target.value)} rows={4} className="bg-noir-eclipse text-white w-full border border-white-30/40 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-lime-light text-sm font-medium resize-none" required/>
              </div>
            </div>

            {/* Right side progress images upload */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-white-70 uppercase tracking-widest block">
                Attach Progress Photos (Before / After)
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Before Image */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-white-30 uppercase tracking-widest text-center">
                    Before
                  </div>
                  <input ref={beforeInputRef} type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'before')} className="hidden"/>
                  {beforePreview ? (<div className="relative h-44 rounded-2xl overflow-hidden border border-white-30 group">
                      <img src={beforePreview} alt="Before Preview" className="w-full h-full object-cover"/>
                      <button type="button" onClick={() => removeImage('before')} className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors">
                        <X className="w-4 h-4"/>
                      </button>
                    </div>) : (<button type="button" onClick={() => beforeInputRef.current?.click()} className="w-full h-44 border-2 border-dashed border-white-30 hover:border-lime-light rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white-30/5 transition-all text-white-30 hover:text-white">
                      <Upload className="w-6 h-6"/>
                      <span className="text-xs font-bold uppercase tracking-wider">Upload Photo</span>
                    </button>)}
                </div>

                {/* After Image */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-white-30 uppercase tracking-widest text-center">
                    After
                  </div>
                  <input ref={afterInputRef} type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'after')} className="hidden"/>
                  {afterPreview ? (<div className="relative h-44 rounded-2xl overflow-hidden border border-white-30 group">
                      <img src={afterPreview} alt="After Preview" className="w-full h-full object-cover"/>
                      <button type="button" onClick={() => removeImage('after')} className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors">
                        <X className="w-4 h-4"/>
                      </button>
                    </div>) : (<button type="button" onClick={() => afterInputRef.current?.click()} className="w-full h-44 border-2 border-dashed border-white-30 hover:border-lime-light rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white-30/5 transition-all text-white-30 hover:text-white">
                      <Upload className="w-6 h-6"/>
                      <span className="text-xs font-bold uppercase tracking-wider">Upload Photo</span>
                    </button>)}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white-30/15 flex justify-end">
            <button type="submit" disabled={isSubmitting} className="bg-lime-light text-noir-eclipse font-bold px-8 py-3.5 rounded-full hover:shadow-[0_0_15px_rgba(0, 196, 180,0.3)] transition-all uppercase tracking-wider text-xs disabled:opacity-60 flex items-center gap-2">
              {isSubmitting ? (<>
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  SUBMITTING...
                </>) : ('SUBMIT TESTIMONIAL')}
            </button>
          </div>
        </form>)}

      {/* Feed Area */}
      {error && (<div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"/>
          <p className="text-sm text-red-300 leading-snug">{error}</p>
        </div>)}

      {isLoading ? (<div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 text-lime-light animate-spin"/>
          <span className="text-sm text-white-70 uppercase tracking-widest">Loading Testimonials...</span>
        </div>) : reviews.length === 0 ? (<div className="text-center py-20 bg-obsidian-wave rounded-[24px] border border-white-30/5">
          <p className="text-white-30 text-sm">No testimonials yet. Be the first to share your journey!</p>
        </div>) : (<div className="space-y-6">
          {reviews.map((item) => (<div key={item.id} className="bg-obsidian-wave p-6 rounded-[24px] border border-white-30/10 hover:border-white-30/30 transition-all flex flex-col gap-5 text-left">
              {/* Review Card Header */}
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  {/* Glowing user avatar */}
                  <div className="w-12 h-12 rounded-full border border-white-30 bg-noir-eclipse flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.userAvatar ? (<img src={assetUrl(item.userAvatar)} alt={item.name} className="w-full h-full object-cover"/>) : (<span className="font-extrabold text-sm text-lime-light">
                        {item.name.charAt(0).toUpperCase()}
                      </span>)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base leading-tight">
                      {item.name}
                    </h4>
                    <span className="text-[11px] text-white-30">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                })}
                    </span>
                  </div>
                </div>

                {/* Rating display */}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (<Star key={idx} className={`w-4 h-4 ${idx < item.rating
                        ? 'text-lime-light fill-current'
                        : 'text-white-30'}`}/>))}
                </div>
              </div>

              {/* Workout Regiment Tag */}
              {item.workoutRegiment && (<div className="inline-flex self-start px-3 py-1 bg-royal-nebula/15 border border-royal-nebula/30 text-purple-300 rounded-full text-xs font-bold">
                  {item.workoutRegiment}
                </div>)}

              {/* Review Comment Text */}
              <p className="text-white-70 text-sm leading-relaxed whitespace-pre-line">
                {item.comment}
              </p>

              {/* Progression Images Layout */}
              {(item.beforeImage || item.afterImage) && (<div className="grid grid-cols-2 gap-4 max-w-md w-full mt-2">
                  {/* Before Panel */}
                  {item.beforeImage && (<div className="relative rounded-[16px] overflow-hidden border border-white-30/10 aspect-video md:aspect-[4/3] group shadow-md bg-noir-eclipse">
                      <img src={assetUrl(item.beforeImage)} alt="Before progress" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                      <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/60 text-white-70 text-[10px] font-bold rounded uppercase tracking-wider">
                        Before
                      </div>
                    </div>)}

                  {/* After Panel */}
                  {item.afterImage && (<div className="relative rounded-[16px] overflow-hidden border border-lime-light/30 aspect-video md:aspect-[4/3] group shadow-[0_4px_15px_rgba(0, 196, 180,0.1)] bg-noir-eclipse">
                      <img src={assetUrl(item.afterImage)} alt="After progress" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                      <div className="absolute top-3 left-3 px-2.5 py-0.5 bg-lime-light text-noir-eclipse text-[10px] font-black rounded uppercase tracking-wider">
                        After
                      </div>
                    </div>)}
                </div>)}

              {/* Like / Interactions Row */}
              <div className="flex items-center gap-4 pt-3 border-t border-white-30/10 mt-2">
                <button onClick={() => handleLike(item.id)} disabled={!hasAccount} title={hasAccount ? 'Like' : 'Sign in to like reviews'} className="flex items-center gap-2 text-white-30 hover:text-lime-light transition-colors text-xs font-bold group">
                  <ThumbsUp className="w-4.5 h-4.5 group-hover:scale-110 transition-transform"/>
                  <span>{item.likes} Likes</span>
                </button>
              </div>
            </div>))}
        </div>)}
    </div>);
};
