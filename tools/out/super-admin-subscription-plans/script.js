
        var table;
        $(document).ready(function () {
            function loadTable() {
                if (table) { table.destroy(); }
                table = $('#sub_plans_data').DataTable({
                    searching: false,
                    lengthChange: false,
                    info: false,
                    responsive: true,
                    order: [],
                    ajax: {
                        url: "{{ route('superAdmin-all-subscription-plans') }}",
                        dataType: "json",
                        type: "POST",
                        data: {
                            _token: "{{ csrf_token() }}",
                            searchValue: $('#plan_search').val(),
                            status_filter: $('#status_filter').val(),
                            plan_filter: $('#plan_filter').val(),
                        },
                        dataSrc: "data"
                    },
                    initComplete: function (settings, json) {
                        if (table.rows().count() === 0) {
                            var noData = '<tr><td colspan="11"><div class="no_data_found"><img src="{{ asset("assets/admin/images/staff_manage/no_data.svg") }}" alt="No data"><div class="section_title">No subscriptions found</div></div></td></tr>';
                            $(this.api().table().body()).html(noData);
                        }
                    },
                    columns: [
                        { data: 'id', render: function (d, t, row, meta) { return meta.row + 1; } },
                        {
                            data: 'user_name',
                            render: function (d, t, row) {
                                return `<div class="user-cell">
                                            <span class="user-name-link">${d}</span>
                                            <span class="user-sub-text">${row.user_email}</span>
                                            <span class="user-sub-text">${row.user_phone}</span>
                                        </div>`;
                            }
                        },
                        { data: 'plan' },
                        { data: 'billing_cycle' },
                        { data: 'seats' },
                        { data: 'total_amount' },
                        {
                            data: 'status',
                            render: function (d) {
                                var cls = d === 'active' ? 'active' : (d === 'pending' ? 'pending' : (d === 'expired' ? 'expired' : 'inactive'));
                                return `<span class="badge-status ${cls}">${d.charAt(0).toUpperCase() + d.slice(1)}</span>`;
                            }
                        },
                        { data: 'payment_method' },
                        { data: 'starts_at' },
                        { data: 'expires_at' },
                        { data: 'created_at' },
                    ],
                    columnDefs: [{ targets: [0], orderable: false }]
                });
            }
            loadTable();
            var searchTimer;
            $('#plan_search').on('input', function () {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(loadTable, 400);
            });
            $('#status_filter, #plan_filter').on('change', loadTable);
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
