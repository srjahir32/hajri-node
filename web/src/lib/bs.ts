'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { installLegacyBehaviors } from './legacy';

/** Programmatic equivalents of `$('#id').offcanvas('toggle')` / `.modal('hide')` for markup kept from the Blade views. */
async function bs() {
  await installLegacyBehaviors();
  return (window as any).bootstrap;
}

export async function showOffcanvas(id: string) {
  const el = document.getElementById(id);
  const b = await bs();
  if (el && b) b.Offcanvas.getOrCreateInstance(el).show();
}

export async function hideOffcanvas(id: string) {
  const el = document.getElementById(id);
  const b = await bs();
  if (el && b) b.Offcanvas.getOrCreateInstance(el).hide();
}

export async function showModal(id: string) {
  const el = document.getElementById(id);
  const b = await bs();
  if (el && b) b.Modal.getOrCreateInstance(el).show();
}

export async function hideModal(id: string) {
  const el = document.getElementById(id);
  const b = await bs();
  if (el && b) b.Modal.getOrCreateInstance(el).hide();
}

export const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
