import React from 'react';
import { Star } from 'lucide-react';
export const ReviewStats = ({ averageRating, reviewCount, size = 'small', showCount = true }) => {
    const starSize = {
        small: 'w-3 h-3',
        medium: 'w-4 h-4',
        large: 'w-5 h-5'
    }[size];
    const textSize = {
        small: 'text-xs',
        medium: 'text-sm',
        large: 'text-base'
    }[size];
    if (reviewCount === 0 && !showCount) {
        return null;
    }
    return (<div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (<Star key={star} className={`${starSize} ${star <= Math.round(averageRating)
                ? 'text-lime-light fill-current'
                : 'text-white-30'}`}/>))}
      </div>
      {showCount && (<span className={`${textSize} text-white-70 font-medium`}>
          {averageRating > 0 ? averageRating.toFixed(1) : '—'} ({reviewCount})
        </span>)}
    </div>);
};
