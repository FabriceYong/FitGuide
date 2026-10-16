'use client';

/**
 * Hero Section Component
 * Large banner section similar to ACE Fitness hero
 */
import React from 'react';
import { ArrowRight } from 'lucide-react';
export const HeroSection = ({ title, subtitle, userName, backgroundImage, ctaPrimary, ctaSecondary, overlayOpacity = 0.7, }) => {
    return (<section className="relative w-full h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden mb-12">
      {/* Background Image */}
      <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105" style={{
            backgroundImage: backgroundImage
                ? `url(${backgroundImage})`
                : 'linear-gradient(135deg, #3E25F5 0%, #00C4B4 100%)',
        }}/>

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-noir-eclipse via-noir-eclipse/80 to-transparent" style={{ opacity: overlayOpacity }}/>

      {/* Content */}
      <div className="relative z-10 max-w-4xl px-8 md:px-12 text-left">
        {/* Greeting */}
        {userName && (<p className="text-lime-light font-semibold text-sm md:text-base uppercase tracking-widest mb-4 animate-fade-in">
            Hello, {userName}
          </p>)}

        {/* Title */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 animate-fade-in-up drop-shadow-2xl">
          {title}
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white-70 font-medium mb-10 max-w-2xl animate-fade-in-up animation-delay-200 leading-relaxed">
          {subtitle}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 animate-fade-in-up animation-delay-400">
          {ctaPrimary && (<button onClick={ctaPrimary.onClick} className="flex items-center gap-2 px-8 py-4 bg-lime-light text-noir-eclipse font-extrabold text-sm uppercase tracking-wider rounded-xl hover:bg-lime-light/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
              <span>{ctaPrimary.text}</span>
              {ctaPrimary.icon || <ArrowRight className="w-5 h-5"/>}
            </button>)}

          {ctaSecondary && (<button onClick={ctaSecondary.onClick} className="flex items-center gap-2 px-8 py-4 border-2 border-white-30 text-white font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-white-30/10 hover:border-lime-light hover:text-lime-light transition-all">
              <span>{ctaSecondary.text}</span>
              {ctaSecondary.icon}
            </button>)}
        </div>
      </div>

      {/* Decorative Elements - ENHANCED GRADIENT BLEND */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-noir-eclipse via-noir-eclipse/70 to-transparent pointer-events-none"/>
    </section>);
};
export const MiniHero = ({ title, subtitle, backgroundImage, }) => {
    return (<section className="relative w-full h-[250px] flex items-center justify-center overflow-hidden rounded-2xl mb-8">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center" style={{
            backgroundImage: backgroundImage
                ? `url(${backgroundImage})`
                : 'linear-gradient(135deg, #16161f 0%, #0a0a0f 100%)',
        }}/>

      {/* Overlay */}
      <div className="absolute inset-0 bg-noir-eclipse/60"/>

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3">
          {title}
        </h1>
        {subtitle && (<p className="text-base md:text-lg text-white-70 font-medium">
            {subtitle}
          </p>)}
      </div>
    </section>);
};
