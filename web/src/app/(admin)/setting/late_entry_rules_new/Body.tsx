'use client';

import { RulesEditor, type RuleKind } from '@/components/settings/RulesEditor';

const cfg: RuleKind = {
  kind: 'late-entry',
  title: 'Late Entry Rules',
  heading: 'Create a Late Entry Rule',
  cls: { wrap: 'late-entries', cont: 'late-entry-container', item: 'late-entry-item' },
  perMinute: { check: 'Deduct salary if staff is late by more than', thr: 'If Staff Takes More Late by', typeLabel: 'Deduction Type', none: 'No Late Fine for 0 mins' },
  half: { check: 'Deduct half day salary if staff is late by more than', thr: 'If Staff Takes for more than', none: 'No Break Fine for 0 mins' },
  full: { check: 'Deduct full day salary if staff is late by more than', thr: 'If Staff Takes for more than', none: 'No Break Fine for 0 mins' },
  occurrences: true,
  checkLabelCls: 'break-checkbox-label',
};

export default function Body() {
  return <RulesEditor cfg={cfg} />;
}
