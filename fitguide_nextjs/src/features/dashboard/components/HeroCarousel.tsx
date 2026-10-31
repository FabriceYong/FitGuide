'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export type HeroCta = { label: string; href: string } | { label: string; onClick: () => void };

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  /** Unsplash photo id. */
  photo: string;
  primary: HeroCta;
  secondary?: HeroCta;
}

const INTERVAL_MS = 7000;

function Cta({ cta, primary }: { cta: HeroCta; primary?: boolean }) {
  const className = primary
    ? 'flex items-center gap-2 px-7 py-3.5 bg-lime-light text-noir-eclipse font-extrabold text-sm uppercase tracking-wider rounded-xl hover:opacity-90'
    : 'flex items-center gap-2 px-7 py-3.5 border-2 border-white/30 hover:border-lime-light text-white font-bold text-sm uppercase tracking-wider rounded-xl';
  const content = <>{cta.label}{primary && <ArrowRight className="w-5 h-5" aria-hidden="true" />}</>;
  return 'href' in cta
    ? <Link href={cta.href} className={className}>{content}</Link>
    : <button type="button" onClick={cta.onClick} className={className}>{content}</button>;
}

/**
 * Rotating highlights at the top of the home tab. Pauses while hovered or
 * focused, and doesn't rotate for people who prefer reduced motion.
 */
export function HeroCarousel({ slides, greeting }: { slides: HeroSlide[]; greeting?: string }) {
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      if (paused.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[index % slides.length];
  if (!slide) return null;
  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      className="relative w-full min-h-[440px] md:min-h-[520px] flex items-center overflow-hidden"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
      onFocus={() => { paused.current = true; }}
      onBlur={() => { paused.current = false; }}
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          aria-hidden="true"
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-${s.photo}?w=1600&q=75&fit=crop)` }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-noir-eclipse via-noir-eclipse/85 to-noir-eclipse/30" aria-hidden="true" />
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-noir-eclipse to-transparent" aria-hidden="true" />

      <div className="relative z-10 max-w-4xl px-6 md:px-12 py-16 text-left w-full" aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}`}>
        {greeting && <p className="text-lime-light font-semibold text-sm uppercase tracking-widest mb-4">{greeting}</p>}
        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-5">{slide.title}</h1>
        <p className="text-lg md:text-xl text-white-70 font-medium mb-8 max-w-2xl leading-relaxed">{slide.subtitle}</p>
        <div className="flex flex-wrap gap-3">
          <Cta cta={slide.primary} primary />
          {slide.secondary && <Cta cta={slide.secondary} />}
        </div>
        {slides.length > 1 && (
          <div className="flex -mx-1 mt-10">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show highlight ${i + 1}: ${s.title}`}
                aria-current={i === index ? 'true' : undefined}
                className="py-3 px-1"
              >
                <span className={`block h-1.5 rounded-full transition-all ${i === index ? 'w-8 bg-lime-light' : 'w-4 bg-white/40 hover:bg-white/60'}`} />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
