'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QuickAddModal, addToCachedList } from '@/components/widgets/QuickAddModal';
import { payable } from '@/components/settings/ShiftForm';
import { adminApi, ApiError } from '@/lib/api';
import { useAdmin } from '@/lib/query';
import { toast } from '@/lib/toast';

/** A row of GET/POST /admin/shifts, as the staff form uses it. */
export interface Shift {
  id: number;
  name: string;
  shift_type_id: number;
  shift_type: string;
  details: { name: string | null; start_time: string; end_time: string }[];
}

interface Timing {
  key: number;
  name: string;
  start: string;
  end: string;
  breakMin: number;
}

const NAME_MAX = 120;
const BREAKS = [0, 10, 15, 20, 30, 45, 60, 90, 120];
const TYPE_HINT: Record<number, string> = {
  1: 'Same timing every day',
  2: 'Staff rotate between timings',
  3: 'Fixed hours, any timing',
};
const FALLBACK_TYPES = [
  { id: 1, name: 'Fixed Shift' },
  { id: 2, name: 'Rotational Shift' },
  { id: 3, name: 'Flexible Shift' },
];

let seq = 0;
const blank = (): Timing => ({ key: ++seq, name: '', start: '', end: '', breakMin: 0 });
const breakLabel = (m: number) => (m === 0 ? 'No break' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}`);
const zeroHours = (start: string, end: string, breakMin: number) => !!start && !!end && payable(start, end, breakMin) === '00:00 Hrs';

type Props = { open: boolean; onClose: () => void; onCreated: (s: Shift) => void; existing: Shift[] };

/**
 * "Add New Shift" dialog used from the staff form's Shift dropdown. Creates the shift through POST /admin/shifts (same
 * payload as Settings → Shift Settings → Create Shift), adds it to the cached shift lists and hands it to `onCreated`.
 * Mounted only while open, so every opening starts with an empty form.
 */
export function AddShiftModal(props: Props) {
  return props.open ? <Dialog {...props} /> : null;
}

function Dialog({ onClose, onCreated, existing }: Props) {
  const qc = useQueryClient();
  const apiTypes = useAdmin<{ id: number; name: string }[]>('/auth/reference/shift-types').data?.data;
  const types = apiTypes?.length ? apiTypes : FALLBACK_TYPES;
  const [name, setName] = useState('');
  const [type, setType] = useState(1);
  const [fixed, setFixed] = useState<Timing>(blank);
  const [rot, setRot] = useState<Timing[]>(() => [blank(), blank()]);
  const [hours, setHours] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState('');

  const touch = (k: string) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
  const patchRot = (key: number, p: Partial<Timing>) => setRot((r) => r.map((x) => (x.key === key ? { ...x, ...p } : x)));

  // ── validation (live; "required" messages only once the field was touched) ──
  const trimmed = name.trim();
  const errors: Record<string, string> = {};
  if (!trimmed) errors.name = 'Shift name is required.';
  else if (existing.some((s) => s.name.trim().toLowerCase() === trimmed.toLowerCase())) errors.name = 'A shift with this name already exists.';
  const timingErrors = (t: Timing, p: string, needName: boolean) => {
    if (needName && !t.name.trim()) errors[`${p}name`] = 'Timing name is required.';
    if (!t.start) errors[`${p}start`] = 'Start time is required.';
    if (!t.end) errors[`${p}end`] = 'End time is required.';
    if (zeroHours(t.start, t.end, t.breakMin)) errors[`${p}break`] = 'Break is longer than the shift.';
  };
  if (type === 1) timingErrors(fixed, 'f', false);
  if (type === 2) rot.forEach((t) => timingErrors(t, `r${t.key}`, true));
  if (type === 3) {
    if (!hours) errors.hours = 'Working hours are required.';
    else if (hours < '00:30') errors.hours = 'Working hours must be at least 30 minutes.';
  }
  const valid = Object.keys(errors).length === 0;
  // duplicate / zero-hour problems show straight away; "required" ones after the field was touched
  const err = (k: string) => (errors[k] && (touched[k] || !errors[k].endsWith('required.')) ? errors[k] : '');

  const save = async () => {
    setFormError('');
    const det = (t: Timing, n: string) => ({ name: n, start_time: `${t.start}:00`, end_time: `${t.end}:00`, break_minutes: t.breakMin });
    const body =
      type === 1
        ? { shift_type_id: 1, name: trimmed, details: [det(fixed, trimmed)] }
        : type === 2
          ? { shift_type_id: 2, name: trimmed, details: rot.map((t) => det(t, t.name.trim())) }
          : { shift_type_id: 3, name: trimmed, working_hours: hours };
    try {
      const res = await adminApi.post<Shift>('/admin/shifts', body);
      addToCachedList(qc, '/admin/shifts', res.data);
      toast.success('Shift added successfully');
      onCreated(res.data);
      return true;
    } catch (e) {
      if (e instanceof ApiError && [400, 409, 422].includes(e.status)) setFormError(e.message);
      else toast.error(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      return false;
    }
  };

  const fieldError = (k: string) => {
    const m = err(k);
    return m ? <p className="quick-add-error" role="alert">{m}</p> : null;
  };
  const timeInput = (id: string, value: string, set: (v: string) => void, k: string, label: string) => (
    <input id={id} type="time" aria-label={label} className={`quick-add-input${err(k) ? ' has-error' : ''}`} value={value} onChange={(e) => { set(e.target.value); touch(k); }} onBlur={() => touch(k)} />
  );
  const breakSelect = (id: string, value: number, set: (m: number) => void, label: string) => (
    <select id={id} aria-label={label} className="quick-add-input quick-add-select-input" value={value} onChange={(e) => set(Number(e.target.value))}>
      {BREAKS.map((m) => <option key={m} value={m}>{breakLabel(m)}</option>)}
    </select>
  );

  return (
    <QuickAddModal title="Add New Shift" subtitle="Create a shift and set its working timings." icon="fa-clock" saveLabel="Save Shift" canSave={valid} onSubmit={save} onClose={onClose} wide>
      {formError && <div className="quick-add-alert" role="alert">{formError}</div>}

      <div className="quick-add-field">
        <label htmlFor="add_shift_name">
          Shift Name <span className="quick-add-required">*</span>
        </label>
        <input
          id="add_shift_name"
          type="text"
          className={`quick-add-input${err('name') ? ' has-error' : ''}`}
          placeholder="Enter shift name, e.g. Morning Shift"
          value={name}
          maxLength={NAME_MAX}
          autoComplete="off"
          onChange={(e) => { setName(e.target.value); touch('name'); setFormError(''); }}
        />
        {fieldError("name")}
      </div>

      <div className="quick-add-field">
        <span className="quick-add-label" id="add_shift_type_label">
          Shift Type <span className="quick-add-required">*</span>
        </span>
        <div className="quick-add-segments" role="radiogroup" aria-labelledby="add_shift_type_label">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={type === t.id}
              className={`quick-add-segment${type === t.id ? ' is-active' : ''}`}
              onClick={() => { setType(t.id); setFormError(''); }}
            >
              <span className="quick-add-segment-title">{t.name}</span>
              {TYPE_HINT[t.id] && <span className="quick-add-segment-hint">{TYPE_HINT[t.id]}</span>}
            </button>
          ))}
        </div>
      </div>

      {type === 1 && (
        <div className="quick-add-field">
          <div className="quick-add-grid quick-add-grid-3">
            <div>
              <label htmlFor="add_shift_start">Start Time <span className="quick-add-required">*</span></label>
              {timeInput('add_shift_start', fixed.start, (v) => setFixed((f) => ({ ...f, start: v })), 'fstart', 'Start time')}
              {fieldError("fstart")}
            </div>
            <div>
              <label htmlFor="add_shift_end">End Time <span className="quick-add-required">*</span></label>
              {timeInput('add_shift_end', fixed.end, (v) => setFixed((f) => ({ ...f, end: v })), 'fend', 'End time')}
              {fieldError("fend")}
            </div>
            <div>
              <label htmlFor="add_shift_break">Unpaid Break</label>
              {breakSelect('add_shift_break', fixed.breakMin, (m) => setFixed((f) => ({ ...f, breakMin: m })), 'Unpaid break')}
            </div>
          </div>
          {fieldError("fbreak")}
          <div className="quick-add-payable">
            Total payable hours <strong>{payable(fixed.start, fixed.end, fixed.breakMin)}</strong>
          </div>
        </div>
      )}

      {type === 2 && (
        <div className="quick-add-field">
          <span className="quick-add-label">Shift Timings <span className="quick-add-optional">(at least two)</span></span>
          <div className="quick-add-timings">
            {rot.map((t, i) => {
              const p = `r${t.key}`;
              return (
                <div className="quick-add-timing" key={t.key}>
                  <div className="quick-add-timing-head">
                    <span>Timing {i + 1}</span>
                    {rot.length > 2 && (
                      <button type="button" className="quick-add-icon-btn" aria-label={`Remove timing ${i + 1}`} onClick={() => setRot((r) => r.filter((x) => x.key !== t.key))}>
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    )}
                  </div>
                  <div className="quick-add-grid quick-add-grid-4">
                    <div>
                      <label htmlFor={`${p}_name`}>Name <span className="quick-add-required">*</span></label>
                      <input id={`${p}_name`} type="text" className={`quick-add-input${err(`${p}name`) ? ' has-error' : ''}`} placeholder="e.g. Morning" value={t.name} maxLength={NAME_MAX} onChange={(e) => { patchRot(t.key, { name: e.target.value }); touch(`${p}name`); }} onBlur={() => touch(`${p}name`)} />
                      {fieldError(`${p}name`)}
                    </div>
                    <div>
                      <label htmlFor={`${p}_start`}>Start <span className="quick-add-required">*</span></label>
                      {timeInput(`${p}_start`, t.start, (v) => patchRot(t.key, { start: v }), `${p}start`, `Timing ${i + 1} start time`)}
                      {fieldError(`${p}start`)}
                    </div>
                    <div>
                      <label htmlFor={`${p}_end`}>End <span className="quick-add-required">*</span></label>
                      {timeInput(`${p}_end`, t.end, (v) => patchRot(t.key, { end: v }), `${p}end`, `Timing ${i + 1} end time`)}
                      {fieldError(`${p}end`)}
                    </div>
                    <div>
                      <label htmlFor={`${p}_break`}>Break</label>
                      {breakSelect(`${p}_break`, t.breakMin, (m) => patchRot(t.key, { breakMin: m }), `Timing ${i + 1} unpaid break`)}
                    </div>
                  </div>
                  {fieldError(`${p}break`)}
                  <div className="quick-add-payable">
                    Payable <strong>{payable(t.start, t.end, t.breakMin)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="quick-add-link-btn" onClick={() => setRot((r) => [...r, blank()])}>
            <i className="fa-solid fa-plus"></i> Add another timing
          </button>
        </div>
      )}

      {type === 3 && (
        <div className="quick-add-field">
          <label htmlFor="add_shift_hours">
            Working Hours <span className="quick-add-required">*</span>
          </label>
          <input
            id="add_shift_hours"
            type="time"
            className={`quick-add-input quick-add-input-narrow${err('hours') ? ' has-error' : ''}`}
            value={hours}
            onChange={(e) => { setHours(e.target.value); touch('hours'); }}
            onBlur={() => touch('hours')}
          />
          <p className="quick-add-hint">Hours staff must work in a day (HH:MM), at any time.</p>
          {fieldError("hours")}
        </div>
      )}
    </QuickAddModal>
  );
}
