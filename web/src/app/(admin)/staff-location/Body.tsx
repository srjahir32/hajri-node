'use client';

import dynamic from 'next/dynamic';
import { useAdmin } from '@/lib/query';

const StaffMap = dynamic(() => import('@/components/widgets/StaffMap'), { ssr: false });

/** Every staff member's latest known position today. */
export default function Body() {
  const live = useAdmin<{ staff_id: number; staff_name: string; department: string | null; last_location: { latitude: number; longitude: number; formatted_time: string | null } }[]>('/admin/locations/live', undefined, { refetchInterval: 60000 });
  const points = (live.data?.data ?? []).map((l) => ({ latitude: l.last_location.latitude, longitude: l.last_location.longitude, label: l.staff_name, sub: `${l.department ?? ''} ${l.last_location.formatted_time ?? ''}`.trim() }));
  return (
    <div id="map" style={{ height: 'calc(100vh - 140px)' }}>
      <StaffMap points={points} height="100%" />
    </div>
  );
}
