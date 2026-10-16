'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Calendar,
  User,
  Share2,
  Bookmark,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ChevronRight,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';

const CATEGORY_COLORS = {
  TRAINING: '#00C4B4',
  NUTRITION: '#34D399',
  RECOVERY: '#60A5FA',
  WELLNESS: '#C084FC',
  HEALTH: '#FB923C',
};

export const ArticleDetailPage = ({ article, onBack, onSelectRelated }) => {
  const [bookmarked, setBookmarked] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(142);
  const [copied, setCopied] = useState(false);

  if (!article) return null;

  const catColor = CATEGORY_COLORS[article.category] || '#00C4B4';

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => (liked ? prev - 1 : prev + 1));
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '1 Aug 2026';
    }
  };

  return (
    <div className="min-h-screen bg-noir-eclipse text-white pb-16 animate-fadeIn">
      {/* Top Header & Navigation Bar */}
      <div className="sticky top-0 z-30 bg-noir-eclipse/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors cursor-pointer bg-obsidian-wave border border-white/10 px-3 py-1.5 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Insights
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              bookmarked
                ? 'bg-lime-light/10 border-lime-light/40 text-lime-light'
                : 'bg-obsidian-wave border-white/10 text-white/60 hover:text-white'
            }`}
            title="Bookmark Article"
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-lime-light' : ''}`} />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-obsidian-wave border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer relative"
            title="Share Article"
          >
            <Share2 className="w-4 h-4" />
            {copied && (
              <span className="absolute -bottom-8 right-0 bg-lime-light text-noir-eclipse text-[10px] font-bold px-2 py-0.5 rounded shadow">
                Link copied!
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Article Container */}
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-8">
        {/* Article Meta Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
              style={{
                background: `${catColor}25`,
                color: catColor,
                border: `1px solid ${catColor}40`,
              }}
            >
              {article.category || 'FITNESS'}
            </span>
            <span className="flex items-center gap-1 text-xs text-white/50">
              <Clock className="w-3.5 h-3.5" />
              {article.readTime || '5 min read'}
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight tracking-tight">
            {article.title}
          </h1>

          <p className="text-base md:text-lg text-white/70 leading-relaxed font-normal">
            {article.description || article.summary}
          </p>

          <div className="flex items-center justify-between border-t border-b border-white/10 py-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: `${catColor}30`, color: catColor }}
              >
                {article.author ? article.author[0] : 'F'}
              </div>
              <div>
                <p className="text-xs font-extrabold text-white">{article.author || 'FitGuide Editorial Team'}</p>
                <p className="text-[10px] text-white/40">Verified Health & Fitness Expert</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-white/40">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(article.pubDate)}
            </div>
          </div>
        </div>

        {/* Featured Image */}
        {article.thumbnail && (
          <div className="relative rounded-2xl overflow-hidden border border-white/10 h-64 md:h-96 shadow-2xl">
            <img
              src={article.thumbnail}
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-noir-eclipse/60 via-transparent to-transparent" />
          </div>
        )}

        {/* Key Takeaways Box */}
        {article.takeaways && article.takeaways.length > 0 && (
          <div
            className="rounded-2xl p-5 border relative overflow-hidden space-y-3"
            style={{
              background: `linear-gradient(135deg, ${catColor}15 0%, rgba(20, 20, 22, 0.8) 100%)`,
              borderColor: `${catColor}40`,
            }}
          >
            <div className="flex items-center gap-2" style={{ color: catColor }}>
              <Sparkles className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-widest">Key Takeaways</h3>
            </div>
            <ul className="space-y-2">
              {article.takeaways.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs md:text-sm text-white/90">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: catColor }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Body Content */}
        <div className="space-y-6 text-white/80 leading-relaxed text-sm md:text-base">
          {article.contentSections ? (
            article.contentSections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                {section.heading && (
                  <h2 className="text-xl md:text-2xl font-extrabold text-white pt-3 border-t border-white/10">
                    {section.heading}
                  </h2>
                )}
                {section.paragraphs && section.paragraphs.map((p, pIdx) => (
                  <p key={pIdx} className="text-white/80 leading-relaxed">
                    {p}
                  </p>
                ))}
                {section.callout && (
                  <div className="bg-obsidian-wave border-l-4 p-4 rounded-r-xl my-4 text-xs md:text-sm text-white/90" style={{ borderColor: catColor }}>
                    <p className="font-semibold text-white mb-1">💡 Expert Tip</p>
                    {section.callout}
                  </div>
                )}
              </div>
            ))
          ) : (
            <>
              <p>
                Progressive overload is the fundamental training principle that underpins all continuous gains in muscle mass, strength, and endurance. Without gradually increasing the stress placed on your body during training, your muscles quickly adapt, leading to standard performance plateaus.
              </p>

              <h2 className="text-xl md:text-2xl font-extrabold text-white pt-3 border-t border-white/10">
                1. How Progressive Overload Works
              </h2>
              <p>
                When you lift a weight, your muscle fibers undergo micro-tears. During recovery, your body repairs these fibers, making them stronger and larger to withstand future strain. However, if the stimulus remains constant, your body has no reason to continue adapting.
              </p>

              <div className="bg-obsidian-wave border-l-4 p-4 rounded-r-xl my-4 text-xs md:text-sm text-white/90" style={{ borderColor: catColor }}>
                <p className="font-semibold text-white mb-1">💡 Key Insight</p>
                Progressive overload isn&apos;t just about adding more weight to the bar. You can also overload by increasing repetitions, improving form, decreasing rest intervals, or increasing training frequency.
              </div>

              <h2 className="text-xl md:text-2xl font-extrabold text-white pt-3 border-t border-white/10">
                2. Practical Ways to Apply It
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-white">Increase Resistance:</strong> Lift heavier weights as your strength improves.</li>
                <li><strong className="text-white">Increase Volume:</strong> Add more reps per set or more sets per exercise.</li>
                <li><strong className="text-white">Optimize Tempo:</strong> Slow down the eccentric (negative) phase of movement to increase time under tension.</li>
                <li><strong className="text-white">Improve Range of Motion:</strong> Execute full, controlled movements before increasing load.</li>
              </ul>

              <h2 className="text-xl md:text-2xl font-extrabold text-white pt-3 border-t border-white/10">
                Conclusion
              </h2>
              <p>
                Track your workouts consistently in FitGuide to ensure you are continually challenging your limits safely. Small, incremental progression each week compounds into massive long-term results.
              </p>
            </>
          )}
        </div>

        {/* Article Footer & Interactive Reactions */}
        <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                liked
                  ? 'bg-lime-light text-noir-eclipse border-lime-light'
                  : 'bg-obsidian-wave text-white/80 border-white/10 hover:text-white'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{liked ? 'Liked' : 'Helpful'} ({likeCount})</span>
            </button>
          </div>

          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-lime-light hover:underline cursor-pointer"
          >
            <span>Back to all insights</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
