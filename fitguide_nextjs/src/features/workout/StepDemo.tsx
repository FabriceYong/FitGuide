'use client';

import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { useExerciseDemo } from './hooks/useExerciseDemo';
import { DrawnDemo } from './DrawnDemo';
import { drawnDemo } from './drawnDemos';

interface Step { instruction?: string; exerciseName?: string; gifUrl?: string; imageUrl?: string }
interface DemoMedia { frames: string[]; author?: string; license?: string; source?: string; sourceUrl?: string }

// "© Everkinetic · CC BY-SA 3.0 · wger"
const mediaCredit = (media: DemoMedia) => [media.author && `© ${media.author}`, media.license, media.source].filter(Boolean).join(' · ');

/** A movement's picture: flips between its frames (start and end position) unless the visitor prefers reduced motion. */
function DemoPictures({ frames, alt }: { frames: string[]; alt: string }) {
  const [second, setSecond] = useState(false);
  useEffect(() => {
    if (frames.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setInterval(() => setSecond((s) => !s), 1300);
    return () => clearInterval(timer);
  }, [frames]);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frames[0]} alt={alt} className="absolute inset-0 w-full h-full object-contain" />
      {frames[1] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={frames[1]} alt="" aria-hidden="true" className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${second ? 'opacity-100' : 'opacity-0'}`} />
      )}
    </>
  );
}

/**
 * How to do a step: its own picture, else a freely licensed photo of the
 * movement, else the drawn figure for it, so every movement FitGuide
 * recognises has a demonstration. `size="thumb"` is the small version for
 * step lists (drawn figure only, no labels).
 */
export function StepDemo({ step, color, size = 'large', animate = true }: { step: Step | undefined; color: string; size?: 'large' | 'thumb'; animate?: boolean }) {
  const found = useExerciseDemo(step);
  const demo = found.demo as { name: string; media?: DemoMedia | null } | null;
  const { loading } = found;
  const own = step?.gifUrl || step?.imageUrl || null;
  const media: DemoMedia | null = !own && demo?.media?.frames?.length ? demo.media : null;
  const drawn = drawnDemo(demo?.name);

  if (size === 'thumb') {
    return (
      <span className="block w-full h-full rounded-xl overflow-hidden border border-white/10" style={{ backgroundColor: `${color}12` }}>
        {drawn ? <DrawnDemo demo={drawn} color={color} animate={animate} /> : (
          <span className="w-full h-full flex items-center justify-center" aria-hidden="true"><Target className="w-5 h-5" style={{ color: `${color}99` }} /></span>
        )}
      </span>
    );
  }

  return (
    <div className="relative w-full h-full">
      {own ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={own} alt={step?.instruction || ''} className="absolute inset-0 w-full h-full object-cover" />
      ) : media ? (
        // Light backing: some drawings are dark lines on a transparent background.
        <div className="absolute inset-x-3 top-12 bottom-3 rounded-xl overflow-hidden bg-white">
          <DemoPictures key={demo?.name} frames={media.frames} alt={`Demonstration: ${demo?.name}`} />
        </div>
      ) : drawn ? (
        <div className="absolute inset-x-3 top-10 bottom-3"><DrawnDemo demo={drawn} color={color} animate={animate} /></div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          {loading ? (
            <Target className="w-8 h-8 animate-spin" style={{ color }} aria-label="Loading the demonstration" />
          ) : (
            <div>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border" style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}>
                <Target className="w-8 h-8" style={{ color }} aria-hidden="true" />
              </div>
              <p className="font-bold text-sm">Follow the instructions</p>
              <p className="text-xs text-white/60">Move with control and keep good form</p>
            </div>
          )}
        </div>
      )}

      {demo && !own && (
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold truncate border" style={{ color, backgroundColor: `${color}20`, borderColor: `${color}40` }}>{demo.name}</span>
          {media && (
            // Credit the picture's author and licence (CC BY-SA needs it).
            <a href={media.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/60 hover:text-white truncate">{mediaCredit(media)}</a>
          )}
        </div>
      )}
    </div>
  );
}
