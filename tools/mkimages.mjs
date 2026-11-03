// Recreates the image assets the Laravel admin references but that are missing from the copy we have
// (public/assets/admin/images is not in the repo). Simple vector stand-ins; replace with the originals if you have them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web/public/assets/admin/images');
const S = (inner, w = 24, h = 24, vb = `0 0 ${w} ${h}`, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}" fill="none" ${extra}>${inner}</svg>`;
const stroke = (d, c = '#808080', w = 1.6) => `<path d="${d}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

const chevDown = (c = '#808080') => S(stroke('M6 9l6 6 6-6', c, 2));
const chevRight = (c = '#808080') => S(stroke('M9 6l6 6-6 6', c, 2));
const arrowLeft = (c = '#1a1a1a') => S(stroke('M15 5l-7 7 7 7', c, 2));
const calendar = (c = '#808080') => S(`<rect x="3.5" y="5" width="17" height="15" rx="3" stroke="${c}" stroke-width="1.6"/>` + stroke('M8 3v4M16 3v4M3.5 10h17', c));
const user = (c = '#808080') => S(`<circle cx="12" cy="8" r="4" stroke="${c}" stroke-width="1.6"/>` + stroke('M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6', c));
const check = (c = '#1fb36b') => S(stroke('M5 12.5l4.5 4.5L19 7.5', c, 2.2));
const x = (c = '#ef4444') => S(stroke('M6 6l12 12M18 6L6 18', c, 2.2));
const pencil = (c = '#808080') => S(stroke('M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17v3zM13.5 7.5l3 3', c));
const eye = (c = '#2F8CFF') => S(stroke('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z', c) + `<circle cx="12" cy="12" r="2.6" stroke="${c}" stroke-width="1.6"/>`);
const download = (c = '#2F8CFF') => S(stroke('M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14', c, 1.8));
const dots = (c = '#808080') => S(`<circle cx="12" cy="5" r="1.7" fill="${c}"/><circle cx="12" cy="12" r="1.7" fill="${c}"/><circle cx="12" cy="19" r="1.7" fill="${c}"/>`);
const search = (c = '#808080') => S(`<circle cx="11" cy="11" r="6.5" stroke="${c}" stroke-width="1.7"/>` + stroke('M16 16l4.5 4.5', c, 1.7));
const bell = (c = '#1a1a1a') => S(stroke('M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16zM10 21h4', c));
const layout = (c = '#2F8CFF') => S(`<rect x="3.5" y="3.5" width="17" height="17" rx="3.5" stroke="${c}" stroke-width="1.6"/>` + stroke('M9.5 3.5v17M9.5 10.5h11', c));
const pill = (bg, glyph) => S(`<rect width="40" height="40" rx="12" fill="${bg}"/><g transform="translate(8 8)">${glyph}</g>`, 40, 40);
const arrowUp = S(stroke('M12 19V6M6.5 11.5L12 6l5.5 5.5', '#808080', 2));
const arrowDown = S(stroke('M12 5v13M6.5 12.5L12 18l5.5-5.5', '#808080', 2));
const checkMark = S(stroke('M5 12.5l4.5 4.5L19 7.5', '#2F8CFF', 2.4));
const spinner = (c, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="${bg}" stroke-width="4"/><path d="M20 5a15 15 0 0115 15" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="0.9s" repeatCount="indefinite"/></path></svg>`;
const empty = (c = '#c7d2e0') => `<svg xmlns="http://www.w3.org/2000/svg" width="190" height="148" viewBox="0 0 190 148" fill="none"><ellipse cx="95" cy="128" rx="62" ry="9" fill="#eef2f7"/><rect x="42" y="30" width="106" height="86" rx="12" fill="#f5f8fc" stroke="${c}" stroke-width="2"/><path d="M42 78h30l6 12h34l6-12h30" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><rect x="62" y="44" width="66" height="8" rx="4" fill="#e2e9f2"/><rect x="72" y="58" width="46" height="8" rx="4" fill="#e2e9f2"/></svg>`;

const files = {
  'sidebar/logo.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="11" fill="#2F8CFF"/><path d="M12 10v20M28 10v20M12 20h16" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`,
  'login/logo.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="11" fill="#2F8CFF"/><path d="M12 10v20M28 10v20M12 20h16" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`,
  'favicon/fav.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="11" fill="#2F8CFF"/><path d="M12 10v20M28 10v20M12 20h16" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`,
  'sidebar/ic_close.svg': S(stroke('M6 6l12 12M18 6L6 18', '#1a1a1a', 2)),
  'sidebar/arrow.svg': chevDown(),
  'header/ic_layout.svg': layout(),
  'header/back.svg': arrowLeft(),
  'header/Notification.svg': bell(),
  'header/arrow.svg': chevDown(),
  'header/ic_search.svg': search(),
  'dummy/dummy-user.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#e4eaf2"/><circle cx="20" cy="16" r="7" fill="#9db0c7"/><path d="M6 36c1.5-7 7.5-10 14-10s12.5 3 14 10" fill="#9db0c7"/></svg>`,
  'approve_punches/calender.svg': calendar(),
  'approve_punches/decline.svg': x(),
  'approve_punches/download-report.svg': download(),
  'approve_punches/ic-check.svg': check(),
  'approve_punches/ic-user.svg': user('#2F8CFF'),
  'approve_punches/select-arrow.svg': chevDown(),
  'approve_punches/user.svg': user(),
  'arrow-down.svg': arrowDown,
  'arrow-up.svg': arrowUp,
  'attendance/Absent.svg': pill('#fee2e2', S(`<circle cx="12" cy="9" r="4" stroke="#ef4444" stroke-width="1.6"/>` + stroke('M4 21c0-3.5 3.6-6 8-6M16 17l5 5M21 17l-5 5', '#ef4444'), 24, 24)),
  'attendance/Absent2.svg': x('#ef4444'),
  'attendance/Halfday.svg': pill('#fef3c7', S(`<circle cx="12" cy="12" r="8" stroke="#f59e0b" stroke-width="1.6"/><path d="M12 4a8 8 0 010 16z" fill="#f59e0b"/>`)),
  'attendance/halfday2.svg': S(`<circle cx="12" cy="12" r="8" stroke="#f59e0b" stroke-width="1.6"/><path d="M12 4a8 8 0 010 16z" fill="#f59e0b"/>`),
  'attendance/Present.svg': pill('#dcfce7', S(stroke('M5 12.5l4.5 4.5L19 7.5', '#16a34a', 2.2))),
  'attendance/present2.svg': check('#16a34a'),
  'attendance/Staff.svg': pill('#dbeafe', user('#2F8CFF')),
  'attendance/arrow.svg': chevRight(),
  'attendance/leave.svg': pill('#ede9fe', calendar('#7c3aed')),
  'daily_work/dots.svg': dots(),
  'dashboard/Arrow.svg': chevDown(),
  'dashboard/arrow2.svg': chevDown('#1a1a1a'),
  'dashboard/ic-date.svg': calendar(),
  'dashboard/ic_Arrow-right.svg': chevRight(),
  'dashboard/view_now.svg': S(stroke('M5 12h14M13 6l6 6-6 6', '#2F8CFF', 2)),
  'dashboard/view_now2.svg': S(stroke('M5 12h14M13 6l6 6-6 6', '#ffffff', 2)),
  'import_details/check-mark.svg': checkMark,
  'login/business.svg': S(`<rect x="4" y="7" width="16" height="13" rx="2.5" stroke="#2F8CFF" stroke-width="1.6"/>` + stroke('M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M4 13h16', '#2F8CFF')),
  'login/icon-edit.svg': pencil(),
  'login/icon2.svg': S(stroke('M5 12h14M13 6l6 6-6 6', '#ffffff', 2)),
  'login/salary.svg': S(`<circle cx="12" cy="12" r="8.5" stroke="#2F8CFF" stroke-width="1.6"/>` + stroke('M9 8h6M9 11h6M10 8c3.5 0 3.5 5 0 5H9l5 4', '#2F8CFF', 1.5)),
  'login/loading.svg': spinner('#ffffff', 'rgba(255,255,255,.35)'),
  'login/left-image.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="760" viewBox="0 0 640 760" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2F8CFF"/><stop offset="1" stop-color="#5b5bd6"/></linearGradient></defs><rect width="640" height="760" fill="url(#g)"/><circle cx="520" cy="120" r="170" fill="#fff" fill-opacity=".08"/><circle cx="90" cy="650" r="210" fill="#fff" fill-opacity=".07"/><rect x="150" y="230" width="340" height="250" rx="26" fill="#fff" fill-opacity=".95"/><rect x="185" y="270" width="140" height="16" rx="8" fill="#2F8CFF"/><rect x="185" y="305" width="270" height="12" rx="6" fill="#dbe7f7"/><rect x="185" y="335" width="230" height="12" rx="6" fill="#dbe7f7"/><circle cx="230" cy="415" r="26" fill="#dcfce7"/><path d="M219 415l8 8 15-17" stroke="#16a34a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="275" y="400" width="150" height="14" rx="7" fill="#dbe7f7"/><rect x="275" y="424" width="100" height="10" rx="5" fill="#eef3fa"/></svg>`,
  'no_reports.svg': empty(),
  'payroll/bulk-in-process-payroll.svg': S(`<rect x="4" y="4" width="16" height="16" rx="3" stroke="#2F8CFF" stroke-width="1.6"/>` + stroke('M8 12h8M8 8h8M8 16h5', '#2F8CFF')),
  'payroll/manual-process-payroll.svg': S(`<rect x="4" y="4" width="16" height="16" rx="3" stroke="#808080" stroke-width="1.6"/>` + stroke('M8 12l3 3 5-6', '#808080')),
  'payroll/new-view.svg': eye(),
  'payroll/frozen.svg': pill('#dbeafe', S(stroke('M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9', '#2F8CFF'))),
  'payroll/pending.svg': pill('#fef3c7', S(`<circle cx="12" cy="12" r="8.5" stroke="#f59e0b" stroke-width="1.6"/>` + stroke('M12 7v5l3 2', '#f59e0b'))),
  'payroll/processed.svg': pill('#dcfce7', S(`<circle cx="12" cy="12" r="8.5" stroke="#16a34a" stroke-width="1.6"/>` + stroke('M8 12.5l3 3 5-6', '#16a34a'))),
  'profile/edit.svg': pencil(),
  'profile/edit1.svg': pencil('#2F8CFF'),
  'search_loader.svg': spinner('#2F8CFF', '#e6effb'),
  'setting/Rectangle.svg': S(`<rect x="3" y="3" width="18" height="18" rx="4" fill="#2F8CFF" fill-opacity=".12"/>`),
  'staff_manage/Absent.svg': pill('#fee2e2', x()),
  'staff_manage/Halfday.svg': pill('#fef3c7', S(`<circle cx="12" cy="12" r="8" stroke="#f59e0b" stroke-width="1.6"/><path d="M12 4a8 8 0 010 16z" fill="#f59e0b"/>`)),
  'staff_manage/Present.svg': pill('#dcfce7', check('#16a34a')),
  'staff_manage/arrow.svg': chevDown(),
  'staff_manage/days.svg': pill('#dbeafe', calendar('#2F8CFF')),
  'staff_manage/decline.svg': x(),
  'staff_manage/edit2.svg': pencil(),
  'staff_manage/ic_Arrow.svg': chevRight(),
  'staff_manage/leave.svg': pill('#ede9fe', calendar('#7c3aed')),
  'staff_manage/no_data.svg': empty(),
  'white_loader.svg': spinner('#ffffff', 'rgba(255,255,255,.35)'),
  'view.svg': eye(),
};
for (const [f, svg] of Object.entries(files)) {
  const p = path.join(out, f);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, svg);
}
console.log(Object.keys(files).length, 'images written to', out);
