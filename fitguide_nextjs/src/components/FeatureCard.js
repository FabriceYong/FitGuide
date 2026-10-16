'use client';

/**
 * Feature Card Component
 * Split-layout content cards similar to ACE Fitness sections
 */
import React from 'react';
import { ArrowRight } from 'lucide-react';
export const FeatureCard = ({ badge, badgeColor = 'lime', headline, description, image, imagePosition = 'left', ctaText, onCtaClick, ctaColor = 'red', }) => {
    const badgeColors = {
        lime: 'bg-lime-light/20 text-lime-light border-lime-light/30',
        red: 'bg-red-500/20 text-red-400 border-red-500/30',
        blue: 'bg-royal-nebula/20 text-royal-nebula border-royal-nebula/30',
    };
    const ctaColors = {
        lime: 'bg-lime-light text-noir-eclipse hover:bg-lime-light/90',
        red: 'bg-red-500 text-white hover:bg-red-600',
        blue: 'bg-royal-nebula text-white hover:bg-royal-nebula/90',
    };
    return (<div className="w-full mb-16">
      {/* Full-width container with background image covering entire area */}
      <div className="relative w-full h-[450px] lg:h-[500px] rounded-3xl overflow-hidden border border-white-30/20 hover:border-lime-light/40 transition-all group" style={{
            backgroundImage: `url(${image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }}>
        {/* Static dark overlay — no canvas needed */}
        <div className="absolute inset-0" style={{
            background: `linear-gradient(135deg,
              rgba(10, 10, 15, 0.72) 0%,
              rgba(10, 10, 15, 0.5) 50%,
              rgba(10, 10, 15, 0.82) 100%)`,
        }}/>

        {/* Content positioned on left or right */}
        <div className={`absolute inset-y-0 ${imagePosition === 'left' ? 'right-0' : 'left-0'} w-full lg:w-1/2 flex flex-col justify-center p-8 lg:p-16`}>
          {/* Badge */}
          <span className={`inline-block w-fit px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border mb-6 ${badgeColors[badgeColor]}`}>
            {badge}
          </span>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
            {headline}
          </h2>

          {/* Description */}
          <p className="text-base md:text-lg text-white-70 leading-relaxed mb-8 font-medium">
            {description}
          </p>

          {/* CTA Button */}
          <button onClick={onCtaClick} className={`flex items-center gap-2 w-fit px-6 py-3 font-bold text-sm uppercase tracking-wide rounded-xl hover:scale-105 active:scale-95 transition-all ${ctaColors[ctaColor]}`}>
            <span>{ctaText}</span>
            <ArrowRight className="w-4 h-4"/>
          </button>
        </div>
      </div>
    </div>);
};
export const SimpleFeatureCard = ({ icon, title, description, onClick, }) => {
    return (<div onClick={onClick} className={`bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 hover:border-lime-light/30 hover:bg-white-30/5 transition-all group ${onClick ? 'cursor-pointer' : ''}`}>
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-lime-light/10 flex items-center justify-center text-lime-light mb-4 group-hover:bg-lime-light/20 transition-colors">
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-lime-light transition-colors">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-white-70 leading-relaxed">{description}</p>
    </div>);
};
