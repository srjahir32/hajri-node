
        var table;
        $(document).ready(function () {
            function loadTable() {
                if (table) { table.destroy(); }
                table = $('#sub_payments_data').DataTable({
                    searching: false,
                    lengthChange: false,
                    info: false,
                    responsive: true,
                    order: [],
                    ajax: {
                        url: "{{ route('superAdmin-all-subscription-payments') }}",
                        dataType: "json",
                        type: "POST",
                        data: {
                            _token: "{{ csrf_token() }}",
                            searchValue: $('#payment_search').val(),
                            status_filter: $('#payment_status_filter').val(),
                        },
                        dataSrc: "data"
                    },
                    initComplete: function (settings, json) {
                        if (table.rows().count() === 0) {
                            var noData = '<tr><td colspan="10"><div class="no_data_found"><img src="{{ asset("assets/admin/images/staff_manage/no_data.svg") }}" alt="No data"><div class="section_title">No payment records found</div></div></td></tr>';
                            $(this.api().table().body()).html(noData);
                        }
                    },
                    columns: [
                        { data: 'id', render: function (d, t, row, meta) { return meta.row + 1; } },
                        {
                            data: 'user_name',
                            render: function (d, t, row) {
                                return `<div class="user-cell">
                                            <span class="user-name-main">${d}</span>
                                            <span class="user-sub-text">${row.user_email}</span>
                                            <span class="user-sub-text">${row.user_phone}</span>
                                        </div>`;
                            }
                        },
                        {
                            data: 'plan',
                            render: function (d, t, row) {
                                return `<div>
                                            <span style="font-weight:600;">${d}</span>
                                            <div class="user-sub-text">${row.billing_cycle}</div>
                                        </div>`;
                            }
                        },
                        { data: 'event_type' },
                        { data: 'payment_method' },
                        { data: 'amount' },
                        {
                            data: 'status',
                            render: function (d) {
                                if (!d || d === '-') return '<span class="badge-status other">-</span>';
                                var lowerD = d.toLowerCase();
                                var cls = (lowerD === 'paid' || lowerD === 'success') ? 'success' : (lowerD === 'pending' ? 'pending' : (lowerD === 'failed' ? 'failed' : 'other'));
                                return `<span class="badge-status ${cls}">${d.charAt(0).toUpperCase() + d.slice(1)}</span>`;
                            }
                        },
                        { data: 'order_id', render: function (d) { return d !== '-' ? `<span class="order-id-text">${d}</span>` : '-'; } },
                        { data: 'payment_id', render: function (d) { return d !== '-' ? `<span class="order-id-text">${d}</span>` : '-'; } },
                        { data: 'paid_at' },
                    ],
                    columnDefs: [{ targets: [0], orderable: false }]
                });
            }
            loadTable();
            var searchTimer;
            $('#payment_search').on('input', function () {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(loadTable, 400);
            });
            $('#payment_status_filter').on('change', loadTable);
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
