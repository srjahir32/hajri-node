'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { PRIMARY_BTN } from '@/components/settings/SettingsCard';
import { navigate } from '@/lib/navigate';

const LocationPicker = dynamic(() => import('@/components/widgets/LocationPicker'), { ssr: false, loading: () => <div style={{ height: 320 }} /> });

interface Account { name: string | null; email: string | null; phone_number: string | null; photo: string | null }
interface Biz { name: string; business_address: string | null; street: string | null; city: string | null; state: string | null; country_id: number | null; latitude: number | null; longitude: number | null }
const DUMMY = '/assets/admin/images/dummy/dummy-user.svg';

export default function Body() {
  const acc = useAdmin<Account>('/admin/account');
  const biz = useAdmin<Biz>('/admin/business');
  const countries = useAdmin<{ id: number; name: string }[]>('/auth/reference/countries').data?.data ?? [];
  const [f, setF] = useState<Record<string, string>>({ name: '', business_name: '', business_address: '', street: '', city: '', state: '', country_id: '' });
  const [pos, setPos] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  useEffect(() => {
    const a = acc.data?.data;
    const b = biz.data?.data;
    if (!a || !b) return;
    setF({ name: a.name ?? '', business_name: b.name ?? '', business_address: b.business_address ?? '', street: b.street ?? '', city: b.city ?? '', state: b.state ?? '', country_id: String(b.country_id ?? '') });
    setPos({ lat: b.latitude, lng: b.longitude });
    setPreview(a.photo);
  }, [acc.data, biz.data]);
  const set = (k: string) => (e: { target: { value: string } }) => setF((c) => ({ ...c, [k]: e.target.value }));

  const save = useAction(
    async () => {
      const form = new FormData();
      form.append('name', f.name.trim());
      if (file) form.append('photo', file);
      await adminApi.form('PUT', '/admin/account', form);
      return adminApi.put('/admin/business', { name: f.business_name.trim(), business_address: f.business_address, street: f.street, city: f.city, state: f.state, country_id: f.country_id || undefined, latitude: pos.lat ?? undefined, longitude: pos.lng ?? undefined });
    },
    { success: 'Profile updated successfully', invalidate: ['/admin/account', '/admin/business', '/admin/settings', '/auth/admin/me'], onSuccess: () => window.setTimeout(() => (navigate('/setting-new')), 900) },
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.name.trim()) er.name = 'Name is required';
    if (!f.business_name.trim()) er.business_name = 'Business name is required';
    setErrs(er);
    if (!Object.keys(er).length) save.mutate();
  };
  const Err = ({ k }: { k: string }) => (errs[k] ? <span className="error error_message proxima_nova_semibold">{errs[k]}</span> : null);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const x = e.target.files?.[0];
    if (!x) return;
    setFile(x);
    setPreview(URL.createObjectURL(x));
  };
  const a = acc.data?.data;

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title="Profile Details" crumbs={['Settings', 'Account settings', 'Login details']} />
          <form id="edit_profile" noValidate className="space-y-8" onSubmit={submit}>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
              <div className="col-sm-6 profile-form-images">
                <div className="">
                  <div className="avatar-upload">
                    <div className="avatar-edit">
                      <input type="file" id="imageUpload" aria-label="Upload profile photo" accept=".png, .jpg, .jpeg" onChange={pick} />
                      <label htmlFor="imageUpload" className="imageUpload" title="Upload profile photo"><i className="fas fa-camera" aria-hidden="true"></i></label>
                    </div>
                    <div className="avatar-preview">
                      <div className="half-image">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img id="imagePreview" src={preview || DUMMY} alt="Image Preview 1" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-sm-12 profile-main-form">
                <div className="row">
                  <div className="col-sm-6 profile_col_main_field">
                    <div className="form-group">
                      <label className="profile-field-label">Your Name</label>
                      <input type="text" className="form-control profile-field" placeholder="Enter Your Name" value={f.name} onChange={set('name')} />
                      <Err k="name" />
                    </div>
                  </div>
                  <div className="col-sm-6 profile_col_main_field">
                    <div className="form-group">
                      <label className="profile-field-label">Business Name</label>
                      <input type="text" className="form-control profile-field" placeholder="Enter business name" value={f.business_name} onChange={set('business_name')} />
                      <Err k="business_name" />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-sm-6 profile_col_main_field">
                    <div className="form-group">
                      <label className="profile-field-label">Email ID</label>
                      <input type="email" className="form-control profile-field" placeholder="Enter email address" value={a?.email ?? ''} readOnly />
                    </div>
                  </div>
                  <div className="col-sm-6 profile_col_main_field">
                    <div className="form-group">
                      <label className="profile-field-label">Phone Number</label>
                      <input type="text" className="form-control profile-field" placeholder="Enter Phone Number" value={a?.phone_number ?? ''} readOnly />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-sm-6 profile_col_main_field">
                    <div className="form-group profile-business-space">
                      <label className="profile-field-label">Business Address</label>
                      <input type="text" className="form-control profile-field" placeholder="Enter Business Address" value={f.business_address} onChange={set('business_address')} />
                    </div>
                  </div>
                  <div className="col-sm-6 profile_col_main_field">
                    <div className="form-group profile-business-space">
                      <label className="profile-field-label">Street</label>
                      <input type="text" className="form-control profile-field" placeholder="Enter street" value={f.street} onChange={set('street')} />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-sm-6 profile_col_main_field">
                    <div className="form-group profile-business-space">
                      <label className="profile-field-label">City</label>
                      <input type="text" className="form-control profile-field" placeholder="Enter city" value={f.city} onChange={set('city')} />
                    </div>
                  </div>
                  <div className="col-sm-6 profile_col_main_field">
                    <div className="form-group profile-business-space">
                      <label className="profile-field-label">State</label>
                      <input type="text" className="form-control profile-field" placeholder="Enter state" value={f.state} onChange={set('state')} />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-sm-6 profile_col_main_field">
                    <div className="form-group profile-business-space">
                      <label className="profile-field-label">Country</label>
                      <select className="form-select profile-field select2" value={f.country_id} onChange={set('country_id')}>
                        <option value="">Select Country</option>
                        {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="row mt-4">
                  <div className="col-sm-12">
                    <h4 className="profile-field-label text-lg font-semibold text-gray-800">Geo Fencing</h4>
                  </div>
                  <div className="col-sm-12">
                    <LocationPicker lat={pos.lat} lng={pos.lng} onChange={(lat, lng) => setPos({ lat, lng })} />
                  </div>
                </div>
                <div className="text-end mt-4">
                  <button type="submit" className={`proxima_nova_semibold profile-edit-submit-btn ${PRIMARY_BTN}`} disabled={save.isPending}>Save Changes</button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
