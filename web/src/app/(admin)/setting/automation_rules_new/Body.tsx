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
                    <button onClick={() => history.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
                        <I.I145b1c />
                        <span className="font-semibold text-lg">Automation Rules</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1"><span>Settings</span>
                        <I.I8b8a74 />
                        <span>Attendance Settings</span>
                        <I.I8b8a74 />
                        <span className="text-foreground font-medium">Automation Rules</span>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-2/3 automation-border">
                        <div className="main-content-inner">
                            <a className="report-list" href={"/setting/late_entry_rules_new"}>
                                <div className="atten-report-list">
                                    <div>
                                        <div className="atten_arrow_add">
                                            <div className="section_sub_title proxima_nova_semibold business-manager-name">Late Entry Rules
                                                <div className="setting-nest-arrow">
                                                    <I.I0c6893 />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="report-inner-content proxima_nova_regular">Automate late fine for employees who are coming late to work</p>
                                </div>
                            </a>
                            <a className="report-list" href={"/setting/break_rule_new"}>
                                <div className="atten-report-list">
                                    <div>
                                        <div className="atten_arrow_add">
                                            <div className="section_sub_title proxima_nova_semibold business-manager-name">Breaks Rules
                                                <div className="setting-nest-arrow">
                                                    <I.I0c6893 />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="report-inner-content proxima_nova_regular">Automate break fine for employees who are taking more break time than allowed</p>
                                </div>
                            </a>
                            <a className="report-list" href={"/setting/early_exit_rules_new"}>
                                <div className="atten-report-list">
                                    <div>
                                        <div className="atten_arrow_add">
                                            <div className="section_sub_title proxima_nova_semibold business-manager-name">Early Exit Rules
                                                <div className="setting-nest-arrow">
                                                    <I.I0c6893 />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="report-inner-content proxima_nova_regular">Automate fine for employees who are leaving earlier than the shift out-time</p>
                                </div>
                            </a>
                            <a className="report-list" href={"/setting/overtime_rule_new"}>
                                <div className="atten-report-list">
                                    <div>
                                        <div className="atten_arrow_add">
                                            <div className="section_sub_title proxima_nova_semibold business-manager-name">Overtime Rules
                                                <div className="setting-nest-arrow">
                                                    <I.I0c6893 />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="report-inner-content proxima_nova_regular">Automate overtime for employees who are working extra after their shift hours</p>
                                </div>
                            </a>
                        </div>
                    </div>
                    <div className="w-full md:w-1/3 automation">
                        <div className="automation-inner-div">
                            <div className="automation-inner-subdiv inner-div-active">
                                <div className="atten_arrow_add inner-subdiv">
                                    <div className="section_sub_title proxima_nova_semibold automation-name">1. Create your first rule</div>
                                </div>
                                <p className="report-inner-content inner-div-p proxima_nova_regular">You can define a rule by selecting any of the checkboxes on the left.</p>
                            </div>
                            <div className="automation-inner-subdiv">
                                <div className="atten_arrow_add inner-subdiv">
                                    <div className="section_sub_title proxima_nova_semibold automation-name">2. Set a Rule value</div>
                                </div>
                                <p className="report-inner-content inner-div-p proxima_nova_regular">Set a value for your rule type.</p>
                            </div>
                            <div className="automation-inner-subdiv">
                                <div className="atten_arrow_add inner-subdiv">
                                    <div className="section_sub_title proxima_nova_semibold automation-name">3. Assign Staff</div>
                                </div>
                                <p className="report-inner-content inner-div-p proxima_nova_regular">Select the staff that you want the rule to be assigned to.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    </>
  );
}
