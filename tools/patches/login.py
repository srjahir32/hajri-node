import re,sys
p=sys.argv[1]
s=open(p).read()
s=s.replace("""import { count } from '@/lib/blade';
import '@/styles/a-admin-login.css';

export default function Body() {
  return (""","""import { useEffect, useState } from 'react';
import { adminApi, tokens, business, ApiError } from '@/lib/api';
import { toast } from '@/lib/toast';
import { PhoneOtp, finishAdminLogin } from '@/components/auth/PhoneOtp';
import '@/styles/a-admin-login.css';

interface Country { id: number; name: string }
const DURATIONS = [{ value: 'daily', label: 'Daily' }, { value: 'hourly', label: 'Hourly' }];

export default function Body() {
  const [step, setStep] = useState(1);
  const [countries, setCountries] = useState<Country[]>([]);
  const [busy, setBusy] = useState(false);
  const [durOpen, setDurOpen] = useState(false);
  const [f, setF] = useState<Record<string, string>>({ shift_hour: '08:30', shift_name: '', salary_duration: '' });
  const set = (k: string) => (e: { target: { value: string } }) => setF((c) => ({ ...c, [k]: e.target.value }));

  useEffect(() => {
    adminApi.get<Country[]>('/auth/reference/countries').then((r) => setCountries(r.data)).catch(() => {});
    // verified earlier but business not created yet -> continue at step 2
    if (!tokens.get('admin')) return;
    adminApi.get<{ is_register: boolean }>('/auth/admin/me').then((r) => (r.data.is_register ? (window.location.href = '/dashboard-new') : setStep(2))).catch(() => tokens.clear('admin'));
  }, []);

  const next2 = () => {
    for (const [k, label] of [['name', 'Your Name'], ['business_name', 'Business Name'], ['email', 'Email ID'], ['business_address', 'Business Address']] as const) {
      if (!f[k]?.trim()) return toast.error(`${label} is required`);
    }
    if (!/^\\S+@\\S+\\.\\S+$/.test(f.email)) return toast.error('Enter a valid email');
    setStep(3);
  };
  const finish = async () => {
    if (!f.shift_name?.trim()) return toast.error('Shift name is required');
    if (!f.salary_duration) return toast.error('Select salary duration');
    const [h, m] = (f.shift_hour || '08:30').split(':').map(Number);
    setBusy(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await adminApi.post<{ business?: { id: number }; id?: number }>('/auth/admin/register-business', {
        name: f.name, email: f.email, business_name: f.business_name, business_address: f.business_address,
        street: f.street || undefined, city: f.city || undefined, state: f.state || undefined,
        country_id: f.country_id ? Number(f.country_id) : undefined,
        salary_duration: f.salary_duration, shift_hour: h + m / 60, shift_name: f.shift_name, timezone: tz,
      });
      const b = res.data.business?.id ?? res.data.id;
      if (b) business.set(b);
      window.location.href = '/dashboard-new';
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };
  const tabs = (i: number, on: string) => (i < step ? on : '');
  return (""")
def nav(block_id, cls):
    global s
    m=re.search(r'(<ul className="navigation_tabs" id="%s">)(.*?)(</ul>)'%block_id,s,flags=re.S)
    body=m.group(2)
    idx=[0]
    def li(mm):
        i=idx[0]; idx[0]+=1
        return '<li className={tabs(%d, "%s")}>'%(i,cls)
    body=re.sub(r'<li className="[^"]*">',li,body)
    s=s[:m.start(2)]+body+s[m.end(2):]
nav('navigation_tabs','tab_active'); nav('navigation_tabs_mobile','tab_actives')
a=s.index('<div className="hajri-right step" id="step-1">')
b=s.index('<div className="hajri-right step" id="step-2">')
s=s[:a]+'<div style={{ display: step === 1 ? \'\' : \'none\' }}><PhoneOtp onVerified={(x) => (x.is_register ? finishAdminLogin(x) : (tokens.set(\'admin\', x.token), setStep(2)))} title="Your Details" subtitle="Provide your mobile number" phoneButton="Submit" contactHref="mailto:hi@hajri.app" /></div>\n                        '+s[b:]
s=s.replace('<div className="hajri-right step" id="step-2">','<div className="hajri-right step" id="step-2" style={{ display: step === 2 ? \'\' : \'none\' }}>')
s=s.replace('<div className="hajri-right step" id="step-3">','<div className="hajri-right step" id="step-3" style={{ display: step === 3 ? \'\' : \'none\' }}>')
s=s.replace('<span className="dot active" id="dot-1"></span>','<span className={`dot${step === 1 ? \' active\' : \'\'}`} id="dot-1"></span>').replace('<span className="dot" id="dot-2"></span>','<span className={`dot${step === 2 ? \' active\' : \'\'}`} id="dot-2"></span>').replace('<span className="dot" id="dot-3"></span>','<span className={`dot${step === 3 ? \' active\' : \'\'}`} id="dot-3"></span>')
for name in ['name','business_name','email','business_address','street','city','state','shift_name','shift_hour']:
    s=re.sub(r'(<input [^>]*?name="%s"[^>]*?)( defaultValue="[^"]*")?(\s*/>)'%name, lambda m: m.group(1)+' value={f.%s ?? \'\'} onChange={set(\'%s\')}'%(name,name)+m.group(3), s)
s=s.replace('<select className="form-select select2 input-field-form" id="country_id" name="country_id" style={{ width: "100%" }}>','<select className="form-select select2 input-field-form" id="country_id" name="country_id" style={{ width: "100%" }} value={f.country_id ?? \'\'} onChange={set(\'country_id\')}>')
s=s.replace('className="hajri-continue-btn hajri-submit-btn step-2-continue-button">Continue','className="hajri-continue-btn hajri-submit-btn step-2-continue-button" onClick={next2}>Continue')
s=s.replace('className="hajri-continue-btn hajri-submit-btn step-3-button">Continue','className="hajri-continue-btn hajri-submit-btn step-3-button" onClick={finish} disabled={busy}>Continue')
s=re.sub(r'<select className="form-select create-select section_sub_title select-club-services" id="salary_duration" name="salary_duration">.*?</select>','''<div className={`select-club-services selectDropdown${durOpen ? ' open' : ''}${f.salary_duration ? ' filled' : ''}`}>
                                                        <select className="form-select create-select section_sub_title select-club-services" id="salary_duration" name="salary_duration" value={f.salary_duration} onChange={set('salary_duration')}>
                                                            <option value="">Select Salary Duration</option>
                                                            {DURATIONS.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
                                                        </select>
                                                        <span onClick={() => setDurOpen((o) => !o)}>{DURATIONS.find((d) => d.value === f.salary_duration)?.label ?? 'Select Salary Duration'}</span>
                                                        <ul>
                                                            {DURATIONS.map((d) => (<li key={d.value} className={f.salary_duration === d.value ? 'active' : ''}><a data-id={d.value} onClick={(e) => { e.preventDefault(); setF((c) => ({ ...c, salary_duration: d.value })); setDurOpen(false); }}>{d.label}</a></li>))}
                                                        </ul>
                                                    </div>''',s,flags=re.S)
s=s.replace("/assets/admin/images/white_loader.gif","/assets/admin/images/white_loader.svg")
s=s.replace("(country->id)","country.id").replace("(country->name)","country.name")
open(p,'w').write(s)
