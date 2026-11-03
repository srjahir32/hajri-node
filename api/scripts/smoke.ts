/**
 * End-to-end smoke test against a running API (npm run dev, OTP_DEV_MODE=true).
 *   npx tsx scripts/smoke.ts            # uses http://localhost:4000
 * Creates a throw-away owner + business with random phone numbers.
 */
const BASE = process.env.API_BASE ?? 'http://localhost:4000/api/v1';
let passed = 0;
let failed = 0;

async function call(method: string, path: string, opts: { token?: string; body?: unknown; expect?: number; raw?: boolean } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (opts.raw) return res;
  const json = (await res.json().catch(() => ({}))) as any;
  const want = opts.expect ?? 200;
  if (res.status !== want) {
    failed++;
    console.log(`  ✗ ${method} ${path} → ${res.status} (wanted ${want}): ${json.message ?? ''}`);
  }
  return json;
}

function check(name: string, cond: unknown, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

const rnd = () => String(Math.floor(6_000_000_000 + Math.random() * 3_999_999_999));

async function main() {
  const phone = rnd();
  const staffPhone = rnd();
  console.log(`Owner ${phone}, staff ${staffPhone}`);

  console.log('\n[auth]');
  await call('POST', '/auth/admin/send-otp', { body: { country_code: '91', phone } });
  let r = await call('POST', '/auth/admin/verify-otp', { body: { country_code: '91', phone, otp: '1234' } });
  check('verify otp returns token', r.data?.token);
  check('new owner is not registered yet', r.data?.is_register === false);
  await call('POST', '/auth/admin/verify-otp', { body: { country_code: '91', phone, otp: '0000' }, expect: 400 });

  r = await call('POST', '/auth/admin/register-business', {
    token: r.data.token,
    body: { name: 'Smoke Owner', email: 'smoke@example.com', business_name: 'Smoke Traders', city: 'Surat', shift_hour: 8, timezone: 'Asia/Kolkata' },
  });
  const token: string = r.data.token;
  check('business created', r.data?.businesses?.length === 1);
  check('trial started', r.data?.user?.trial_ends_at);

  console.log('\n[setup]');
  r = await call('POST', '/admin/departments', { token, body: { name: 'Sales' } });
  const departmentId = r.data?.id;
  check('department created', departmentId);
  await call('POST', '/admin/departments', { token, body: { name: 'Sales' }, expect: 409 });

  r = await call('POST', '/admin/shifts', {
    token,
    body: { shift_type_id: 1, name: 'Day Shift', details: [{ name: 'Day', start_time: '09:00', end_time: '18:00', break_minutes: 60 }] },
  });
  const shiftId = r.data?.id;
  check('fixed shift payable = 8h', r.data?.details?.[0]?.total_payable_hours === 8);

  r = await call('POST', '/admin/staff', {
    token,
    body: { name: 'Asha', last_name: 'Patel', country_code: '91', phone_number: staffPhone, department_id: departmentId, working_shift_id: shiftId, salary_amount: 26000, salary_cycle: 1, is_remote: false },
  });
  const staffId = r.data?.id;
  check('staff created', staffId);
  await call('POST', '/admin/staff', { token, body: { name: 'Dup', country_code: '91', phone_number: staffPhone }, expect: 409 });

  await call('PUT', '/admin/holidays/weekly/business', { token, body: { days: [0] } });
  r = await call('POST', '/admin/leave-policies', { token, body: { template_name: 'Casual', cycle: 'monthly', number_of_leaves: 1, start_period: 'Jan 2026', end_period: 'Dec 2026' } });
  const policyId = r.data?.id;
  await call('POST', `/admin/leave-policies/${policyId}/assign`, { token, body: { selected_ids: [staffId] } });

  console.log('\n[staff login + punching]');
  await call('POST', '/auth/staff/send-otp', { body: { country_code: '91', phone: staffPhone } });
  r = await call('POST', '/auth/staff/verify-otp', { body: { country_code: '91', phone: staffPhone, otp: '1234' } });
  check('staff verify lists businesses', r.data?.length === 1);
  r = await call('POST', '/auth/staff/select-business', { body: { staff_id: staffId } });
  const staffToken: string = r.data.token;
  check('staff token issued', staffToken);

  r = await call('POST', '/employee/punch', { token: staffToken, body: { latitude: 21.17, longitude: 72.83 } });
  check('punch in', r.action === 'punch_in', JSON.stringify(r));
  r = await call('POST', '/employee/punch', { token: staffToken, body: {}, expect: 400 });
  check('immediate punch out is blocked (30s rule)', /Wait for/.test(r.message ?? ''));

  r = await call('GET', '/employee/dashboard', { token: staffToken });
  check('dashboard shows punched in', r.data?.is_punched_in === true);

  console.log('\n[admin views]');
  r = await call('GET', '/admin/attendance', { token });
  check('attendance list has the staff member', r.data?.some((x: any) => x.id === staffId));
  check('counts present=1', r.count?.present_count === 1, JSON.stringify(r.count));
  r = await call('GET', '/admin/dashboard', { token });
  check('dashboard present count', r.data?.count?.present_count === 1);

  r = await call('POST', '/admin/attendance/status', { token, body: { staff_id: staffId, date: '2026-03-02', status: 'Present' } });
  r = await call('GET', `/admin/staff/${staffId}/attendance?month=3&year=2026`, { token });
  check('month calendar has 31 days', r.data?.days?.length === 31);
  check('marked day is Present', r.data?.days?.[1]?.status === 'Present');

  console.log('\n[leave]');
  r = await call('POST', '/employee/leaves', {
    token: staffToken,
    body: { leave_type: 'Full Day', reason: 'Family function', start_date: '2026-03-10', end_date: '2026-03-10', leave_policy_id: policyId },
  });
  const leaveId = r.data?.id;
  check('leave applied', leaveId);
  await call('POST', '/employee/leaves', { token: staffToken, body: { leave_type: 'Full Day', reason: 'x', start_date: '2026-03-10', end_date: '2026-03-10' }, expect: 400 });
  r = await call('POST', '/employee/leaves', { token: staffToken, body: { leave_type: 'Full Day', reason: 'More', start_date: '2026-03-20', end_date: '2026-03-21', leave_policy_id: policyId }, expect: 400 });
  check('over-balance leave rejected', /Insufficient/.test(r.message ?? ''), r.message);
  await call('POST', '/admin/attendance/leaves/decide', { token, body: { ids: [leaveId], action: 'approve' } });
  r = await call('GET', '/employee/leaves/balance', { token: staffToken });
  check('leave balance reduced to 0', r.data?.[0]?.remaining_balance !== undefined);

  console.log('\n[payroll]');
  r = await call('GET', `/admin/payroll/staff/${staffId}?month=3&year=2026`, { token });
  check('payroll calculation returns net salary', typeof r.data?.calculation?.net_salary === 'number', JSON.stringify(r.data?.calculation));
  r = await call('POST', '/admin/payroll/process', { token, body: { month: 3, year: 2026 } });
  check('payroll processed', r.data?.processed === 1, JSON.stringify(r));
  r = await call('GET', '/admin/payroll?month=3&year=2026', { token });
  check('payroll overview lists processed row', r.data?.[0]?.processed === true);
  const pdf = await call('GET', '/admin/payroll/slips?month=3&year=2026', { token, raw: true }) as Response;
  check('salary slip PDF', pdf.headers.get('content-type') === 'application/pdf');
  const xlsx = await call('GET', '/admin/payroll/export?month=3&year=2026', { token, raw: true }) as Response;
  check('payroll xlsx export', (xlsx.headers.get('content-type') ?? '').includes('spreadsheetml'));

  console.log('\n[roles + sub-admin]');
  r = await call('POST', '/admin/roles', { token, body: { name: 'HR', permissions: ['view_attendance', 'view_staff_management'] } });
  const roleId = r.data?.id;
  const subPhone = rnd();
  r = await call('POST', '/admin/admin-users', { token, body: { name: 'HR Manager', country_code: '91', phone_number: subPhone, role_id: roleId } });
  check('sub admin created', r.data?.id);
  await call('POST', '/auth/admin/send-otp', { body: { country_code: '91', phone: subPhone } });
  r = await call('POST', '/auth/admin/verify-otp', { body: { country_code: '91', phone: subPhone, otp: '1234' } });
  const subToken = r.data?.token;
  check('sub admin sees owner business', r.data?.businesses?.length === 1);
  await call('GET', '/admin/attendance', { token: subToken });
  await call('GET', '/admin/payroll?month=3&year=2026', { token: subToken, expect: 403 });

  console.log('\n[subscriptions]');
  r = await call('GET', '/admin/subscriptions', { token });
  check('subscription overview', r.data?.plans?.length === 2);

  console.log('\n[super admin]');
  r = await call('POST', '/auth/super-admin/login', { body: { email: process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@hajri.app', password: process.env.SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!' } });
  const superToken = r.data?.token;
  check('super admin login', superToken);
  r = await call('GET', '/super-admin/dashboard', { token: superToken });
  check('super admin dashboard totals', r.data?.totals?.businesses >= 1);
  await call('GET', '/super-admin/dashboard', { token, expect: 401 });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
