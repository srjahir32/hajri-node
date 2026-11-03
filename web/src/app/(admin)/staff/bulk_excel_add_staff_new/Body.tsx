'use client';

import { useState } from 'react';
import * as I from '@/components/icons';
import { adminApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { navigate } from '@/lib/navigate';

export default function Body() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const downloadTemplate = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await adminApi.download('/admin/staff/import-template', undefined, 'staff-import-template.xlsx');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError('Please select a file to upload');
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return setError('Only .xlsx, .xls or .csv files are allowed');
    setError('');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminApi.form<{ created: number; failed: { row: number; message: string }[] }>('POST', '/admin/staff/import', fd);
      window.sessionStorage.setItem('bulk.staff.result', JSON.stringify(res.data));
      toast.success(String(res.message));
      window.setTimeout(() => (navigate('/staff/bulk_excel_add_staff_onboarding_new')), 700);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
      setBusy(false);
    }
  };

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
                <div className="staff-view-profile-main excel-content mb-0">
                    <div className="staff-form-muti-step mb-0">
                        <div className="staff-view-profile" style={{ cursor: "pointer" }} id="personal_info_form_data">
                            <p id="step1" className="staff-personal-info staff_info_active proxima_nova_semibold staff-personal-first">
                                <span className="info-step step-1 info_active">1</span>Upload File
                            </p>
                        </div>
                        <div className="staff-view-profile" style={{ cursor: "pointer" }} id="bank_details_form_data">
                            <a href={"/staff/bulk_excel_add_staff_onboarding_new"}>
                                <p id="step2" className="staff-personal-info proxima_nova_semibold staff-personal-secound excel-validate-save">
                                    <span className="info-step step-2">2</span>Validate & Save
                                </p>
                            </a>
                        </div>
                        
                    </div>
                </div>
                <div className="excel-border"></div>
                <div className="row mb-0">
                    <div className="col-8 bulk-dataformate-upload pt-0">
                        <div className="">
                            <h4 className="page-title pull-left proxima_nova_semibold">Excel/CSV sheet format for upload.</h4>
                        </div>
                        <div className="">
                            <a href="#" onClick={downloadTemplate}>
                                <button type="button" name="" className="download-btn proxima_nova_semibold apply_staff_filter excel-down-tem" data-bs-dismiss="offcanvas" aria-label="Close">Download Template</button>
                            </a>
                        </div>
                    </div>
                </div>
                <div className="excel-border"></div>
                <form id="import_form" onSubmit={submit}>
                    <div className="row">
                        <div className="col-10 upload-instru-data-show">
                            <div className="col-7 excel-upload-template">
                                <p className="proxima_nova_semibold upload-template">Upload Template</p>
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                                <div className="shift-inner-sub-label-edit">
                                    <div className="form-group col-sm-12 files file-area">
                                        <input type="file" className="custom-file-input form-control import_file" id="import_file" name="import_file" accept=".xlsx, .xls, .csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />{error && <span className="error error_message proxima_nova_semibold">{error}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="col-5 excel-instruction">
                                <div>
                                    <h2 className="proxima_nova_semibold section_title bulk-instruction">Instructions</h2>
                                </div>
                                <div className="instruction-right-section">
                                    <p>1. Download the format (.xlsx) first by clicking the Download
                                        Template button on the left. For each salary template, there
                                        is a different format.</p>
                                    <p>2. Add details of the staff as mentioned in the template. Please
                                        make sure to read the instructions given in the downloaded
                                        template.</p>
                                    <p>3. Select the respective salary template and upload the file.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="excel-staff-submit-main">
                        <button className="excel-add-staff-btn" type="submit" disabled={busy}>Submit</button>
                    </div>
                </form>
            </div>
        </div>
    </main>


    </>
  );
}
