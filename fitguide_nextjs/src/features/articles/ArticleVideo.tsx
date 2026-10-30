'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize, Minimize, Minus, Pause, Play, Plus, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { videoSrc, type ArticleVideo as Video } from '../../services/articleService';

// How much of the video has to be on screen before it starts.
const VISIBLE = 0.6;

// Some recordings only reveal their length once they've played through.
const clock = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '--:--';
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const control = 'w-9 h-9 flex items-center justify-center rounded-lg text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-light';

/**
 * A video inside an article. It starts playing, muted, once the reader
 * scrolls it into view and pauses when they scroll past, unless they paused
 * it themselves or prefer reduced motion. The title sits over the picture
 * until it plays; the transcript opens underneath.
 */
export function ArticleVideo({ video }: { video: Video }) {
  const frame = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  // Set when the reader pauses; scrolling then leaves the video alone.
  const pausedByReader = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [transcript, setTranscript] = useState(false);

  useEffect(() => {
    const v = player.current;
    if (!v || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= VISIBLE) {
        if (!pausedByReader.current && !v.ended) v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    }, { threshold: [0, VISIBLE] });
    observer.observe(v);
    return () => observer.disconnect();
  }, [video.url]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = () => {
    const v = player.current;
    if (!v) return;
    if (v.paused) {
      pausedByReader.current = false;
      v.play().catch(() => {});
    } else {
      pausedByReader.current = true;
      v.pause();
    }
  };

  const back = () => {
    const v = player.current;
    if (v) v.currentTime = Math.max(0, v.currentTime - 10);
  };

  const toggleMute = () => {
    const v = player.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (frame.current?.requestFullscreen) {
      frame.current.requestFullscreen().catch(() => {});
    } else {
      // iPhone Safari only lets the video element itself go full screen.
      (player.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void } | null)?.webkitEnterFullscreen?.();
    }
  };

  const seek = (value: number) => {
    const v = player.current;
    if (v) v.currentTime = value;
  };

  // The seek bar needs a length; until it's known the bar stays at the start.
  const length = Number.isFinite(duration) ? duration : 0;

  return (
    <figure className="space-y-2">
      <div ref={frame} className="group relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
        <video
          ref={player}
          src={`${videoSrc(video.url)}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          aria-label={video.title}
          onClick={toggle}
          onPlay={() => { setPlaying(true); setStarted(true); setEnded(false); }}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setEnded(true); }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onError={() => setFailed(true)}
          className="w-full h-full object-contain cursor-pointer"
        />

        <figcaption className={`pointer-events-none absolute inset-x-0 top-0 px-3 pt-2.5 pb-6 md:p-6 bg-gradient-to-b from-black/75 to-transparent transition-opacity duration-300 ${playing ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100' : 'opacity-100'}`}>
          <span className="block font-bold text-white text-sm md:text-lg leading-snug line-clamp-2">{video.title}</span>
          {video.description && <span className="block text-xs md:text-sm text-white/85 mt-0.5 md:mt-1 line-clamp-1 md:line-clamp-2">{video.description}</span>}
        </figcaption>

        {failed ? (
          <p role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/85">This video can’t be played right now.</p>
        ) : (ended || (!playing && !started)) && (
          <button type="button" onClick={toggle} aria-label={ended ? `Play ${video.title} again` : `Play ${video.title}`} className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/55 border border-white/30 flex items-center justify-center text-white hover:bg-black/70">
            {ended ? <RotateCcw className="w-7 h-7" aria-hidden="true" /> : <Play className="w-7 h-7 ml-1" aria-hidden="true" />}
          </button>
        )}

        <div className={`absolute inset-x-0 bottom-0 px-3 pt-8 pb-1.5 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${playing ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100' : 'opacity-100'}`}>
          <input
            type="range"
            min={0}
            max={length}
            step={0.1}
            value={Math.min(time, length)}
            disabled={!length}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Position in the video"
            aria-valuetext={`${clock(time)} of ${clock(duration)}`}
            className="block w-full h-1 accent-lime-light cursor-pointer"
          />
          <div className="flex items-center gap-1 mt-1">
            <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className={control}>
              {playing ? <Pause className="w-5 h-5" aria-hidden="true" /> : <Play className="w-5 h-5" aria-hidden="true" />}
            </button>
            <button type="button" onClick={back} aria-label="Back 10 seconds" className={`${control} relative`}>
              <RotateCcw className="w-5 h-5" aria-hidden="true" />
              <span className="absolute text-[8px] font-bold" aria-hidden="true">10</span>
            </button>
            <button type="button" onClick={toggleMute} aria-label={muted ? 'Turn sound on' : 'Mute'} className={control}>
              {muted ? <VolumeX className="w-5 h-5" aria-hidden="true" /> : <Volume2 className="w-5 h-5" aria-hidden="true" />}
            </button>
            <span className="text-xs text-white tabular-nums px-1">{clock(time)} / {clock(duration)}</span>
            <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} className={`${control} ml-auto`}>
              {fullscreen ? <Minimize className="w-5 h-5" aria-hidden="true" /> : <Maximize className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {video.transcript && (
        <div>
          <button type="button" onClick={() => setTranscript(!transcript)} aria-expanded={transcript} className="flex items-center gap-1.5 py-1 text-sm font-bold text-lime-light hover:underline">
            {transcript ? <Minus className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
            {transcript ? 'Hide video transcript' : 'View video transcript'}
          </button>
          {transcript && (
            <div className="mt-2 rounded-xl bg-obsidian-wave border border-white/10 p-4 text-sm text-white-70 leading-relaxed whitespace-pre-line">{video.transcript}</div>
          )}
        </div>
      )}
    </figure>
  );
}
