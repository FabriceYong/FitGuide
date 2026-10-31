'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Footprints, Loader2, LocateFixed, MapPin, Navigation, RefreshCw, Search, X } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import {
  RADII, directionsUrl, fetchNearbyGyms, formatDistance, gymName, searchPlaces, walkTime,
  type Gym, type LatLng, type Place,
} from '../../services/gymService';
import { GymMap } from './GymMap';

type Origin = LatLng & { label: string };
type Status = 'locating' | 'loading' | 'ready' | 'error' | 'no-location';

const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl';
const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-xs font-bold border ${on
  ? 'bg-lime-light text-noir-eclipse border-lime-light'
  : 'border-white-30/30 text-white-70 hover:text-white hover:border-white-30/60'}`;

const hasGeolocation = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;

const locationProblem = (err: GeolocationPositionError) => (err.code === err.PERMISSION_DENIED
  ? 'Location is turned off for FitGuide. Allow it in your browser’s site settings, or search for a town or address instead.'
  : 'We couldn’t find your location. Search for a town or address instead.');

/**
 * /gyms: gyms around the member on a map and in a list, nearest first. Starts
 * from the device's location (asked for on arrival); a town or address search
 * works without it, and dragging the map offers "Search this area".
 * Browser-only (location and the map), so the page loads it with GymFinderLoader.
 */
export function GymFinder() {
  const [status, setStatus] = useState<Status>(() => (hasGeolocation() ? 'locating' : 'no-location'));
  const [message, setMessage] = useState<string | null>(hasGeolocation() ? null : 'This browser can’t share its location. Search for a town or address instead.');
  const [you, setYou] = useState<LatLng | null>(null);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [movedTo, setMovedTo] = useState<LatLng | null>(null);
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const request = useRef(0);

  const search = useCallback(async (from: Origin, radius: number) => {
    const id = ++request.current;
    setOrigin(from);
    setStatus('loading');
    setMessage(null);
    setSelectedId(null);
    setMovedTo(null);
    try {
      const found = await fetchNearbyGyms(from, radius);
      if (id !== request.current) return;
      setGyms(found);
      setStatus('ready');
    } catch (err) {
      if (id !== request.current) return;
      setGyms([]);
      setMessage((err as Error).message);
      setStatus('error');
    }
  }, []);

  const searchFromHere = useCallback((radius: number) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setYou(here);
        search({ ...here, label: 'you' }, radius);
      },
      (err) => {
        setMessage(locationProblem(err));
        setStatus('no-location');
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    );
  }, [search]);

  const locate = () => {
    setStatus('locating');
    setMessage(null);
    searchFromHere(radiusKm);
  };

  // The member came here to find a gym, so ask for the location straight away.
  useEffect(() => {
    if (hasGeolocation()) searchFromHere(5);
  }, [searchFromHere]);

  const findPlaces = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    setPlaces(null);
    try {
      const found = await searchPlaces(q);
      if (found.length === 1) {
        setPlaces(null);
        search(found[0], radiusKm);
      } else {
        setPlaces(found);
      }
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const choose = (id: string) => {
    setSelectedId(id);
    listRef.current?.querySelector(`[data-gym="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const onUserMove = useCallback((center: LatLng) => setMovedTo(center), []);
  const busy = status === 'locating' || status === 'loading';
  const nextRadius = RADII.find((r) => r > radiusKm);
  const where = origin?.label === 'you' ? 'you' : origin?.label;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold">Find a gym near you</h1>
          <p className="text-white-70 mt-2 max-w-2xl">Gyms around you on the map, nearest first. Pick one for directions.</p>
        </div>
        {hasGeolocation() && (
          <button type="button" onClick={locate} disabled={busy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white-30/30 hover:border-lime-light text-sm font-bold disabled:opacity-60">
            <LocateFixed className="w-4 h-4 text-lime-light" aria-hidden="true" /> Use my location
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <form onSubmit={findPlaces} role="search" className="flex gap-2 flex-1 lg:max-w-lg">
          <label htmlFor="gym-place" className="sr-only">Search near a town or address</label>
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white-70 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              id="gym-place"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Town or address"
              autoComplete="off"
              className="w-full bg-obsidian-wave border border-white-30/20 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white-70 [color-scheme:dark]"
            />
          </div>
          <button type="submit" disabled={searching || query.trim().length < 2} className="px-4 py-2.5 rounded-xl bg-lime-light text-noir-eclipse text-sm font-extrabold disabled:opacity-60 flex items-center gap-2">
            {searching && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Search
          </button>
        </form>
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Search distance">
          <span className="text-xs text-white-70 font-semibold">Within</span>
          {RADII.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={radiusKm === r}
              onClick={() => { setRadiusKm(r); if (origin) search(origin, r); }}
              className={chip(radiusKm === r)}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      {places && (
        <div className={`${card} p-3`}>
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="text-sm font-bold">{places.length ? 'Which place did you mean?' : `No places found for “${query.trim()}”.`}</p>
            <button type="button" onClick={() => setPlaces(null)} className="p-2 -m-2 text-white-70 hover:text-white" aria-label="Close the place list">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          {places.length > 0 && (
            <ul className="space-y-1">
              {places.map((p) => (
                <li key={p.label}>
                  <button type="button" onClick={() => { setPlaces(null); search(p, radiusKm); }} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-noir-eclipse text-sm">
                    <MapPin className="w-4 h-4 text-lime-light shrink-0" aria-hidden="true" /> {p.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {message && (
        <p role="alert" className="flex items-start gap-2 text-sm text-amber-200 bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{message}</span>
          {status === 'error' && origin && (
            <button type="button" onClick={() => search(origin, radiusKm)} className="font-bold text-white flex items-center gap-1 shrink-0">
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Retry
            </button>
          )}
        </p>
      )}

      <div className="grid lg:grid-cols-[minmax(320px,400px)_1fr] gap-4">
        {/* isolate: Leaflet's layers stay under the sticky header and the phone tab bar. */}
        <div className="relative isolate h-[52vh] min-h-72 lg:h-[calc(100vh-15rem)] lg:min-h-[480px] lg:order-2">
          <GymMap
            origin={origin}
            you={you}
            gyms={gyms}
            radiusKm={radiusKm}
            selectedId={selectedId}
            onSelect={choose}
            onUserMove={onUserMove}
          />
          {busy && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-noir-eclipse/50 rounded-2xl pointer-events-none">
              <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-noir-eclipse/90 border border-white-30/20 text-sm font-semibold" role="status">
                <Loader2 className="w-4 h-4 animate-spin text-lime-light" aria-hidden="true" />
                {status === 'locating' ? 'Finding your location…' : 'Looking for gyms…'}
              </span>
            </div>
          )}
          {movedTo && !busy && (
            <button
              type="button"
              onClick={() => search({ ...movedTo, label: 'this area' }, radiusKm)}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 px-4 py-2 rounded-full bg-lime-light text-noir-eclipse text-sm font-extrabold shadow-lg"
            >
              <Search className="w-4 h-4" aria-hidden="true" /> Search this area
            </button>
          )}
        </div>

        <section aria-labelledby="gym-results" className="lg:order-1 lg:h-[calc(100vh-15rem)] lg:min-h-[480px] flex flex-col min-h-0">
          <h2 id="gym-results" className="text-sm font-bold text-white-70 mb-3" aria-live="polite">
            {status === 'ready'
              ? `${gyms.length} ${gyms.length === 1 ? 'gym' : 'gyms'} within ${radiusKm} km of ${where}`
              : busy ? 'Searching…' : 'Gyms'}
          </h2>
          {status === 'ready' && gyms.length === 0 ? (
            <EmptyState
              icon={MapPin}
              compact
              title={`No gyms found within ${radiusKm} km`}
              text="The map data may not list every gym here yet. Try a wider search or another area."
              action={nextRadius && origin ? (
                <button type="button" onClick={() => { setRadiusKm(nextRadius); search(origin, nextRadius); }} className="mt-1 px-4 py-2 rounded-xl bg-lime-light text-noir-eclipse text-sm font-extrabold">
                  Search within {nextRadius} km
                </button>
              ) : undefined}
            />
          ) : status === 'no-location' && !origin ? (
            <EmptyState icon={LocateFixed} compact title="Where should we look?" text="Search for a town or address above, or allow location to see the gyms around you." />
          ) : busy && !gyms.length ? (
            <div className="space-y-2" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-20 bg-obsidian-wave rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <ol ref={listRef} className="space-y-2 lg:overflow-y-auto lg:pr-1 flex-1 min-h-0">
              {gyms.map((gym, i) => {
                const selected = gym.id === selectedId;
                const walk = walkTime(gym.distanceKm);
                return (
                  <li key={gym.id} data-gym={gym.id} className={`${card} p-3 flex gap-3 ${selected ? 'border-lime-light' : 'hover:border-white-30/30'}`}>
                    <button type="button" onClick={() => setSelectedId(gym.id)} aria-pressed={selected} className="flex gap-3 flex-1 min-w-0 text-left">
                      <span className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${selected ? 'bg-lime-light text-noir-eclipse' : 'bg-noir-eclipse text-lime-light border border-lime-light/50'}`} aria-hidden="true">{i + 1}</span>
                      <span className="min-w-0">
                        <span className={`block font-bold truncate ${gym.name ? '' : 'text-white-70 italic'}`}>{gymName(gym)}</span>
                        {gym.address && <span className="block text-xs text-white-70 truncate">{gym.address}</span>}
                        <span className="flex items-center gap-2 text-xs text-white-70 mt-1">
                          <span className="font-bold text-lime-light">{formatDistance(gym.distanceKm)}</span>
                          {walk && <span className="flex items-center gap-1"><Footprints className="w-3 h-3" aria-hidden="true" /> {walk}</span>}
                        </span>
                      </span>
                    </button>
                    <a
                      href={directionsUrl(gym)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-center shrink-0 w-10 h-10 rounded-xl border border-white-30/20 hover:border-lime-light flex items-center justify-center"
                      aria-label={`Directions to ${gymName(gym)} (opens your maps app)`}
                    >
                      <Navigation className="w-4 h-4 text-lime-light" aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="text-[11px] text-white-70 mt-3">
            Gym data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">OpenStreetMap</a> contributors.
            Your location is only used for this search and isn’t saved.
          </p>
        </section>
      </div>
    </div>
  );
}
