'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { fetchRecap, type Recap } from '../../services/recapService';
import { drawWorkoutCard } from '../../lib/shareCard';
import { ShareButton } from '../../components/ShareButton';
import { formatRecord } from './format';
import { useUnits, weightIn, weightUnit, type Units } from '../../lib/units';

const SMALL_CAR_KG = 1200;

interface Slide {
  kicker: string;
  big: string;
  line: string;
  extra?: ReactNode;
}

/** The recap's slides; ones with nothing to show are left out. */
function slides(r: Recap, units: Units): Slide[] {
  const period = r.kind === 'month' ? r.label.split(' ')[0] : r.label;
  const change = r.workouts - r.previousWorkouts;
  const list: Slide[] = [{
    kicker: `Your ${period}`,
    big: String(r.workouts),
    line: `${r.workouts === 1 ? 'workout' : 'workouts'} finished${r.previousWorkouts ? `, ${change > 0 ? `${change} more than` : change < 0 ? `${-change} fewer than` : 'the same as'} the ${r.kind === 'month' ? 'month' : 'year'} before` : ''}.`,
  }];
  if (r.minutes) {
    const hours = r.minutes / 60;
    list.push({ kicker: 'Time well spent', big: hours >= 2 ? `${Math.round(hours)} h` : `${r.minutes} min`, line: `across ${r.activeDays} active ${r.activeDays === 1 ? 'day' : 'days'}.` });
  }
  if (r.volumeKg > 0) {
    const cars = r.volumeKg / SMALL_CAR_KG;
    list.push({
      kicker: 'Weight lifted',
      big: `${Math.round(weightIn(r.volumeKg, units)).toLocaleString()} ${weightUnit(units)}`,
      line: cars >= 1 ? `About the weight of ${cars >= 2 ? `${Math.floor(cars)} small cars` : 'a small car'}.` : 'Every rep counts.',
    });
  }
  if (r.topRecord) {
    list.push({ kicker: 'Best record', big: formatRecord(r.topRecord, units), line: `${r.topRecord.exerciseName}${r.records > 1 ? `, one of ${r.records} new personal records` : ''}.` });
  }
  if (r.topMuscle || r.favouriteWorkout) {
    list.push({
      kicker: 'Your go-to',
      big: r.topMuscle?.region ?? r.favouriteWorkout!.title,
      line: [
        r.topMuscle && `Trained in ${r.topMuscle.workouts} ${r.topMuscle.workouts === 1 ? 'workout' : 'workouts'}.`,
        r.favouriteWorkout && r.favouriteWorkout.times > 1 && `Favourite workout: ${r.favouriteWorkout.title} (${r.favouriteWorkout.times}×).`,
      ].filter(Boolean).join(' '),
    });
  }
  if (r.foodDays) list.push({ kicker: 'Fuel', big: String(r.foodDays), line: `${r.foodDays === 1 ? 'day' : 'days'} with meals logged.` });
  list.push({ kicker: r.label, big: 'Nice work', line: `Here’s to the next ${r.kind === 'month' ? 'month' : 'year'}.` });
  return list;
}

/**
 * The recap as swipeable slides: a month's (or a year's) training in a few
 * numbers, ending with a picture card to share (the app's recap_story.dart).
 */
export function RecapStory({ which, onClose }: { which: { month?: string; year?: number }; onClose: () => void }) {
  const units = useUnits();
  const [recap, setRecap] = useState<Recap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetchRecap(which).then(setRecap).catch((err: Error) => setError(err.message));
  }, [which]);

  const list = recap ? slides(recap, units) : [];
  const last = list.length - 1;
  const go = (delta: number) => setIndex((i) => Math.max(0, Math.min(last, i + delta)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(last, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last, onClose]);

  const slide = list[index];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={recap ? `${recap.label} recap` : 'Recap'}>
      <div className="relative w-full max-w-sm aspect-[9/16] max-h-[90vh] rounded-3xl overflow-hidden bg-gradient-to-b from-[#16202B] to-[#0A0C10] border border-white/10 flex flex-col">
        <div className="flex gap-1 p-3" aria-hidden="true">
          {list.map((s, i) => <span key={s.kicker + i} className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-lime-light' : 'bg-white/20'}`} />)}
        </div>
        <button type="button" onClick={onClose} aria-label="Close the recap" className="absolute top-5 right-3 p-2 text-white/70 hover:text-white"><X className="w-5 h-5" aria-hidden="true" /></button>

        {!recap && !error && <p className="m-auto flex items-center gap-2 text-white/70"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Putting it together…</p>}
        {error && <p role="alert" className="m-auto px-6 text-center text-red-300">{error}</p>}
        {slide && (
          <div className="flex-1 flex flex-col justify-center px-7 gap-3" aria-live="polite">
            <p className="text-xs font-extrabold uppercase tracking-widest text-lime-light">{slide.kicker}</p>
            <p className="text-5xl font-black leading-tight break-words">{slide.big}</p>
            <p className="text-lg text-white/80">{slide.line}</p>
            {index === last && recap && (
              <div className="pt-4">
                <ShareButton
                  kind="recap"
                  label="Share my recap"
                  filename={`fitguide-${recap.key}.png`}
                  text={`My ${recap.label} on FitGuide`}
                  make={() => drawWorkoutCard({
                    label: recap.kind === 'month' ? 'MY MONTH' : 'MY YEAR',
                    title: recap.label,
                    date: `${recap.workouts} workouts · ${recap.activeDays} active days`,
                    stats: [
                      { label: 'Workouts', value: String(recap.workouts) },
                      { label: 'Minutes', value: recap.minutes.toLocaleString() },
                      ...(recap.volumeKg ? [{ label: 'Lifted', value: `${Math.round(weightIn(recap.volumeKg, units)).toLocaleString()} ${weightUnit(units)}` }] : []),
                      { label: 'Active days', value: String(recap.activeDays) },
                    ],
                    records: recap.topRecord ? [`${recap.topRecord.exerciseName} · ${formatRecord(recap.topRecord, units)}`] : [],
                  })}
                />
              </div>
            )}
          </div>
        )}

        {list.length > 0 && (
          <div className="flex items-center justify-between p-4">
            <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous" className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-30"><ChevronLeft className="w-5 h-5" aria-hidden="true" /></button>
            <span className="text-xs text-white/60">{index + 1} / {list.length}</span>
            <button type="button" onClick={() => (index === last ? onClose() : go(1))} aria-label={index === last ? 'Done' : 'Next'} className="w-11 h-11 rounded-full bg-lime-light text-noir-eclipse flex items-center justify-center"><ChevronRight className="w-5 h-5" aria-hidden="true" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
