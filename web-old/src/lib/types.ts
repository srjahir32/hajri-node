// Response shapes returned by the Hajri API (snake_case, as sent over the wire).

export interface BusinessDto {
  id: number;
  name: string;
  business_address: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  country_id: number | null;
  country: string | null;
  category_id: number | null;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  bank_account: string | null;
  logo: string | null;
  salary_duration: 'daily' | 'monthly' | null;
  shift_hour: number;
  is_active: boolean;
}

export interface UserDto {
  id: number;
  name: string | null;
  email: string | null;
  country_code: string | null;
  phone_number: string;
  photo: string | null;
  is_sub_admin: boolean;
  owner_id: number | null;
  is_active: boolean;
  trial_ends_at: string | null;
}

export interface AdminSession {
  token: string;
  is_register: boolean;
  user: UserDto;
  permissions: string[];
  businesses: BusinessDto[];
  current_business_id: number | null;
  subscription: { trial_expired: boolean; has_active_subscription: boolean; trial_ends_at: string | null };
}

export interface StaffSession {
  token: string;
  staff: {
    id: number;
    name: string;
    middle_name: string | null;
    last_name: string | null;
    email: string | null;
    country_code: string | null;
    phone_number: string;
    timezone: string | null;
    department: { id: number; name: string } | null;
    business: { id: number; name: string; business_address: string | null } | null;
    business_id: number;
    photo: string | null;
    is_remote: number;
    is_geo_fencing: number;
    shift: { working_shift_id: number; name: string | null; shift_type_id: number } | null;
  };
  subscription: { trial_expired: boolean; message: string | null } | null;
}

export interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface Punch {
  id: number;
  staff_id: number;
  date: string;
  in_time: string | null;
  out_time: string | null;
  in_at: string | null;
  out_at: string | null;
  total_time: string;
  break_time: string | null;
  total_seconds: number;
  break_seconds: number;
  status: string;
  attendance_status: number;
  is_manual: number;
  behavior: string | null;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface DaySummary {
  date: string;
  status: string;
  is_leave: 0 | 1;
  leave_type: string | null;
  holiday: { isHoliday: boolean; type: string | null; name: string | null } | null;
  approval: number | null;
  first_in: string | null;
  last_out: string | null;
  total_seconds: number;
  break_seconds: number;
  overtime_seconds: number;
  shortfall_seconds: number;
  payable_seconds: number;
  behavior: string | null;
  note: string | null;
  punches: Punch[];
}

export interface StaffCard {
  id: number;
  name: string;
  full_name: string;
  phone_number: string;
  department_id: number | null;
  department: { id: number; name: string } | null;
  photo: string | null;
  is_remote: number;
}

export type DayRow = StaffCard & DaySummary;

export interface DayCounts {
  staff_count: number;
  present_count: number;
  absent_count: number;
  halfday_count: number;
  leave_count: number;
  pending_count: number;
  late_count: number;
  not_marked_count: number;
}

export interface LeaveDto {
  id: number;
  staff_id: number;
  leave_type: string;
  shift_type: string | null;
  is_unpaid: number;
  leave_policy_id: number | null;
  reason: string | null;
  start_date: string;
  end_date: string;
  status: number;
  apply_status: string;
  requested_date: string;
  staff?: { id: number; name: string; phone_number: string; department: string | null; photo: string | null };
}

export interface LeaveCard {
  policy_id: number;
  template_name: string;
  leave_policy_cycle: string;
  period_text: string;
  is_carry_forward: 0 | 1;
  carry_forward_label: string;
  monthly_rate: number;
  total_period_balance: number;
  accrued_to_date: number;
  total_used: number;
  remaining_balance: number;
  remaining_label: string;
  progress_percent: number;
}

export interface Department {
  id: number;
  name: string;
  is_shared: boolean;
  staff_count: number;
}

export interface ShiftDetail {
  id: number;
  name: string | null;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number;
  total_payable_hours: number;
}

export interface Shift {
  id: number;
  name: string | null;
  shift_type_id: 1 | 2 | 3;
  shift_type: string;
  staff_count: number;
  details: ShiftDetail[];
}

export interface PayrollCalc {
  staff_id: number;
  month: number;
  year: number;
  salary_amount: number;
  salary_mode: 'daily' | 'monthly';
  working_days: number;
  holiday_days: number;
  present_days: number;
  half_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  worked_seconds: number;
  regular_seconds: number;
  overtime_seconds: number;
  payable_seconds_per_day: number;
  per_hour_salary: number;
  per_day_salary: number;
  base_salary: number;
  paid_leave_salary: number;
  overtime_salary: number;
  break_deduction: number;
  late_deduction: number;
  early_deduction: number;
  late_occurrences: number;
  early_occurrences: number;
  pf_cut: number;
  eps_amount: number;
  epf_amount: number;
  gross_salary: number;
  total_deduction: number;
  net_salary: number;
}

export interface PayrollRow {
  id: number;
  staff_code: string;
  name: string;
  phone_number: string;
  department_id: number | null;
  department: string | null;
  photo: string | null;
  salary_amount: number;
  processed: boolean;
  attendance_reviewed: boolean;
  total_pay_reviewed: boolean;
  payroll: Record<string, number | string> | null;
  preview: PayrollCalc | null;
  net_salary: number;
  worked_seconds: number;
  overtime_seconds: number;
}

export interface NotificationDto {
  id: number;
  title: string;
  message: string | null;
  action: string | null;
  action_id: number | null;
  read: boolean;
  created_at: string;
}
