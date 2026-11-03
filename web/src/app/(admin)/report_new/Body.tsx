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
                <div className="main-content-inner">
                    <a className="report-list" href={"/report/attendance_report_new"}>

                        
                        <div className="atten-report-list">
                            <div>
                                <div className="atten_arrow_add">
                                    <div className="section_sub_title proxima_nova_semibold business-manager-name">Attendance Reports
                                        <div className="setting-nest-arrow">
                                            <I.I0c6893 />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="report-inner-content proxima_nova_regular">Attendance Report of Staff Month wise with single, multiple and all staff.</p>
                        </div>
                        
                    </a>
                    <a className="report-list" href={"/report/report_user_list_export_new"}>
                        
                        <div className="atten-report-list">
                            <div>
                                <div className="atten_arrow_add">
                                    <div className="section_sub_title proxima_nova_semibold business-manager-name">User List export
                                        <div className="setting-nest-arrow">
                                            <I.I0c6893 />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="report-inner-content proxima_nova_regular">Export user list for all user details and their summary.</p>
                        </div>
                    </a>
                    <a className="report-list" href={"/report/salary_report_new"}>
                        
                        <div className="atten-report-list">
                            <div>
                                <div className="atten_arrow_add">
                                    <div className="section_sub_title proxima_nova_semibold business-manager-name">Salary Report
                                        <div className="setting-nest-arrow">
                                            <I.I0c6893 />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="report-inner-content proxima_nova_regular">Get Salary report of every employees salary and other related details.</p>
                        </div>
                    </a>
                    <a className="report-list" href={"/report/report_payroll_new"}>
                        
                        <div className="atten-report-list">
                            <div>
                                <div className="atten_arrow_add">
                                    <div className="section_sub_title proxima_nova_semibold business-manager-name">Payroll Reports
                                        <div className="setting-nest-arrow">
                                            <I.I0c6893 />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="report-inner-content proxima_nova_regular">Payroll Report, Fine Report, Loan Summary Report, Allowance Report, Bonus, Deduction, OT Reports, RTGS Report</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    </main>

    </>
  );
}
