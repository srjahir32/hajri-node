'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Staff Management" css={["https://unpkg.com/leaflet/dist/leaflet.css", "https://unpkg.com/leaflet-routing-machine/dist/leaflet-routing-machine.css"]}>
      <Body />
    </AdminPage>
  );
}
