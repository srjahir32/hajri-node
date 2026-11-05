'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QuickAddModal, addToCachedList } from '@/components/widgets/QuickAddModal';
import { adminApi, ApiError } from '@/lib/api';
import { toast } from '@/lib/toast';

export interface Department {
  id: number;
  name: string;
}

const NAME_MAX = 120;

type Props = { open: boolean; onClose: () => void; onCreated: (d: Department) => void; existing: Department[] };

/**
 * "Add New Department" dialog used from the staff form's Department dropdown. Creates the department through
 * POST /admin/departments, adds it to the cached department lists and hands it to `onCreated` so the caller can select it.
 * Mounted only while open, so every opening starts with an empty form.
 */
export function AddDepartmentModal(props: Props) {
  return props.open ? <Dialog {...props} /> : null;
}

function Dialog({ onClose, onCreated, existing }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState('');

  const trimmed = name.trim();
  const duplicate = trimmed !== '' && existing.some((d) => d.name.trim().toLowerCase() === trimmed.toLowerCase());
  const nameError =
    serverError ||
    (duplicate ? 'A department with this name already exists.' : trimmed.length > NAME_MAX ? `Department name must be at most ${NAME_MAX} characters.` : touched && !trimmed ? 'Department name is required.' : '');
  const valid = !!trimmed && !duplicate && trimmed.length <= NAME_MAX;

  const save = async () => {
    setServerError('');
    try {
      const res = await adminApi.post<Department>('/admin/departments', { name: trimmed });
      addToCachedList(qc, '/admin/departments', res.data, (a, b) => a.name.localeCompare(b.name));
      toast.success('Department added successfully');
      onCreated(res.data);
      return true;
    } catch (err) {
      if (err instanceof ApiError && [400, 409, 422].includes(err.status)) setServerError(err.message);
      else toast.error(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      return false;
    }
  };

  return (
    <QuickAddModal title="Add New Department" subtitle="Create a department for your organization." saveLabel="Save Department" canSave={valid} onSubmit={save} onClose={onClose}>
      <div className="quick-add-field">
        <label htmlFor="add_dept_name">
          Department Name <span className="quick-add-required">*</span>
        </label>
        <input
          id="add_dept_name"
          type="text"
          className={`quick-add-input${nameError ? ' has-error' : ''}`}
          placeholder="Enter department name"
          value={name}
          maxLength={NAME_MAX}
          autoComplete="off"
          aria-invalid={!!nameError}
          aria-describedby={nameError ? 'add_dept_name_error' : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setTouched(true);
            setServerError('');
          }}
        />
        {nameError && (
          <p id="add_dept_name_error" className="quick-add-error" role="alert">
            {nameError}
          </p>
        )}
      </div>
    </QuickAddModal>
  );
}
