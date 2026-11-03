

        var currentInvoiceTrx = null;

        function filterTransactionsTable() {
            var searchVal = document.getElementById('transactionSearchInput').value.toLowerCase().trim();
            var filterVal = document.getElementById('transactionStatusFilter').value.toUpperCase();
            var rows = document.querySelectorAll('.transaction-row');
            var visibleCount = 0;

            rows.forEach(function (row) {
                var status = row.getAttribute('data-status');
                var searchData = row.getAttribute('data-search');

                var matchesStatus = (filterVal === 'ALL') ||
                    (filterVal === 'SUCCESS' && ['SUCCESS', 'ACTIVE', 'PAID', 'SUCCESSFUL'].indexOf(status) !== -1) ||
                    (filterVal === 'PENDING' && ['PENDING', 'PROCESSING'].indexOf(status) !== -1) ||
                    (filterVal === 'FAILED' && ['FAILED', 'CANCELLED', 'EXPIRED'].indexOf(status) !== -1);

                var matchesSearch = !searchVal || (searchData && searchData.indexOf(searchVal) !== -1);

                if (matchesStatus && matchesSearch) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });

            // Hide the whole table (incl. headers) and show a clean empty state instead
            var tableWrapper = document.getElementById('trxTableWrapper');
            var emptyState = document.getElementById('trxEmptyState');
            if (tableWrapper && emptyState) {
                if (visibleCount === 0 && rows.length > 0) {
                    tableWrapper.style.display = 'none';
                    emptyState.classList.remove('hidden');
                } else {
                    tableWrapper.style.display = '';
                    emptyState.classList.add('hidden');
                }
            }
        }

        function showInvoiceModal(trx) {
            currentInvoiceTrx = trx;
            var totalAmount = parseFloat(trx.amount).toFixed(2);
            var symbol = trx.currency_symbol ? trx.currency_symbol : ((trx.payment_method && trx.payment_method.toLowerCase().includes('kelviq')) ? '$' : '₹');

            var html = `
                                    <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-gray-800" id="printableInvoice">
                                        <div class="flex justify-between items-start pb-6 border-b border-gray-200">
                                            <div>
                                                <h3 class="text-xl font-bold text-blue-600 tracking-wide mb-1">{{ env('APP_NAME', 'Hajri') }}</h3>
                                                <p class="text-xs text-gray-500">Attendance & Payroll System</p>
                                            </div>
                                            <div class="text-right">
                                                <span class="inline-block px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 uppercase mb-2">
                                                    ${trx.status}
                                                </span>
                                                <h4 class="text-xs font-mono font-bold text-gray-700">INVOICE #${trx.order_id}</h4>
                                                <p class="text-[11px] text-gray-500">Date: ${trx.created_at}</p>
                                            </div>
                                        </div>

                                        <div class="grid grid-cols-2 gap-6 my-6 text-xs">
                                            <div>
                                                <span class="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block mb-1">Billed To</span>
                                                <div class="font-bold text-gray-900 text-sm">${trx.business_name}</div>
                                                <div class="text-gray-600">${trx.user_name}</div>
                                                <div class="text-gray-500">${trx.user_email || 'N/A'} | ${trx.user_phone || ''}</div>
                                                <div class="text-gray-500 mt-1 max-w-xs">${trx.business_address}</div>
                                            </div>
                                            <div class="text-right">
                                                <span class="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block mb-1">Billed By</span>
                                                <div class="font-bold text-gray-900 text-sm">{{ env('APP_NAME', 'Hajri') }} Technologies</div>
                                                <div class="text-gray-500">Payment Gateway: ${trx.payment_method}</div>
                                                <div class="text-gray-500 font-mono text-[11px] mt-1">Payment ID: ${trx.payment_id}</div>
                                            </div>
                                        </div>

                                        <div class="overflow-x-auto">
                                            <table class="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr class="bg-gray-100 border-y border-gray-200 text-gray-700 font-semibold">
                                                        <th class="py-2.5 px-3">Description</th>
                                                        <th class="py-2.5 px-3 text-center">Billing Cycle</th>
                                                        <th class="py-2.5 px-3 text-center">Seats</th>
                                                        <th class="py-2.5 px-3 text-right">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="divide-y divide-gray-100">
                                                    <tr>
                                                        <td class="py-3 px-3">
                                                            <div class="font-semibold text-gray-900">${trx.plan_name} Plan Subscription</div>
                                                            <div class="text-[11px] text-gray-500">User Seats Allowance License</div>
                                                        </td>
                                                        <td class="py-3 px-3 text-center text-gray-600">${trx.billing_cycle}</td>
                                                        <td class="py-3 px-3 text-center font-medium text-gray-800">${trx.seats} Seats</td>
                                                        <td class="py-3 px-3 text-right font-semibold text-gray-900">${symbol}${totalAmount}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        <div class="flex justify-between items-end border-t border-gray-200 pt-4 text-xs">
                                            <div class="text-gray-500">
                                                <p class="font-medium text-gray-700 mb-1">Thank you for your business!</p>
                                                <p class="text-[11px] mb-0">This is a computer-generated tax invoice.</p>
                                            </div>
                                            <div class="space-y-1 text-right">
                                                <div class="inline-flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
                                                    <span class="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total Paid</span>
                                                    <span class="text-base font-bold text-blue-900">${symbol}${totalAmount}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;

            document.getElementById('invoiceModalContent').innerHTML = html;
            var myModal = new bootstrap.Modal(document.getElementById('taxInvoiceModal'));
            myModal.show();
        }

        function downloadInvoicePDF() {
            if (!currentInvoiceTrx) return;
            var id = currentInvoiceTrx.id || '';
            var isLog = currentInvoiceTrx.is_log ? 1 : 0;
            var url = "{{ route('download_invoice_pdf') }}?id=" + encodeURIComponent(id) + "&is_log=" + isLog;
            window.location.href = url;
        }

        function printInvoice() {
            downloadInvoicePDF();
        }
    

/* ---- raw @section(scripts) remainder ---- */
