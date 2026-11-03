'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

const icon = L.divIcon({ className: '', html: '<div style="width:18px;height:18px;border-radius:50%;background:#2F8CFF;border:3px solid #fff;box-shadow:0 0 0 2px #2F8CFF55"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

function Click({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}
function Fly({ to }: { to: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (to) map.setView(to, Math.max(map.getZoom(), 15));
  }, [map, to]);
  return null;
}

/** Search box + OpenStreetMap to choose a point (Laravel used Google Places; Nominatim needs no key). `value` / `onChange` are lat/lng. */
export default function LocationPicker({ lat, lng, onChange, height = 320, radius }: { lat: number | null; lng: number | null; onChange: (lat: number, lng: number) => void; height?: number; radius?: number }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pos: [number, number] | null = lat != null && lng != null ? [lat, lng] : null;

  const search = (v: string) => {
    setQ(v);
    clearTimeout(timer.current);
    if (v.trim().length < 3) return setHits([]);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(v)}`);
        setHits(await r.json());
      } catch {
        setHits([]);
      }
    }, 400);
  };
  return (
    <div>
      <div className="form-group profile-business-space" style={{ position: 'relative' }}>
        <label className="profile-field-label">Search Location</label>
        <input type="text" className="form-control profile-field" placeholder="Search location on map..." autoComplete="off" value={q} onChange={(e) => search(e.target.value)} />
        {hits.length > 0 && (
          <ul style={{ position: 'absolute', zIndex: 1000, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, width: '100%', maxHeight: 220, overflowY: 'auto', listStyle: 'none', padding: 0, margin: '4px 0 0' }}>
            {hits.map((h) => (
              <li key={`${h.lat},${h.lon}`} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }} onClick={() => { onChange(Number(h.lat), Number(h.lon)); setQ(h.display_name); setHits([]); }}>
                {h.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div id="map" style={{ height, borderRadius: 10, overflow: 'hidden' }}>
        <MapContainer center={pos ?? [20.59, 78.96]} zoom={pos ? 15 : 5} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Click onPick={onChange} />
          <Fly to={pos} />
          {pos && <Marker position={pos} icon={icon} draggable eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); onChange(p.lat, p.lng); } }} />}
        </MapContainer>
      </div>
      {radius ? <p className="text-xs text-gray-500 mt-1">Allowed radius: {radius} m</p> : null}
    </div>
  );
}
