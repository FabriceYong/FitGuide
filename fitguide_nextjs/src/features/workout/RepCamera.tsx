'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { createRepCounter, REP_EXERCISES, type RepExerciseId } from '@fitguide/shared/repCounter';

// The pose model runs in the browser: its WebAssembly from the npm package's
// CDN copy (the same version as package.json), the model from Google.
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

type Status = 'camera' | 'model' | 'running' | 'failed';

/**
 * Counts reps of squats or push-ups with the camera, on this device: the
 * video never leaves it. "Done" hands the count to the set log
 * (the app's rep_camera.dart).
 */
export function RepCamera({ exercise, onDone, onClose }: { exercise: RepExerciseId; onDone: (reps: number) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>('camera');
  const [error, setError] = useState<string | null>(null);
  const [reps, setReps] = useState(0);
  const [cue, setCue] = useState<string | null>(null);
  const [seen, setSeen] = useState(true);
  const ex = REP_EXERCISES[exercise];

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    let landmarker: { detectForVideo(v: HTMLVideoElement, t: number): { landmarks: { x: number; y: number; visibility: number }[][] }; close(): void } | null = null;
    const counter = createRepCounter(exercise);
    let cueTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser has no camera access.');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        if (stopped) return;
        video.current!.srcObject = stream;
        await video.current!.play();
        setStatus('model');
        const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
        const files = await FilesetResolver.forVisionTasks(WASM);
        landmarker = await PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' }, runningMode: 'VIDEO', numPoses: 1 });
        if (stopped) return;
        setStatus('running');
        let last = -1;
        const tick = () => {
          if (stopped || !landmarker || !video.current) return;
          const now = performance.now();
          if (video.current.currentTime !== last) {
            last = video.current.currentTime;
            const [pose] = landmarker.detectForVideo(video.current, now).landmarks;
            setSeen(Boolean(pose));
            if (pose) {
              const r = counter.update(pose);
              if (r.event === 'rep') setReps(r.reps);
              if (r.cue) {
                setCue(r.cue);
                clearTimeout(cueTimer);
                cueTimer = setTimeout(() => setCue(null), 2500);
              }
            }
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch (err) {
        if (stopped) return;
        const name = (err as Error).name;
        setError(name === 'NotAllowedError' ? 'Camera access was turned down. Allow it in the browser to count reps.' : name === 'NotFoundError' ? 'No camera found on this device.' : 'The camera counter could not start here.');
        setStatus('failed');
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      clearTimeout(cueTimer);
      landmarker?.close();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [exercise]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="rep-camera-title">
      <div className="w-full max-w-lg bg-[#131921] border border-white/10 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="rep-camera-title" className="font-extrabold flex items-center gap-2"><Camera className="w-5 h-5 text-lime-light" aria-hidden="true" /> Count {ex.name.toLowerCase()} with the camera</h2>
          <button type="button" onClick={onClose} aria-label="Close the camera counter" className="p-2 -m-2 text-white/60 hover:text-white"><X className="w-5 h-5" aria-hidden="true" /></button>
        </div>
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black">
          {/* Mirrored, like a mirror. */}
          <video ref={video} playsInline muted className="w-full h-full object-cover -scale-x-100" />
          {status !== 'failed' && (
            <div className="absolute top-3 left-3 px-4 py-2 rounded-2xl bg-black/60 text-center">
              <p className="text-4xl font-black tabular-nums" aria-hidden="true">{reps}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">reps</p>
            </div>
          )}
          {(status === 'camera' || status === 'model') && (
            <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm bg-black/50">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> {status === 'camera' ? 'Starting the camera…' : 'Loading the body tracker…'}
            </p>
          )}
          {status === 'running' && (cue || !seen) && (
            <p className="absolute bottom-3 inset-x-3 text-center text-sm font-bold px-3 py-2 rounded-xl bg-amber-500/90 text-black">{cue || 'Step back so your whole body is in view'}</p>
          )}
        </div>
        <p aria-live="polite" className="sr-only">{reps} {reps === 1 ? 'rep' : 'reps'}{cue ? `. ${cue}` : ''}</p>
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : <p className="text-xs text-white/60">{ex.setup} The video stays on this device.</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15">Cancel</button>
          <button type="button" onClick={() => onDone(reps)} disabled={!reps} className="flex-1 py-3 rounded-xl font-bold text-sm bg-lime-light text-noir-eclipse disabled:opacity-50">
            Log {reps} {reps === 1 ? 'rep' : 'reps'}
          </button>
        </div>
      </div>
    </div>
  );
}
