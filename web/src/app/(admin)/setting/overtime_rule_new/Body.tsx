'use client';

import { RulesEditor, type RuleKind } from '@/components/settings/RulesEditor';

const cfg: RuleKind = {
  kind: 'overtime',
  title: 'Overtime Rules',
  heading: 'Create an Overtime Rules',
  cls: { wrap: 'shifts', cont: 'shift-container', item: 'shift-item' },
  perMinute: { check: 'Give Overtime', thr: 'If Staff Works for more than', typeLabel: 'Overtime Type', none: 'No Late Fine for 0 mins' },
  half: { check: 'Give half day overtime if staff works for more than', thr: 'If Staff Works for more than', none: 'No applicable up to 2 hours' },
  full: { check: 'Give full day overtime if staff works for more than', thr: 'If Staff Works for more than', none: 'No applicable up to 6 hours' },
  occurrences: false,
  checkLabelCls: 'overtime-checkbox-label',
};

export default function Body() {
  return <RulesEditor cfg={cfg} />;
}
