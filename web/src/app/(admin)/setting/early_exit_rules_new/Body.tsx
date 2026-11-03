'use client';

import { RulesEditor, type RuleKind } from '@/components/settings/RulesEditor';

const cfg: RuleKind = {
  kind: 'early-exit',
  title: 'Early Exit Rules',
  heading: 'Create a Early Exit Rule',
  cls: { wrap: 'early-exit-rules', cont: 'early-exit-container', item: 'early-exit-item' },
  perMinute: { check: 'Deduct salary if staff is early exit by more than', thr: 'If Staff Takes More Late by', typeLabel: 'Deduction Type', none: 'No Late Fine for 0 mins' },
  half: { check: 'Deduct half day salary if staff is early exit by more than', thr: 'If Staff Takes for more than', none: 'No Break Fine for 0 mins' },
  full: { check: 'Deduct full day salary if staff is early exit by more than', thr: 'If Staff Takes for more than', none: 'No Break Fine for 0 mins' },
  occurrences: true,
  checkLabelCls: 'break-checkbox-label',
};

export default function Body() {
  return <RulesEditor cfg={cfg} />;
}
