'use client';

import { RulesEditor, type RuleKind } from '@/components/settings/RulesEditor';

const cfg: RuleKind = {
  kind: 'break',
  title: 'Break Rules',
  heading: 'Create an Break Rules',
  cls: { wrap: 'breaks', cont: 'break-container', item: 'break-item' },
  perMinute: { check: 'Deduct salary if staff is break by more than', thr: 'If Staff Takes More Break by', typeLabel: 'Deduction Type', none: 'No Break Fine for 0 mins' },
  half: { check: 'Deduct half day salary if staff is break by more than', thr: 'If Staff Takes for more than', none: 'No Break Fine for 0 mins' },
  full: { check: 'Deduct full day salary if staff is break by more than', thr: 'If Staff Takes for more than', none: 'No Break Fine for 0 mins' },
  occurrences: false,
  checkLabelCls: 'break-checkbox-label',
};

export default function Body() {
  return <RulesEditor cfg={cfg} />;
}
