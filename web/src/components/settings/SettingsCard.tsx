'use client';

import type { ReactNode } from 'react';
import { BackCrumb } from '@/components/shell/BackCrumb';

export const PRIMARY_BTN = 'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95';

/** Page frame of the single-form settings views: back/breadcrumb header, white card, Save button. */
export function SettingsCard({ title, crumbs, onSave, busy, children, saveLabel = 'Save', hideSave }: { title: string; crumbs: string[]; onSave?: () => void; busy?: boolean; children: ReactNode; saveLabel?: string; hideSave?: boolean }) {
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title={title} crumbs={crumbs} />
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <form onSubmit={(e) => { e.preventDefault(); onSave?.(); }}>
              {children}
              {!hideSave && (
                <div className="flex justify-end pt-4">
                  <button type="submit" id="save-btn" className={PRIMARY_BTN} disabled={busy}>{saveLabel}</button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

/** One "label + hint | input" row. */
export function SettingRow({ label, hint, children, divider }: { label: string; hint: ReactNode; children: ReactNode; divider?: boolean }) {
  return (
    <div className={`col-sm-12 shift-setting-main${divider ? ' pt-6 border-t border-gray-100 mt-6' : ''}`}>
      <div className="hajri-salary-pays-main">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1">
            <label className="font-medium text-gray-900 block text-base">{label}</label>
            <div>
              <span className="text-sm text-gray-400 font-medium">{hint}</span>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
