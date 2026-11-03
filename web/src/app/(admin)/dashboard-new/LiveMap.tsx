'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useAdmin } from '@/lib/query';
import type { MapPoint } from '@/components/widgets/StaffMap';

const StaffMap = dynamic(() => import('@/components/widgets/StaffMap'), { ssr: false });

interface Live {
  staff_id: number;
  staff_name: string;
  department: string | null;
  last_location: { latitude: number; longitude: number; formatted_time: string | null };
}

/** `#mapdiv` of the dashboard: live staff positions + the fullscreen toggle. */
export function LiveMap() {
  const ref = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const live = useAdmin<Live[]>('/admin/locations/live', undefined, { refetchInterval: 60_000 });
  const points: MapPoint[] = (live.data?.data ?? []).map((l) => ({ latitude: l.last_location.latitude, longitude: l.last_location.longitude, label: l.staff_name, sub: [l.department, l.last_location.formatted_time].filter(Boolean).join(' · ') }));

  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (!document.fullscreenElement) void el.requestFullscreen?.();
    else void document.exitFullscreen?.();
  };

  return (
    <div id="mapdiv" ref={ref} style={{ width: '100%', height: full ? '100%' : '448px', position: 'relative', borderRadius: '10px', overflow: 'hidden' }}>
      <StaffMap points={points} height="100%" />
      <button id="fullscreen-btn" onClick={toggle}>
        <i className={`fa ${full ? 'fa-compress' : 'fa-expand'}`} aria-hidden="true"></i>
      </button>
    </div>
  );
}
