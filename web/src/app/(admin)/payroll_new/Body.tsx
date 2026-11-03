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
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                    <div className="payroll-main">
                        <p><b>Introducing Payroll - The all-in-one solution for managing employee compensation. Here's what you can expect</b></p>
                        <p className="flex">
                            <I.Ia9f209 />Freeze cycles when you need to - giving you greater control over your payroll
                        </p>
                        <p className="flex">
                            <I.Ia9f209 />Flexibility to make payments online or offline - whatever works best for you
                        </p>
                        <p className="flex">
                            <I.Ia9f209 />Downloadable payroll reports - giving you instant access to important data for your records
                        </p>
                        <p className="flex">
                            <I.Ia9f209 />Streamlined reviews and approvals- no more searching through multiple sections of the application
                        </p>
                        <p>
                            <b>with payroll, managing your employee compensation has never been easier</b>
                        </p>
                        <button className="staff-manage-summary-btn payroll-btn">
                            <a className="dropdown-toggle text-decoration-none filter_staff_data" href={"/payroll/payroll-approve-summary-new"}>
                                Opt-In For Payroll
                            </a>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </main>

    </>
  );
}
