'use client';

import { useState, useEffect } from 'react';
import { Dumbbell } from 'lucide-react';

export function LoadingScreen({ message = 'Loading workouts...' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything on server to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-noir-eclipse flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-lime-light/30 border-t-lime-light rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white text-lg font-semibold mb-2">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noir-eclipse flex items-center justify-center">
      <div className="text-center">
        {/* Animated Dumbbell Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <Dumbbell className="w-16 h-16 text-lime-light animate-bounce" />
            <div className="absolute inset-0 w-16 h-16 bg-lime-light/20 rounded-full blur-xl animate-pulse"></div>
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="w-16 h-16 border-4 border-lime-light/30 border-t-lime-light rounded-full animate-spin mx-auto mb-6"></div>

        {/* Message */}
        <p className="text-white text-lg font-semibold mb-2">{message}</p>
        <p className="text-white-70 text-sm">Please wait...</p>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mt-6">
          <div className="w-2 h-2 bg-lime-light rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-lime-light rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-lime-light rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}
export function LoadingCardSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-40 bg-obsidian-wave rounded-[24px] animate-pulse border border-white-30/10"
        >
          <div className="h-full p-4 flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-16 h-5 bg-white-30/20 rounded-full"></div>
              <div className="w-5 h-5 bg-white-30/20 rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-white-30/20 rounded-full"></div>
              <div className="w-3/4 h-5 bg-white-30/20 rounded"></div>
              <div className="w-1/2 h-4 bg-white-30/20 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorDisplay({ message, onRetry }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center max-w-md p-8">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">⚠️</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Oops! Something went wrong</h3>
        <p className="text-white-70 mb-6">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-lime-light text-noir-eclipse font-bold rounded-xl hover:bg-lime-light/90 transition-all cursor-pointer"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
