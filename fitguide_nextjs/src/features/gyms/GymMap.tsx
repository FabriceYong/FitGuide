'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { directionsUrl, formatDistance, gymName, type Gym, type LatLng } from '../../services/gymService';

// Standard OpenStreetMap tiles by default; NEXT_PUBLIC_MAP_TILES_URL swaps in
// another provider (their usage policy asks heavy users to bring their own).
const TILES_URL = process.env.NEXT_PUBLIC_MAP_TILES_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
// How many of the nearest gyms the map zooms to show.
const FIT_NEAREST = 8;

/** Popup body, built from DOM nodes so names from the map data can't inject HTML. */
function popup(gym: Gym) {
  const box = document.createElement('div');
  box.className = 'gym-popup';
  const title = document.createElement('strong');
  title.textContent = gymName(gym);
  const detail = document.createElement('span');
  detail.textContent = [formatDistance(gym.distanceKm), gym.address].filter(Boolean).join(' · ');
  const link = document.createElement('a');
  link.href = directionsUrl(gym);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Directions';
  box.append(title, detail, link);
  return box;
}

/**
 * The gym map (Leaflet on OpenStreetMap tiles): the search area, where the
 * member is, and a numbered pin per gym matching the list. Leaflet needs
 * `window`, so it loads in the browser only.
 */
export function GymMap({ origin, you, gyms, radiusKm, selectedId, onSelect, onUserMove }: {
  /** Where the search was made from. */
  origin: LatLng | null;
  /** The device's position, when shared. */
  you: LatLng | null;
  gyms: Gym[];
  radiusKm: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The member dragged or zoomed the map; the new center. */
  onUserMove: (center: LatLng) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const lib = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const pins = useRef(new Map<string, Leaflet.Marker>());
  const handlers = useRef({ onSelect, onUserMove });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    handlers.current = { onSelect, onUserMove };
  }, [onSelect, onUserMove]);

  useEffect(() => {
    let cancelled = false;
    let resize: ResizeObserver | null = null;
    const el = container.current;
    import('leaflet').then((mod) => {
      if (cancelled || !el) return;
      const L = (mod as unknown as { default?: typeof Leaflet }).default ?? mod;
      lib.current = L;
      const m = L.map(el, { worldCopyJump: true }).setView([20, 0], 2);
      m.attributionControl.setPrefix(false);
      L.tileLayer(TILES_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      // Only dragging (not our own zooming to the results or a popup making
      // room) offers "Search this area".
      m.on('dragend', () => {
        const c = m.getCenter();
        handlers.current.onUserMove({ lat: c.lat, lng: c.lng });
      });
      resize = new ResizeObserver(() => m.invalidateSize());
      resize.observe(el);
      map.current = m;
      setReady(true);
    });
    return () => {
      cancelled = true;
      resize?.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Pins, the search circle and the member's position; zoom to the nearest gyms.
  useEffect(() => {
    const L = lib.current;
    const m = map.current;
    const group = layer.current;
    if (!ready || !L || !m || !group) return;
    group.clearLayers();
    pins.current.clear();
    if (!origin) return;

    L.circle([origin.lat, origin.lng], {
      radius: radiusKm * 1000, color: '#00C4B4', weight: 1, opacity: 0.5, fillOpacity: 0.04, interactive: false,
    }).addTo(group);
    if (you) {
      L.marker([you.lat, you.lng], {
        icon: L.divIcon({ className: '', html: '<span class="gym-you"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }),
        title: 'You are here',
        alt: 'You are here',
        zIndexOffset: 1000,
        keyboard: false,
      }).addTo(group);
    }
    gyms.forEach((gym, i) => {
      const pin = L.marker([gym.lat, gym.lng], {
        icon: L.divIcon({ className: '', html: `<span class="gym-pin">${i + 1}</span>`, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14] }),
        title: gymName(gym),
        alt: `${i + 1}. ${gymName(gym)}`,
        riseOnHover: true,
      });
      pin.bindPopup(() => popup(gym), { closeButton: false });
      pin.on('click', () => handlers.current.onSelect(gym.id));
      pin.addTo(group);
      pins.current.set(gym.id, pin);
    });

    const nearest = gyms.slice(0, FIT_NEAREST).map((g) => L.latLng(g.lat, g.lng));
    const bounds = nearest.length
      ? L.latLngBounds([L.latLng(origin.lat, origin.lng), ...nearest])
      : L.latLng(origin.lat, origin.lng).toBounds(radiusKm * 2000);
    m.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [ready, origin, you, gyms, radiusKm]);

  // Highlight the chosen gym and bring it into view.
  useEffect(() => {
    const m = map.current;
    pins.current.forEach((pin, id) => {
      pin.getElement()?.querySelector('.gym-pin')?.classList.toggle('is-selected', id === selectedId);
      pin.setZIndexOffset(id === selectedId ? 500 : 0);
    });
    const pin = selectedId ? pins.current.get(selectedId) : null;
    if (!m || !pin) return;
    if (!m.getBounds().pad(-0.1).contains(pin.getLatLng())) m.panTo(pin.getLatLng());
    pin.openPopup();
  }, [selectedId, gyms, ready]);

  return (
    <div
      ref={container}
      className="gym-map w-full h-full rounded-2xl overflow-hidden border border-white-30/10 bg-obsidian-wave"
      role="region"
      aria-label="Map of gyms. The list has the same gyms."
    />
  );
}
