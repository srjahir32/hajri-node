'use client';

import { useAdmin } from '@/lib/query';
import { ICON_EDIT, ICON_MANAGE_STAFF } from '@/lib/actionIcons';
import { DataTable } from '@/components/widgets/DataTable';
import { BackCrumb } from '@/components/shell/BackCrumb';

interface Policy { id: number; template_name: string; number_of_leaves: number; staff_count: number }

export default function Body() {
  const rows = useAdmin<Policy[]>('/admin/leave-policies').data?.data ?? [];
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title="Leave Policy" crumbs={['Settings', 'Holiday / Leave Settings', 'Leave Policy']} />
          <div className="approve_staff_data leave_policy_data_table">
            <DataTable
              id="leave_policy"
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
                  { data: 'template_name' },
                  { data: 'number_of_leaves' },
                  { data: 'staff_count', render: (n: number) => `Applied to ${n} Staff’s` },
                  {
                    data: null,
                    orderable: false,
                    render: (_d: unknown, _t: string, r: Policy) =>
                      `<div class="approve-main-sec"><a href="/setting/leave_manage_staff_list_new?id=${r.id}" class="create-data">${ICON_MANAGE_STAFF}</a><a href="/setting/leave_template_new?id=${r.id}" class="create-data">${ICON_EDIT}</a></div>`,
                  },
                ],
              })}
            />
          </div>
          <div className="flex justify-end pt-4">
            <a
              href="/setting/leave_template_new"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95"
            >
              Create Template
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
