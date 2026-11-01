'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

// The browser's barcode reader (Chrome on Android, ChromeOS and macOS). Not in TypeScript's DOM types yet.
interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: HTMLVideoElement): Promise<DetectedBarcode[]> }
type BarcodeDetectorClass = new (options: { formats: string[] }) => BarcodeDetectorLike;

const detectorClass = () => (typeof window !== 'undefined' ? (window as unknown as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector : undefined);

/** Whether this browser can read barcodes from the camera. */
export const canScanBarcodes = () => Boolean(detectorClass()) && typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

/**
 * The back camera, read for a food barcode (EAN/UPC) a few times a second.
 * Calls onCode with the digits once, or onError if the camera can't be used.
 */
export function BarcodeCamera({ onCode, onError }: { onCode: (code: string) => void; onError: (message: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    const Detector = detectorClass();
    if (!Detector) return;
    const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        video.current!.srcObject = s;
        await video.current!.play();
        setStarting(false);
        timer = setInterval(async () => {
          const found = (await detector.detect(video.current!).catch(() => [])).map((b) => b.rawValue).find((v) => /^\d{8,14}$/.test(v));
          if (found && !stopped) {
            stopped = true;
            onCode(found);
          }
        }, 300);
      })
      .catch((err: Error) => onError(err.name === 'NotAllowedError'
        ? 'FitGuide can’t use the camera. Allow it in your browser, or type the barcode instead.'
        : 'The camera couldn’t start. Type the barcode instead.'));

    return () => {
      stopped = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode, onError]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
      <video ref={video} muted playsInline className="w-full h-full object-cover" aria-label="Camera view for scanning a barcode" />
      <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-24 border-2 border-lime-light rounded-xl pointer-events-none" aria-hidden="true" />
      {starting && <Loader2 className="absolute inset-0 m-auto w-6 h-6 animate-spin text-white-70" aria-label="Starting the camera" />}
    </div>
  );
}
