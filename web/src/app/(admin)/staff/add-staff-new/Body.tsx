'use client';

import { Fragment } from 'react';
import * as I from '@/components/icons';
import { count } from '@/lib/blade';
import { SelectClub } from '@/components/ui/SelectClub';
import { IntlPhoneInput } from '@/components/ui/IntlPhoneInput';
import { useState } from 'react';
import { adminApi, ApiError } from '@/lib/api';
import { useAdmin } from '@/lib/query';
import { toast } from '@/lib/toast';
import { clearErrors, fieldValue, isChecked, itiOf, showError } from '@/lib/formkit';
import { navigate } from '@/lib/navigate';

interface Dept { id: number; name: string }
interface Shift { id: number; name: string; shift_type_id: number; shift_type: string; details: { name: string | null; start_time: string; end_time: string }[] }

const hm12 = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const ucwords = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export default function Body() {
  const departments = useAdmin<Dept[]>('/admin/departments').data?.data ?? [];
  const working_shifts = useAdmin<Shift[]>('/admin/shifts').data?.data ?? [];
  const [shiftId, setShiftId] = useState('');
  const [busy, setBusy] = useState(false);
  const rotational = working_shifts.find((x) => String(x.id) === shiftId && x.shift_type_id === 2);
  const working_shift_details = rotational?.details ?? [];

  const validate = () => {
    clearErrors();
    let valid = true;
    const need = (id: string, msg: string) => {
      if (fieldValue(id).trim() === '') {
        showError('#' + id, msg);
        valid = false;
      }
    };
    need('first_name', 'First name field is required');
    need('last_name', 'Last name field is required');
    need('middle_name', 'Middle name field is required');
    const email = fieldValue('staff_email').trim();
    if (!email) { showError('#staff_email', 'Email field is required'); valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('#staff_email', 'Please enter a valid email address.'); valid = false; }
    const phone = fieldValue('phone_number').replace(/\s/g, '');
    if (!phone) { showError('#error', 'Phone number field is required'); valid = false; }
    // else if (itiOf('phone_number') && !itiOf('phone_number').isValidNumber()) {
    //   const c = itiOf('phone_number').getSelectedCountryData();
    //   showError('#error', `Please enter a valid phone number for ${(c?.name ?? 'the selected country').split('(')[0].trim()} (+${c?.dialCode ?? ''})`);
    //   valid = false;
    // }
    if (!fieldValue('department_id')) { showError('#department_error', 'Department field is required'); valid = false; }
    if (!fieldValue('working_shift_id')) { showError('#working_shift_error', 'Shift field is required'); valid = false; }
    if (rotational && !fieldValue('start_index')) { showError('#start_index_error', 'Shift timings field is required'); valid = false; }
    if (parseFloat(fieldValue('salary_amount')) < 0) { showError('#salary_amount', 'Salary amount cannot be negative'); valid = false; }
    const acc = fieldValue('account_number');
    if (acc && acc !== fieldValue('confirm_account_number')) { showError('#confirm_account_number', 'Account numbers do not match'); valid = false; }
    return valid;
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !validate()) return;
    const fd = new FormData();
    const set = (k: string, v: string) => v !== '' && fd.append(k, v);
    set('name', fieldValue('first_name').trim());
    set('middle_name', fieldValue('middle_name').trim());
    set('last_name', fieldValue('last_name').trim());
    set('email', fieldValue('staff_email').trim());
    set('phone_number', fieldValue('phone_number').replace(/\D/g, ''));
    fd.append('country_code', String(itiOf('phone_number')?.getSelectedCountryData()?.dialCode ?? '91'));
    set('department_id', fieldValue('department_id'));
    set('working_shift_id', fieldValue('working_shift_id'));
    set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone.replace('Asia/Calcutta', 'Asia/Kolkata'));
    fd.append('is_remote', isChecked('is_remote') ? '1' : '0');
    fd.append('auto_approve_attendance', isChecked('is_auto_approve_attendance') ? '1' : '0');
    fd.append('is_geo_fencing', isChecked('is_geo_fencing') ? '1' : '0');
    set('salary_amount', fieldValue('salary_amount'));
    for (const k of ['bank_name', 'account_holder_name', 'account_number', 'IFSC_code', 'UPI_id']) set(k, fieldValue(k));
    setBusy(true);
    try {
      const res = await adminApi.form('POST', '/admin/staff', fd);
      toast.success(String(res.message));
      navigate('/staff-new');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>

    <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
                <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => history.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
                        <I.I145b1c />
                        <span className="font-semibold text-lg">Add New Staff</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1">
                        <span>Staff Management</span>
                        <I.I8b8a74 />
                        <span className="text-foreground font-medium">Add New Staff</span>
                    </div>
                </div>
                <form id="add_staff" method="post" noValidate onSubmit={submit}>
                    
                    <input type="hidden" name="timezone" id="timezone" />
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <div className="col-sm-12 shift-setting-main">
                            <div className="hajri-salary-pays-main">
                                <div className="shift-main-sub-edit">
                                    <div className="shift-main-inner-edit">
                                        <div className="shift-inner-sub-label-edit">
                                            <label className="shift-type-label">First Name <i className="fa-solid fa-star-of-life text-danger fa-2xs" style={{ fontSize: "6px", marginTop: "8px" }}></i></label>
                                            <input type="text" className="form-control shift-edit-input" id="first_name" name="first_name" placeholder="Enter First Name" />
                                        </div>
                                        <div className="shift-inner-sub-label-edit">
                                            <label className="shift-type-label">Middle Name <i className="fa-solid fa-star-of-life text-danger fa-2xs" style={{ fontSize: "6px", marginTop: "8px" }}></i></label>
                                            <input type="text" className="form-control shift-edit-input" id="middle_name" name="middle_name" placeholder="Enter Middle Name" />
                                        </div>
                                        <div className="shift-inner-sub-label-edit">
                                            <label className="shift-type-label">Last Name <i className="fa-solid fa-star-of-life text-danger fa-2xs" style={{ fontSize: "6px", marginTop: "8px" }}></i></label>
                                            <input type="text" className="form-control shift-edit-input" id="last_name" name="last_name" placeholder="Enter Last Name" />
                                        </div>
                                    </div>
                                    <div className="shift-main-inner-edit">
                                        
                                            
                                            
                                            
                                        <div className="shift-inner-sub-label-edit">
                                            <label className="shift-type-label">Email <i className="fa-solid fa-star-of-life text-danger fa-2xs" style={{ fontSize: "6px", marginTop: "8px" }}></i></label>
                                            <input type="email" className="form-control shift-edit-input" id="staff_email" name="staff_email" placeholder="Enter Your Email" />
                                        </div>
                                        <div className="shift-inner-sub-label-edit">
                                            <div className="form-group" id="error">
                                                <label htmlFor="exampleInputPassword1" className="form-label shift-type-label">Phone Number <i className="fa-solid fa-star-of-life text-danger fa-2xs" style={{ fontSize: "6px", marginTop: "8px" }}></i></label>
                                                <IntlPhoneInput id="phone_number" className="form-control phone_input" placeholder="Phone Number" />
                                            </div>
                                        </div>
                                        
                                        
                                    </div>
                                    <div className="shift-main-inner-edit">
                                        <div className="shift-inner-sub-label-edit">
                                            <label className="shift-type-label">Department <i className="fa-solid fa-star-of-life text-danger fa-2xs" style={{ fontSize: "6px", marginTop: "8px" }}></i></label>
                                            <div className="filters staff_attendance" id="department_error">
                                                <SelectClub className="form-select create-select section_sub_title select-club-services" id="department_id" name="department_id">
                                                    <option value="">Select Department</option>
                                                    {departments.map((department, _i1) => (<Fragment key={_i1}>
                                                        <option value={(department.id)}>{(department.name)}</option>
                                                    </Fragment>))}
                                                </SelectClub>
                                            </div>
                                        </div>
                                        <div className="shift-inner-sub-label-edit">
                                            <label className="shift-type-label">Shift <i className="fa-solid fa-star-of-life text-danger fa-2xs" style={{ fontSize: "6px", marginTop: "8px" }}></i></label>
                                            <div className="filters staff_attendance" id="working_shift_error">
                                                <SelectClub className="form-select create-select section_sub_title select-club-services" id="working_shift_id" name="working_shift_id" onChange={(_e, v) => setShiftId(v)}>
                                                    <option value="">Select Shift</option>
                                                    {(working_shifts ?? []).map((working_shift, _i2) => (<Fragment key={_i2}>
                                                        <option value={working_shift.id}>{ucwords(working_shift.name)}({ucwords(working_shift.shift_type)})</option>
                                                    </Fragment>))}
                                                </SelectClub>
                                            </div>
                                        </div>
                                        <div className={`shift-inner-sub-label-edit start_index${rotational ? '' : ' d-none'}`}>
                                            <label className="shift-type-label">Shift timings <i className="fa-solid fa-star-of-life text-danger fa-2xs" style={{ fontSize: "6px", marginTop: "8px" }}></i></label>
                                            <div className="filters staff_attendance" id="start_index_error">
                                                <SelectClub className="form-select create-select section_sub_title select-club-services" id="start_index" name="start_index">
                                                    <option value="">Select shift timings</option>
                                                    {working_shift_details.map((working_shift_detail, key) => (<Fragment key={key}>
                                                        <option value={key}>{ucwords(working_shift_detail.name ?? '')} ({hm12(working_shift_detail.start_time)} - {hm12(working_shift_detail.end_time)})</option>
                                                    </Fragment>))}
                                                </SelectClub>
                                            </div>
                                        </div>
                                        
                                            
                                            
                                            
                                    </div>
                                    <div className="shift-main-inner-edit">
                                        
                                            
                                            
                                                
                                                    
                                                    
                                                    
                                                    
                                                    
                                                
                                            
                                        
                                            
                                            
                                                
                                                    
                                                    
                                                    
                                                    
                                                    
                                                
                                            
                                        
                                            
                                            
                                                
                                                    
                                                    
                                                    
                                                        
                                                    
                                                    
                                                
                                            
                                        <div className={`shift-inner-sub-label-edit type${rotational ? '' : ' d-none'}`}>
                                            <label className="shift-type-label">Shift timings</label>
                                            <div className="filters staff_attendance" id="working_shift_error">
                                                <SelectClub className="form-select create-select section_sub_title select-club-services" id="type" name="type">
                                                    <option value="0" selected>Daily</option>
                                                    <option value="1">Weekly</option>
                                                    <option value="2">Monthly</option>
                                                </SelectClub>
                                            </div>
                                        </div>
                                    </div>

                                    <h2 className="proxima_nova_semibold staff-pay-title">Attendance Settings</h2>
                                    
                                        
                                        
                                        
                                    
                                        
                                            
                                                
                                                    
                                                    
                                                        
                                                        
                                                        
                                                    
                                                
                                            
                                        
                                    <div className="shift-main-inner-edit">
                                        <div className="shift-inner-sub-label-edit">
                                            <div className="location-atten mb-3 mt-0">
                                                <input className="form-check-input" type="checkbox" defaultValue="1" name="is_remote" id="is_remote" />
                                                <p className="section_sub_title ">Remote Attendance Access</p>
                                            </div>
                                        </div>
                                        <div className="shift-inner-sub-label-edit">
                                            <div className="location-atten mb-3 mt-0">
                                                <input className="form-check-input" type="checkbox" defaultValue="1" name="is_auto_approve_attendance" id="is_auto_approve_attendance" />
                                                <p className="section_sub_title ">Auto Approve Attendance</p>
                                            </div>
                                        </div>
                                        <div className="shift-inner-sub-label-edit">
                                            <div className="location-atten mb-3 mt-0">
                                                <input className="form-check-input" type="checkbox" defaultValue="1" name="is_geo_fencing" id="is_geo_fencing" />
                                                <p className="section_sub_title ">Geo Fencing</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="shift-main-inner-edit" style={{ marginBottom: "24px" }}>
                                        <div className="w-full bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg p-3" style={{ backgroundColor: "#EFF6FF", border: "1px solid #DBEAFE", borderRadius: "0.5rem", padding: "1rem", width: "100%" }}>
                                            <div className="flex items-start gap-2" style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                                                <div className="text-sm" style={{ fontSize: "0.875rem", lineHeight: "1.25rem" }}>
                                                    
                                                    <div className="flex items-start gap-2 text-[#64748b]" style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", color: "#64748b" }}>
                                                        <I.I837cd4 />
                                                        <p className="leading-relaxed mb-0" style={{ fontSize: "14px" }}>This will allow employees to remotely mark their attendance and it will track their location through mobile app. Remote location will be allowed from only mobile app.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <h2 className="proxima_nova_semibold staff-pay-title">Staff Payment Details</h2>
                                    <div className="shift-main-inner-edit steff-paymeny-detail">
                                        <div className="shift-inner-sub-label-edit">

                                            <label className="shift-type-label">Salary Amount</label>
                                            <input type="number" min="0" step="any" className="form-control shift-edit-input" id="salary_amount" name="salary_amount" placeholder="Enter salary" />
                                        </div>
                                    </div>
                                </div>
                                <h2 className="proxima_nova_semibold staff-pay-title">Bank Account</h2>
                                <div className="shift-main-inner-edit steff-paymeny-detail">
                                    <div className="shift-inner-sub-label-edit">

                                        <label className="shift-type-label">Bank Name</label>
                                        <input type="text" id="bank_name" name="bank_name" className="form-control shift-edit-input" placeholder="Enter bank name" />
                                    </div>
                                    <div className="shift-inner-sub-label-edit">

                                        <label className="shift-type-label">Account Holder Name</label>
                                        <input type="text" id="account_holder_name" name="account_holder_name" className="form-control shift-edit-input" placeholder="Enter holder name" />
                                    </div>

                                </div>
                                <div className="shift-main-inner-edit steff-paymeny-detail">
                                    <div className="shift-inner-sub-label-edit">

                                        <label className="shift-type-label">Account Number</label>
                                        <input type="text" id="account_number" name="account_number" className="form-control shift-edit-input" placeholder="Enter account number" />
                                    </div>
                                    <div className="shift-inner-sub-label-edit">
                                        <label className="shift-type-label">Confirm Account Number</label>
                                        <input type="text" id="confirm_account_number" name="confirm_account_number" className="form-control shift-edit-input" placeholder="Confirm account number" />
                                    </div>
                                </div>
                                <div className="shift-main-inner-edit steff-paymeny-detail">
                                    <div className="shift-inner-sub-label-edit">

                                        <label className="shift-type-label">IFSC Code</label>
                                        <input type="text" id="IFSC_code" name="IFSC_code" className="form-control shift-edit-input" placeholder="Enter IFSC code" />
                                    </div>
                                </div>
                                <h2 className="proxima_nova_semibold staff-pay-title">UPI ID</h2>
                                <div className="shift-main-inner-edit steff-paymeny-detail">
                                    <div className="shift-inner-sub-label-edit">

                                        <label className="shift-type-label">UPI ID</label>
                                        <input type="text" id="UPI_id" name="UPI_id" className="form-control shift-edit-input" placeholder="Enter UPI ID" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" id="save_login_detail" className="create-staff-btn inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95">
                            Create Staff
                            <img className="loader" src={"/assets/admin/images/white_loader.gif"} alt="" style={{ display: busy ? 'inline-block' : 'none' }} />
                        </button>
                    </div>
                    
                        
                        
                            
                            
                        
                </form>
            </div>
        </div>
    </main>

    </>
  );
}
