import { Dumbbell } from 'lucide-react';

/** Full-screen placeholder while the session or data loads. */
export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-noir-eclipse flex items-center justify-center" role="status">
      <div className="text-center">
        <Dumbbell className="w-14 h-14 text-lime-light mx-auto mb-6 animate-pulse" aria-hidden="true" />
        <div className="w-12 h-12 border-4 border-lime-light/30 border-t-lime-light rounded-full animate-spin mx-auto mb-6" aria-hidden="true" />
        <p className="text-white text-lg font-semibold">{message}</p>
      </div>
    </div>
  );
}
