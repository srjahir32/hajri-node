'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

export interface MapPoint {
  latitude: number;
  longitude: number;
  label?: string;
  sub?: string;
  highlight?: boolean;
}

function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
  }, [map, points]);
  return null;
}

/** OpenStreetMap view (the Laravel app uses HERE Maps, which needs a paid key): staff markers + optional trail. */
export default function StaffMap({ points, trail, height = 448 }: { points: MapPoint[]; trail?: [number, number][]; height?: number | string }) {
  const all: [number, number][] = [...points.map((p) => [p.latitude, p.longitude] as [number, number]), ...(trail ?? [])];
  return (
    <MapContainer center={[20.59, 78.96]} zoom={5} scrollWheelZoom style={{ height, width: '100%', borderRadius: 10 }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {trail && trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#2F8CFF', weight: 4, opacity: 0.8 }} />}
      {points.map((p, i) => (
        <CircleMarker key={i} center={[p.latitude, p.longitude]} radius={p.highlight ? 11 : 9} pathOptions={{ color: '#fff', weight: 2, fillColor: p.highlight ? '#16a34a' : '#2F8CFF', fillOpacity: 1 }}>
          {p.label && (
            <Popup>
              <b>{p.label}</b>
              {p.sub && <div style={{ fontSize: 12 }}>{p.sub}</div>}
            </Popup>
          )}
        </CircleMarker>
      ))}
      <Fit points={all} />
    </MapContainer>
  );
}
