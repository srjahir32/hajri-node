'use client';

import * as I from '@/components/icons';

/** The right-hand "Delete …? / Are you sure …" offcanvas used all over the Laravel admin. */
export function ConfirmOffcanvas({ id, title, message, confirmLabel = 'Delete', busy, onConfirm, className = '' }: {
  id: string;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  className?: string;
}) {
  return (
    <div className={`offcanvas offcanvas-end daily-work-data-download ${className}`} tabIndex={-1} id={id} data-bs-scroll="true">
      <div className="offcanvas-header">
        <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close">
          <I.I9dae93 />
        </div>
      </div>
      <div className="offcanvas-body overflow-auto">
        <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">{title}</h5>
        <hr />
        <div className="staff_view_delete_title">
          <h5>{message}</h5>
        </div>
        <div className="filter-sub-sec">
          <div className="download-cancel-btns-main">
            <div className="download-cancel-btn mb-0">
              <button type="button" className="download-btn proxima_nova_semibold w-100 close_delete_modal" data-bs-dismiss="offcanvas" disabled={busy} onClick={onConfirm}>
                {confirmLabel}
              </button>
              <button type="button" className="download-btn proxima_nova_semibold w-100 cancel_modal" data-bs-dismiss="offcanvas" aria-label="Close">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
