'use client';

import { Fragment } from 'react';
import * as I from '@/components/icons';
import { count } from '@/lib/blade';

export default function Body() {
  return (
    <>

    <main className="flex-1 p-md-5 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="main-content-inner card">
                <div className="main-content-inner">
                    <a className="report-list p-0" href={"/employee/reports/attendance-report"}>
                        <div className="atten-report-list mt-0">
                            <div className="atten_arrow_add">
                                <div className="section_sub_title proxima_nova_semibold business-manager-name">Attendance Reports
                                    <div className="setting-nest-arrow">
                                        <I.I0c6893 />
                                    </div>
                                </div>
                            </div>
                            <p className="report-inner-content proxima_nova_regular mb-0">Attendance Report of Month wise.</p>
                        </div>
                    </a>









































































                </div>
            </div>
        </div>
    </main>

    </>
  );
}
