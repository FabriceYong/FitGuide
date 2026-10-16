'use client';

/**
 * Hero Carousel Component
 * Auto-rotating hero section with multiple slides
 */
import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { getHeroSlides, preloadSlideImages } from '../services/heroCarouselService';
export const HeroCarousel = ({ userName, onAction, onColorChange, autoPlayInterval = 6000, // 6 seconds
currentColor = '#00C4B4', }) => {
    const [slides, setSlides] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    // Load slides
    useEffect(() => {
        const loadSlides = async () => {
            try {
                const heroSlides = await getHeroSlides();
                setSlides(heroSlides);
                preloadSlideImages(heroSlides);
                // Emit initial color
                if (onColorChange && heroSlides.length > 0) {
                    onColorChange(heroSlides[0].dominantColor);
                }
            }
            catch (error) {
                console.error('Error loading hero slides:', error);
            }
            finally {
                setIsLoading(false);
            }
        };
        loadSlides();
    }, []);
    // Auto-play carousel
    useEffect(() => {
        if (slides.length <= 1)
            return;
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => {
                const nextIndex = (prevIndex + 1) % slides.length;
                return nextIndex;
            });
        }, autoPlayInterval);
        return () => clearInterval(interval);
    }, [slides.length, autoPlayInterval]);
    // Handle color change
    useEffect(() => {
        if (slides.length > 0 && onColorChange) {
            onColorChange(slides[currentIndex].dominantColor);
        }
    }, [currentIndex, slides, onColorChange]);
    if (isLoading || slides.length === 0) {
        return (<section className="relative w-full h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden mb-12 bg-gradient-to-br from-royal-nebula to-noir-eclipse">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-lime-light border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-medium">Loading experience...</p>
        </div>
      </section>);
    }
    const currentSlide = slides[currentIndex];
    return (<section className="relative w-full h-[500px] md:h-[600px] flex items-start justify-start overflow-hidden mb-12">
      {/* Background Images with Crossfade */}
      {slides.map((slide, index) => (<div key={slide.id} className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`} style={{
                backgroundImage: `url(${slide.imageUrl})`,
            }}/>))}

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-noir-eclipse via-noir-eclipse/80 to-transparent opacity-80"/>

      {/* Content - LEFT ALIGNED */}
      <div className="relative z-10 max-w-4xl px-8 md:px-12 py-20 md:py-32 text-left w-full">
        {/* Greeting */}
        {userName && (<p className="text-lime-light font-semibold text-sm md:text-base uppercase tracking-widest mb-4 animate-fade-in" key={`greeting-${currentIndex}`}>
            Hello, {userName}
          </p>)}

        {/* Title */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 animate-fade-in-up drop-shadow-2xl" key={`title-${currentIndex}`}>
          {currentSlide.title}
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white-70 font-medium mb-10 max-w-2xl animate-fade-in-up animation-delay-200 leading-relaxed" key={`subtitle-${currentIndex}`}>
          {currentSlide.subtitle}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 animate-fade-in-up animation-delay-400" key={`cta-${currentIndex}`}>
          <button onClick={() => onAction(currentSlide.ctaPrimary.action)} className="flex items-center gap-2 px-8 py-4 text-noir-eclipse font-extrabold text-sm uppercase tracking-wider rounded-xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer" style={{
            background: currentColor,
        }}>
            <span>{currentSlide.ctaPrimary.text}</span>
            <ArrowRight className="w-5 h-5"/>
          </button>

          {currentSlide.ctaSecondary && (<button onClick={() => onAction(currentSlide.ctaSecondary.action)} className="flex items-center gap-2 px-8 py-4 border-2 text-white font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-white-30/10 transition-all" style={{
                borderColor: `${currentColor}60`,
            }} onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = currentColor;
                e.currentTarget.style.color = currentColor;
            }} onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${currentColor}60`;
                e.currentTarget.style.color = 'white';
            }}>
              <span>{currentSlide.ctaSecondary.text}</span>
            </button>)}
        </div>
      </div>

      {/* Decorative Elements - ENHANCED GRADIENT BLEND */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-noir-eclipse via-noir-eclipse/70 to-transparent pointer-events-none z-10"/>
    </section>);
};
