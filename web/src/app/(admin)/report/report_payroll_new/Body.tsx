'use client';

import { Fragment } from 'react';
import * as I from '@/components/icons';
import { count } from '@/lib/blade';

export default function Body() {
  return (
    <>

    <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
                <div className="flex flex-col gap-1">
                    <button /* onclick=history.back() */ className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
                        <I.I145b1c />
                        <span className="font-semibold text-lg">Payroll Reports</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1">
                        <span>Reports</span>
                        <I.I8b8a74 />
                        <span className="text-foreground font-medium">Payroll Reports</span>
                    </div>
                </div>
                <div className="main-content-inner">
                    <a className="report-list" href={"/report/bulk_salary_slip_new"}>
                        <div className="atten-report-list">
                            <div>
                                <div className="section_sub_title proxima_nova_semibold business-manager-name">Bulk Salary Slip</div>
                            </div>
                            <p className="report-inner-content proxima_nova_regular">Bulk Salary Slip Report</p>
                        </div>
                        <div className="col-2 text-end">
                            <I.I639175 />
                        </div>
                    </a>
                    <a className="report-list" href={"/report/staff_payroll_report_new"}>
                        <div className="atten-report-list">
                            <div>
                                <div className="payroll-add-report">
                                    <div className="section_sub_title proxima_nova_semibold business-manager-name">Staff Payroll Report</div>
                                </div>
                            </div>
                            <p className="report-inner-content proxima_nova_regular">Complete payroll report of all the staff</p>
                        </div>
                        <div className="flex text-end">
                            <I.I304973 />
                            <I.I997cb6 />
                        </div>
                    </a>
                </div>
            </div>
        </div>
    </main>

    </>
  );
}
