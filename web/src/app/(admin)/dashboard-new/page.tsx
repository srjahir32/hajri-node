'use client';

import AdminPage from '@/components/shell/AdminPage';
import DashboardBody from './DashboardBody';

export default function Page() {
  return (
    <AdminPage title="Dashboard" css={['setting.css', "pg/dashboard-new.css"]}>
      <DashboardBody />
    </AdminPage>
  );
}
