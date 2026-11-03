'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Business Setting" css={["https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css", "https://cdn.jsdelivr.net/combine/npm/select2@4.1.0-rc.0/dist/css/select2.min.css,npm/select2-bootstrap-5-theme@1.3.0/dist/select2-bootstrap-5-theme.min.css", "setting.css"]}>
      <Body />
    </AdminPage>
  );
}
