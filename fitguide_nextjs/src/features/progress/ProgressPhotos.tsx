'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { AlertCircle, Camera, Loader2, Lock, Trash2 } from 'lucide-react';
import { apiRequest, fetchFile } from '../../lib/api';
import { localToday } from '../../services/trainingService';
import { formatDay } from './format';

interface Photo {
  id: string;
  date: string;
  note: string;
  url: string;
}

/** A private photo's image, loaded with the session. */
function PhotoImage({ photo, className }: { photo: Photo; className: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    fetchFile(photo.url).then((blob) => {
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setSrc(url);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo.url]);
  return src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt={`Progress photo, ${formatDay(photo.date)}${photo.note ? `: ${photo.note}` : ''}`} className={`${className} object-cover`} />
    : <div className={`${className} bg-white/5 animate-pulse`} aria-hidden="true" />;
}

/**
 * Private progress photos by date (the app's progress_photos.dart): add one,
 * compare any two side by side, delete. Only you can see them.
 */
export function ProgressPhotos() {
  const fileId = useId();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(localToday);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pair, setPair] = useState<[string, string] | null>(null);
  // Bumped to empty the file input after adding.
  const [inputKey, setInputKey] = useState(0);

  useEffect(() => {
    apiRequest('/progress-photos', { auth: true }).then((d) => setPhotos(d.photos)).catch((err: Error) => setError(err.message));
  }, []);

  // Before and after: the chosen pair, else the first and the latest.
  const before = photos?.find((p) => p.id === pair?.[0]) ?? photos?.[0];
  const after = photos?.find((p) => p.id === pair?.[1]) ?? photos?.[photos.length - 1];

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('date', date);
      formData.append('note', note);
      const { photo } = await apiRequest('/progress-photos', { method: 'POST', formData, auth: true, query: { tzOffset: new Date().getTimezoneOffset() } });
      setPhotos((list) => [...(list || []), photo].sort((a, b) => a.date.localeCompare(b.date)));
      setFile(null);
      setNote('');
      setInputKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the photo.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (photo: Photo) => {
    setError(null);
    try {
      await apiRequest(`/progress-photos/${photo.id}`, { method: 'DELETE', auth: true });
      setPhotos((list) => (list || []).filter((p) => p.id !== photo.id));
      setPair(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the photo.');
    }
  };

  const field = 'w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white [color-scheme:dark]';
  const choose = (side: 0 | 1, id: string) => setPair([side === 0 ? id : before!.id, side === 1 ? id : after!.id]);

  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 text-xs text-white-70"><Lock className="w-3.5 h-3.5" aria-hidden="true" /> Only you can see these.</p>

      {before && after && photos!.length >= 2 && (
        <div className="grid grid-cols-2 gap-3">
          {([[0, 'Before', before], [1, 'After', after]] as const).map(([side, label, photo]) => (
            <figure key={label} className="space-y-2">
              <PhotoImage photo={photo} className="w-full aspect-[3/4] rounded-2xl" />
              <label className="block text-xs font-bold text-white-70">{label}
                <select value={photo.id} onChange={(e) => choose(side, e.target.value)} className={`${field} mt-1`}>
                  {photos!.map((p) => <option key={p.id} value={p.id}>{formatDay(p.date)}{p.note ? ` · ${p.note}` : ''}</option>)}
                </select>
              </label>
            </figure>
          ))}
        </div>
      )}

      {photos && photos.length > 0 && (
        <ul className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {photos.map((p) => (
            <li key={p.id} className="relative shrink-0">
              <PhotoImage photo={p} className="w-20 h-24 rounded-xl" />
              <span className="block text-[10px] text-white-70 mt-1 text-center">{formatDay(p.date)}</span>
              <button type="button" onClick={() => remove(p)} aria-label={`Delete the photo from ${formatDay(p.date)}`} className="absolute top-1 right-1 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center hover:bg-red-500/80">
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {photos?.length === 0 && <p className="text-sm text-white-70">Add a photo every few weeks to see changes the scale doesn’t show.</p>}

      <form onSubmit={add} className="grid grid-cols-2 gap-3 items-end">
        <label htmlFor={fileId} className="col-span-2 flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-white-30/40 text-sm text-white cursor-pointer hover:border-lime-light/60">
          <Camera className="w-4 h-4" aria-hidden="true" /> {file ? file.name : 'Choose a photo'}
        </label>
        <input key={inputKey} id={fileId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <label className="block text-xs font-bold text-white-70">Date
          <input type="date" required value={date} max={localToday()} onChange={(e) => setDate(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="block text-xs font-bold text-white-70">Note
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Optional" className={`${field} mt-1`} />
        </label>
        {error && <p role="alert" className="col-span-2 flex items-center gap-2 text-sm text-red-300"><AlertCircle className="w-4 h-4" aria-hidden="true" /> {error}</p>}
        <button type="submit" disabled={!file || busy} className="col-span-2 h-11 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Add photo
        </button>
      </form>
    </div>
  );
}
