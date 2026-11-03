'use client';

import { Fragment } from 'react';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { confirmSwal } from '@/lib/swal';
import { fmtHm, fmtTime12 } from '@/lib/format';
import { empty, isset, ucwords } from '@/lib/blade';
import * as I from '@/components/icons';

interface Detail { id: number; name: string | null; start_time: string; end_time: string; total_payable_seconds: number }
interface Shift { id: number; name: string; shift_type_id: number; details: Detail[] }

export default function Body() {
  const list = useAdmin<Shift[]>('/admin/shifts');
  const shifts = (list.data?.data ?? []).map((sh) => ({
    ...sh,
    WorkingDetails: sh.details.map((d) => ({ name: d.name, shift_start_time: d.start_time, shift_end_time: d.end_time, total_payable_hours: fmtHm(d.total_payable_seconds) })),
  }));
  const fixedShiftType1 = shifts.some((x) => x.shift_type_id == 1);
  const rotationalShiftType1 = shifts.some((x) => x.shift_type_id == 2);
  const openShiftType1 = shifts.some((x) => x.shift_type_id == 3);
  const del = useAction((id: number) => adminApi.del(`/admin/shifts/${id}`), { invalidate: ['/admin/shifts'] });
  const remove = async (id: number) => {
    if (await confirmSwal({ title: 'Delete shift?', text: 'Are you sure to delete this shift?', confirmText: 'Delete' })) del.mutate(id);
  };
  if (!list.data) return null;
  return (
    <>

    <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
                <div className="flex flex-col gap-1">
                    <div className="row">
                        <div className="col-sm-6">
                            <button onClick={() => history.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
                                <I.I145b1c />
                                <span className="font-semibold text-lg">Shift Settings</span>
                            </button>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1"><span>Settings</span>
                                <I.I8b8a74 />
                                <span>Attendance Settings</span>
                                <I.I8b8a74 />
                                <span className="text-foreground font-medium">Shift Settings</span>
                            </div>
                        </div>
                        {(!empty(shifts) && isset(shifts[0])) && (<>
                        <div className="col-sm-6">
                            <div className="flex justify-end">
                                <a href={"/setting/add_shift_new"} className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95">
                                    + Add Shift
                                </a>
                            </div>
                        </div>
                        </>)}
                    </div>
                </div>
                {(empty(shifts) || !isset(shifts[0])) ? (<>
                    <div className="col-12 add_shift_setting">
                        <div className="no_shift_setting_main">
                            <div className="no_shift_setting ">
                                <h2 className="proxima_nova_bold">No Shift Added</h2>
                            </div>
                            
            
                            <button type="submit" className="proxima_nova_semibold add-shift-submit-btn"><a href={"/setting/add_shift_new"}>+ Add Shift</a></button>
                            
                        </div>
                    </div>
                </>) : (<>
                                        <div className="col-sm-12 shift-setting-main">
                        <div className="hajri-salary-pays-main">
                            <div className="shift-main-sub">
                                <label className="fix-shift-container proxima_nova_semibold">Fixed Shift</label>
                                {(shifts ?? []).map((shift, _i1) => (<Fragment key={_i1}>
                                    {(shift.shift_type_id == 1) && (<>
                                                                                <div className="shift-inner-sub-label">
                                            <p className="shift-title">{(ucwords(shift.name))}</p>
                                            <div className="shift-time">
                                                <p className="proxima_nova_semibold">{(fmtTime12(shift.WorkingDetails[0].shift_start_time))} - {(fmtTime12(shift.WorkingDetails[0].shift_end_time))}</p>
                                            </div>
                                            <div className="dropdown-toggle shift-setting-dropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                                <img src={"/assets/admin/images/daily_work/dots.svg"} alt="" />
                                            </div>
                                            <div className="dropdown-menu">
            
                                                <a className="dropdown-item proxima_nova_semibold" href={`/setting/edit_shift_new/${shift.id}`}>Edit</a>
                                                <a className="dropdown-item proxima_nova_semibold" href="#" /* onclick=deleteShift(E17) */>Delete</a>
                                            </div>
                                        </div>
                                    </>)}
                                </Fragment>))}
                                {(!fixedShiftType1) && (<>
                                    <div className="shift-inner-sub-label">
                                        <p className="shift-title" style={{ color: "#808080" }}>No Fixed Shift Defined.</p>
                                    </div>
                                </>)}
                            </div>
                            <div className="shift-main-sub shift-main-sub-sec">
                                <label className="fix-shift-container proxima_nova_semibold">Rotational Shift</label>
                                {(shifts ?? []).map((shift, _i2) => (<Fragment key={_i2}>
                                    {(shift.shift_type_id == 2) && (<>
                                                                                <div className="shift-inner-sub-label">
                                            <p className="shift-title">{(ucwords(shift.name))}</p>
                                            {(shift.WorkingDetails ?? []).map((working_detail, _i3) => (<Fragment key={_i3}>
                                                <div className="shift-time">
                                                    <p className="proxima_nova_semibold">{(ucwords(working_detail.name))} ({(fmtTime12(working_detail.shift_start_time))} - {(fmtTime12(working_detail.shift_end_time))})</p>
                                                </div>
                                            </Fragment>))}
                                            <div className="dropdown-toggle shift-setting-dropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                                <img src={"/assets/admin/images/daily_work/dots.svg"} alt="" />
                                            </div>
                                            <div className="dropdown-menu">
            
                                                <a className="dropdown-item proxima_nova_semibold" href={`/setting/edit_shift_new/${shift.id}`}>Edit</a>
                                                <a className="dropdown-item proxima_nova_semibold" href="#" /* onclick=deleteShift(E32) */>Delete</a>
                                            </div>
                                        </div>
                                    </>)}
                                </Fragment>))}
                                {(!rotationalShiftType1) && (<>
                                    <div className="shift-inner-sub-label">
                                        <p className="shift-title" style={{ color: "#808080" }}>No Rotational Shift Defined.</p>
                                    </div>
                                </>)}
                            </div>
                            <div className="shift-main-sub shift-main-sub-sec">
                                <label className="fix-shift-container proxima_nova_semibold">Open Shift</label>
                                {(shifts ?? []).map((shift, _i4) => (<Fragment key={_i4}>
                                    {(shift.shift_type_id == 3) && (<>
                                                                                <div className="shift-inner-sub-label">
                                            <p className="shift-title">{(ucwords(shift.name))}</p>
                                            <div className="shift-time">
                                                <p className="proxima_nova_semibold">{(shift.WorkingDetails[0].total_payable_hours)} Hours</p>
                                            </div>
                                            <div className="dropdown-toggle shift-setting-dropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                                <img src={"/assets/admin/images/daily_work/dots.svg"} alt="" />
                                            </div>
                                            <div className="dropdown-menu">
            
                                                <a className="dropdown-item proxima_nova_semibold" href={`/setting/edit_shift_new/${shift.id}`}>Edit</a>
                                                <a className="dropdown-item proxima_nova_semibold" href="#" /* onclick=deleteShift(E43) */>Delete</a>
                                            </div>
                                        </div>
                                    </>)}
                                </Fragment>))}
                                {(!openShiftType1) && (<>
                                    <div className="shift-inner-sub-label">
                                        <p className="shift-title" style={{ color: "#808080" }}>No Open Shift Defined.</p>
                                    </div>
                                </>)}
                            </div>
                        </div>
                    </div>
                </>)}
            </div>
        </div>
    </main>

    </>
  );
}
