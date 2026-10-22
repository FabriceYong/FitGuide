import Link from 'next/link';
import { Clock, Heart, Play } from 'lucide-react';
import { categoryColor } from '../../workout/categoryColor';
import { getWorkoutSpecificImage } from '../../../utils/unsplashImages';
import type { Workout } from '../../../types/catalog';

/**
 * A workout tile linking to its page. With onToggleFavorite it also shows a
 * heart button (kept outside the link so both are separate tab stops).
 */
export function WorkoutCard({
  workout,
  favorite,
  onToggleFavorite,
  tall = false,
}: {
  workout: Workout;
  favorite?: boolean;
  onToggleFavorite?: (slug: string) => void;
  tall?: boolean;
}) {
  const color = categoryColor(workout.category);
  const image = getWorkoutSpecificImage(workout.title, workout.category, 'small', workout.thumbnailUrl);
  return (
    <div className={`relative ${tall ? 'h-72' : 'h-44'} rounded-[24px] overflow-hidden border-2 group`} style={{ borderColor: `${color}40` }}>
      <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-t from-noir-eclipse via-noir-eclipse/60 to-noir-eclipse/10" aria-hidden="true" />
      <Link href={`/workouts/${workout.slug}`} className="absolute inset-0 p-4 flex flex-col justify-between">
        <span className="flex items-center gap-1.5">
          <span className="px-2 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider" style={{ backgroundColor: `${color}CC` }}>{workout.category}</span>
          {workout.isPremium && <span className="px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-noir-eclipse">PLUS</span>}
        </span>
        <span className="block">
          <span className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${color}CC` }} aria-hidden="true">
            <Play className="w-4 h-4 fill-current text-white" />
          </span>
          <span className="block font-extrabold text-white text-base leading-tight line-clamp-2">{workout.title}</span>
          <span className="flex items-center gap-1 text-xs text-white mt-1">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" /> {workout.duration} min · {workout.difficulty}
            {workout.calories ? ` · ~${workout.calories} kcal` : ''}
          </span>
        </span>
      </Link>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(workout.slug)}
          aria-pressed={Boolean(favorite)}
          aria-label={favorite ? `Remove ${workout.title} from favorites` : `Add ${workout.title} to favorites`}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-noir-eclipse/70 backdrop-blur-sm flex items-center justify-center text-white hover:scale-105 transition-transform"
        >
          <Heart className={`w-4 h-4 ${favorite ? 'fill-red-500 text-red-500' : ''}`} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
