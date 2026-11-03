/** Exercises the Laravel-compatible /api endpoints the way the React Native apps call them. */
const BASE = process.env.API_BASE_MOBILE ?? 'http://localhost:4000/api';
let passed = 0;
let failed = 0;
const check = (name: string, cond: unknown, detail = '') => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); } else { failed++; console.log(`  ✗ ${name} ${detail}`); }
};
async function post(path: string, body: unknown, token?: string, method = 'POST') {
  const res = await fetch(`${BASE}/${path}`, { method, headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: method === 'GET' ? undefined : JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as any;
  return { json, headers: res.headers, status: res.status };
}
const rnd = () => String(Math.floor(6_000_000_000 + Math.random() * 3_999_999_999));

(async () => {
  const phone = rnd();
  const staffPhone = rnd();

  console.log('[owner app]');
  let r = await post('login', { phone, country_code: '91' });
  check('login sends OTP', r.json.status === 1 && r.json.message === 'OTP Sent', JSON.stringify(r.json));
  r = await post('verify_otp', { phone, otp: '1234' });
  check('new user: is_register 0 and no token', r.json.is_register === 0 && !r.headers.get('authorization'));
  const userId = r.json.data.id;
  r = await post('add_business', { user_id: userId, name: 'Mobile Owner', email: 'm@example.com', business_name: 'Mobile Co', business_address: 'Ring Road', city: 'Surat', shift_hour: 8, salary_calculation: 'monthly', timezone: 'Asia/Calcutta' });
  const token = (r.headers.get('authorization') ?? '').replace('Bearer ', '');
  check('add_business returns token header', token.length > 20, JSON.stringify(r.json).slice(0, 200));
  const businessId = r.json.data?.business_user?.[0]?.business_id;
  check('user has business_user[0].business', r.json.data?.business_user?.[0]?.business?.name === 'Mobile Co');

  r = await post('add_edit_department', { name: 'Ops', business_id: businessId }, token);
  check('department insert', r.json.status === '1', JSON.stringify(r.json));
  const depId = r.json.data?.[0]?.id;
  r = await post('add_edit_department', { name: 'Ops', business_id: businessId }, token);
  check('duplicate department → status 2 (HTTP 200)', r.json.status === 2 && r.status === 200);
  r = await post('get_shift', { business_id: businessId }, token);
  const shiftId = r.json.working_shift?.[0]?.id;
  check('get_shift lists default shift with working_type', r.json.working_shift?.[0]?.working_type?.name);

  r = await post('add_edit_staff', { name: 'Ravi', middle_name: 'K', last_name: 'Shah', country_code: '91', phone_number: staffPhone, salary_amount: 18000, salary_cycle: 1, business_id: businessId, department_id: depId, working_shift_id: shiftId, is_remote: 0, auto_approve_attendance: 0, is_geo_fencing: 0, bank_name: 'SBI', account_number: '123456' }, token);
  check('add_edit_staff insert', r.json.status === '1' && Array.isArray(r.json.data), JSON.stringify(r.json).slice(0, 200));
  const staffId = r.json.data?.[0]?.id;
  check('staff has staff_bank_detail + working_shift_users', r.json.data?.[0]?.staff_bank_detail?.bank_name === 'SBI' && r.json.data?.[0]?.working_shift_users?.working_shift?.id === shiftId);
  r = await post('add_edit_staff', { name: 'Dup', middle_name: 'K', last_name: 'Shah', country_code: '91', phone_number: staffPhone, salary_amount: 1, salary_cycle: 1, business_id: businessId, department_id: depId, is_remote: 0, auto_approve_attendance: 0, is_geo_fencing: 0 }, token);
  check('duplicate phone → status 2', r.json.status === 2, JSON.stringify(r.json));

  console.log('[staff app]');
  r = await post('staff_login', { phone: staffPhone, country_code: '91' });
  check('staff_login', r.json.status === 1);
  r = await post('staff_verify_otp', { phone: staffPhone, otp: '1234' });
  check('staff_verify_otp lists businesses', r.json.data?.[0]?.business?.name === 'Mobile Co', JSON.stringify(r.json));
  r = await post('set_business', { staff_id: staffId, fcm_id: 'fcm-token' });
  const staffToken = (r.headers.get('authorization') ?? '').replace('Bearer ', '');
  check('set_business returns token', staffToken.length > 20);
  r = await post('set_business', { staff_id: staffId });
  check('set_business cannot be replayed without OTP', r.status === 401, String(r.status));

  r = await post('add_staff_attendance', { staff_id: staffId, time: '09:00:00', status: 1, date: new Date().toISOString().slice(0, 10), is_manual: 0, latitude: '21.1', longitude: '72.8', timezone: 'Asia/Kolkata' }, staffToken);
  check('add_staff_attendance punch in', r.json.action === 'punch_in', JSON.stringify(r.json));
  r = await post('add_staff_attendance', { staff_id: staffId + 999, time: '09:00:00', status: 1, date: '2026-01-01', is_manual: 0 }, staffToken);
  check('cannot punch for another staff', r.status === 403);

  const now = new Date();
  r = await post('get_staff_attendance', { month: now.getUTCMonth() + 1, year: now.getUTCFullYear(), staff_id: staffId, business_id: businessId }, staffToken);
  check('get_staff_attendance count + rows', r.json.count?.present_count >= 1 && r.json.attendance?.length >= 1, JSON.stringify(r.json).slice(0, 200));
  r = await post('get_last_attendance', { staff_id: staffId, date: now.toISOString().slice(0, 10) }, staffToken);
  check('get_last_attendance', r.json.data?.in_time);
  r = await post('get_staff_leave_cards', { staff_id: staffId }, staffToken);
  check('leave cards', r.json.status === 1);
  r = await post('staff_holiday_list', { business_id: businessId }, staffToken);
  check('holiday list', r.json.status === '1');
  r = await post('live_location', { staff_id: staffId, business_id: businessId, date: now.toISOString().slice(0, 10), location: [{ latitude: '21.1', longitude: '72.8', accuracy: '5', battery_percentage: 80, date: now.toISOString().slice(0, 10), time: '09:05:00' }] }, staffToken);
  check('live_location stored', r.json.status === 1);
  r = await post('get_live_location_count', { staff_id: staffId, date: now.toISOString().slice(0, 10) }, staffToken);
  check('live location count ≥ 2 (punch + tracked)', r.json.count >= 2, String(r.json.count));

  console.log('[owner app again]');
  const today = now.toISOString().slice(0, 10);
  r = await post('get_attendance', { date: today, business_id: businessId }, token);
  check('get_attendance counts present', r.json.count?.present_count === 1 && r.json.data?.[0]?.attendance?.length === 1, JSON.stringify(r.json.count));
  r = await post('get_staff', { business_id: businessId, page: 1 }, token);
  check('get_staff paginated list', r.json.data?.length === 1 && r.json.present_count === 1 && r.json.last_page === 1, JSON.stringify(r.json).slice(0, 160));
  r = await post('staff_records', { business_id: businessId }, token);
  check('staff_records', r.json.present_staff?.length === 1);
  r = await post('get_live_location', { business_id: businessId, current_day: today }, token);
  check('get_live_location', r.json.locations?.length === 1);
  r = await post('get_staff', { business_id: 999999 }, token);
  check("cannot read another business", r.json.status === 0);
  r = await post('notifications', { page: 1 }, token);
  check('notifications', r.json.status === 1);
  r = await post('months_attendance_chart', { start_month: today.slice(0, 7) + '-01', business_id: businessId }, token);
  check('chart data', Array.isArray(r.json.present_statusData));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
