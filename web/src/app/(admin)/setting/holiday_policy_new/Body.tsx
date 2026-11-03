'use client';

import { useAdmin } from '@/lib/query';
import { ICON_EDIT, ICON_MANAGE_STAFF } from '@/lib/actionIcons';
import { DataTable } from '@/components/widgets/DataTable';
import * as I from '@/components/icons';

interface Policy { id: number; name: string; holiday_count: number; staff_count: number }

export default function Body() {
  const list = useAdmin<Policy[]>('/admin/holidays/policies');
  const rows = list.data?.data ?? [];
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <a href="/setting-new" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
              <I.I145b1c />
              <span className="font-semibold text-lg">Holiday Policy</span>
            </a>
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1">
              <span>Settings</span>
              <I.I8b8a74 />
              <span>Holiday / Leave Settings</span>
              <I.I8b8a74 />
              <span className="text-foreground font-medium">Holiday Policy</span>
            </div>
          </div>
          <div className="main-content-inner leave-policy-main">
            <p className="section_sub_title proxima_nova_semibold">Create templates to give automatic paid leaves to staff on public holidays</p>
            <div className="approve_staff_data holiday_policy_table">
              <DataTable
                id="busines-setting-manager"
                className="display busines-setting-manager"
                deps={[rows]}
                head={
                  <tr>
                    <th>Template Name</th>
                    <th>Number of Holiday</th>
                    <th>Apply to</th>
                    <th>Action</th>
                  </tr>
                }
                options={() => ({
                  data: rows,
                  searching: false,
                  lengthChange: false,
                  info: false,
                  responsive: true,
                  bPaginate: false,
                  order: [],
                  columns: [
                    { data: 'name' },
                    { data: 'holiday_count', render: (n: number) => `${n} Holiday’s` },
                    { data: 'staff_count', render: (n: number) => `Applied to ${n} Staff’s` },
                    {
                      data: null,
                      orderable: false,
                      render: (_d: unknown, _t: string, r: Policy) =>
                        `<div class="approve-main-sec"><a href="/setting/manage_staff_list_new?id=${r.id}" class="create-data">${ICON_MANAGE_STAFF}</a><a href="/setting/holiday_template_new?id=${r.id}" class="create-data">${ICON_EDIT}</a></div>`,
                    },
                  ],
                })}
              />
            </div>
            <div>
              <div className="flex justify-end pt-4">
                <a
                  href="/setting/holiday_template_new"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95"
                >
                  Create Template
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
