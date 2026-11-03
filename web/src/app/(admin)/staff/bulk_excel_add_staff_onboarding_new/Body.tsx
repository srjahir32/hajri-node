'use client';

import { useEffect, useState } from 'react';
import * as I from '@/components/icons';

interface Result { created: number; failed: { row: number; message: string }[] }

export default function Body() {
  const [r, setR] = useState<Result | null>(null);
  useEffect(() => {
    try {
      setR(JSON.parse(window.sessionStorage.getItem('bulk.staff.result') ?? 'null'));
    } catch {
      setR(null);
    }
  }, []);
  return (
    <>

    <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
                <div className="flex flex-col gap-1">
                    <button onClick={() => history.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
                        <I.I145b1c />
                        <span className="font-semibold text-lg">Excel Bulk Onboarding</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1">
                        <span>Staff Management</span>
                        <I.I8b8a74 />
                        <span>Add Staff</span>
                        <I.I8b8a74 />
                        <span className="text-foreground font-medium">Bulk Staff</span>
                    </div>
                </div>
                <div className="staff-view-profile-main excel-content">
                    <div className="staff-form-muti-step">
                        <div className="staff-view-profile" style={{ cursor: "pointer" }} id="personal_info_form_data">
                            <a href={"/staff/bulk_excel_add_staff_new"}>
                                <p id="step1" className="staff-personal-info  proxima_nova_semibold staff-personal-first">
                                    <span className="info-step step-1 ">1</span>Upload File
                                </p>
                            </a>
                        </div>
                        <div className="staff-view-profile" style={{ cursor: "pointer" }} id="bank_details_form_data">
                            <p id="step2" className="staff-personal-info staff_info_active proxima_nova_semibold staff-personal-secound excel-validate-save">
                                <span className="info-step step-2 info_active">2</span>Validate & Save
                            </p>
                        </div>
                        
                    </div>
                </div>
                <div className="approve_staff_data bulk-staff-onboarding">
                        <div className="p-4">
                            {!r ? (
                                <p className="proxima_nova_semibold">No import found. <a href="/staff/bulk_excel_add_staff_new">Upload a file</a> first.</p>
                            ) : (
                                <>
                                    <h2 className="proxima_nova_semibold section_title">{r.created} staff imported successfully{r.failed.length ? `, ${r.failed.length} row(s) need attention` : ''}</h2>
                                    {r.failed.length > 0 && (
                                        <table id="staff_datas" className="display bulk_excel_staff_onboarding mt-3">
                                            <thead><tr><th>Row</th><th>Problem</th></tr></thead>
                                            <tbody>
                                                {r.failed.map((f) => <tr key={f.row}><td>{f.row}</td><td className="text-danger">{f.message}</td></tr>)}
                                            </tbody>
                                        </table>
                                    )}
                                    <div className="flex justify-end pt-4">
                                        <a href="/staff-new" className="download-btn proxima_nova_semibold apply_staff_filter">Go to Staff</a>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
    </main>
    </>
  );
}
