/**
 * Image Attribution Component
 * Displays attribution for Unsplash images as required by their license
 */
import React from 'react';
import { ExternalLink } from 'lucide-react';
export const ImageAttribution = ({ className = '', compact = false }) => {
    if (compact) {
        return (<div className={`text-xs text-white-50 ${className}`}>
        <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors inline-flex items-center gap-1">
          Photos by Unsplash
          <ExternalLink className="w-3 h-3"/>
        </a>
      </div>);
    }
    return (<div className={`bg-obsidian-wave border-t border-white-30/10 py-4 px-6 ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-white-50">
        <div className="flex items-center gap-4">
          <span>Workout images from</span>
          <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-lime-light hover:underline">
            <svg className="w-4 h-4" viewBox="0 0 32 32" fill="currentColor">
              <path d="M10 9V0h12v9H10zm12 5h10v18H0V14h10v9h12v-9z"/>
            </svg>
            Unsplash
            <ExternalLink className="w-3 h-3"/>
          </a>
        </div>
        <div className="hidden md:block">
          <span>Free, high-quality workout images</span>
        </div>
      </div>
    </div>);
};
export const FloatingAttribution = ({ photographerName, photographerUrl, className = '', }) => {
    if (!photographerName)
        return null;
    return (<div className={`absolute bottom-2 right-2 z-20 ${className}`}>
      <a href={photographerUrl || 'https://unsplash.com'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs text-white hover:bg-black/80 transition-colors">
        <svg className="w-3 h-3" viewBox="0 0 32 32" fill="currentColor">
          <path d="M10 9V0h12v9H10zm12 5h10v18H0V14h10v9h12v-9z"/>
        </svg>
        <span>{photographerName}</span>
      </a>
    </div>);
};
