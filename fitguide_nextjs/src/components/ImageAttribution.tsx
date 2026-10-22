import { ExternalLink } from 'lucide-react';

/** Credit for the Unsplash photos used on workout cards and the home page. */
export function ImageAttribution() {
  return (
    <footer className="bg-obsidian-wave border-t border-white-30/10 py-4 px-6 text-xs text-white-70">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <span>
          Photos from{' '}
          <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-lime-light hover:underline">
            Unsplash <ExternalLink className="w-3 h-3" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </span>
        <span>FitGuide is not a substitute for medical advice.</span>
      </div>
    </footer>
  );
}
