import { esc } from './bs';

export interface Trx {
  id: number;
  is_log: boolean;
  order_id: string;
  payment_id: string;
  plan_name: string;
  billing_cycle: string;
  seats: number;
  amount: number;
  currency_symbol: string;
  status: string;
  payment_method: string;
  created_at: string;
  date_raw: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  business_name: string;
  business_address: string;
}

/** The "Tax Invoice" card shown in the modal (same markup as the Laravel settings/subscriptions views). */
export function invoiceHtml(trx: Trx, appName = 'Hajri') {
  const total = Number(trx.amount).toFixed(2);
  const sym = esc(trx.currency_symbol);
  return `
<div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-gray-800" id="printableInvoice">
  <div class="flex justify-between items-start pb-6 border-b border-gray-200">
    <div>
      <h3 class="text-xl font-bold text-blue-600 tracking-wide mb-1">${esc(appName)}</h3>
      <p class="text-xs text-gray-500">Attendance &amp; Payroll System</p>
    </div>
    <div class="text-right">
      <span class="inline-block px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 uppercase mb-2">${esc(trx.status)}</span>
      <h4 class="text-xs font-mono font-bold text-gray-700">INVOICE #${esc(trx.order_id)}</h4>
      <p class="text-[11px] text-gray-500">Date: ${esc(trx.created_at)}</p>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-6 my-6 text-xs">
    <div>
      <span class="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block mb-1">Billed To</span>
      <div class="font-bold text-gray-900 text-sm">${esc(trx.business_name)}</div>
      <div class="text-gray-600">${esc(trx.user_name)}</div>
      <div class="text-gray-500">${esc(trx.user_email || 'N/A')} | ${esc(trx.user_phone)}</div>
      <div class="text-gray-500 mt-1 max-w-xs">${esc(trx.business_address)}</div>
    </div>
    <div class="text-right">
      <span class="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block mb-1">Billed By</span>
      <div class="font-bold text-gray-900 text-sm">${esc(appName)} Technologies</div>
      <div class="text-gray-500">Payment Gateway: ${esc(trx.payment_method)}</div>
      <div class="text-gray-500 font-mono text-[11px] mt-1">Payment ID: ${esc(trx.payment_id)}</div>
    </div>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full text-left text-xs border-collapse">
      <thead><tr class="bg-gray-100 border-y border-gray-200 text-gray-700 font-semibold">
        <th class="py-2.5 px-3">Description</th><th class="py-2.5 px-3 text-center">Billing Cycle</th><th class="py-2.5 px-3 text-center">Seats</th><th class="py-2.5 px-3 text-right">Amount</th>
      </tr></thead>
      <tbody class="divide-y divide-gray-100"><tr>
        <td class="py-3 px-3"><div class="font-semibold text-gray-900">${esc(trx.plan_name)} Plan Subscription</div><div class="text-[11px] text-gray-500">User Seats Allowance License</div></td>
        <td class="py-3 px-3 text-center text-gray-600">${esc(trx.billing_cycle)}</td>
        <td class="py-3 px-3 text-center font-medium text-gray-800">${esc(trx.seats)} Seats</td>
        <td class="py-3 px-3 text-right font-semibold text-gray-900">${sym}${total}</td>
      </tr></tbody>
    </table>
  </div>
  <div class="flex justify-between items-end border-t border-gray-200 pt-4 text-xs">
    <div class="text-gray-500"><p class="font-medium text-gray-700 mb-1">Thank you for your business!</p><p class="text-[11px] mb-0">This is a computer-generated tax invoice.</p></div>
    <div class="space-y-1 text-right"><div class="inline-flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
      <span class="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total Paid</span><span class="text-base font-bold text-blue-900">${sym}${total}</span>
    </div></div>
  </div>
</div>`;
}

export const SUCCESS = ['SUCCESS', 'ACTIVE', 'PAID', 'SUCCESSFUL'];
export const PENDING = ['PENDING', 'PROCESSING'];
export const FAILED = ['FAILED', 'CANCELLED', 'EXPIRED'];

export function matchesStatus(status: string, filter: string) {
  const s = status.toUpperCase();
  return filter === 'ALL' || (filter === 'SUCCESS' && SUCCESS.includes(s)) || (filter === 'PENDING' && PENDING.includes(s)) || (filter === 'FAILED' && FAILED.includes(s));
}
