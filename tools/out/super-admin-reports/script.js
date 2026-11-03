
        $(document).ready(function () {
            $('#cashfree_data').DataTable({
                searching: false,
                lengthChange: false,
                info: true,
                dom: '<"top">rt<"bottom"ip><"clear">',
                responsive: true,
                ajax: {
                    url: "{{ route('superAdmin-reports-data') }}",
                    type: "POST",
                    data: function (d) {
                        d._token = "{{ csrf_token() }}";
                        d.payment_gateway = "cashfree";
                        d.filter_type = $('#filter_type').val();
                        d.month = $('#filter_month').val();
                        d.year = $('#filter_year').val();
                    },
                    dataSrc: "data"
                },
                initComplete: function (settings, json) {
                    if (this.api().rows().count() === 0) {
                        var noData = '<tr><td colspan="7"><div class="no_data_found"><img src="{{ asset("assets/admin/images/staff_manage/no_data.svg") }}" alt="No data"><div class="section_title">No payment records found</div></div></td></tr>';
                        $(this.api().table().body()).html(noData);
                    }
                },
                columns: [
                    { data: 'id', render: function (d, t, row, meta) { return meta.row + 1; } },
                    {
                        data: 'user_name', render: function (d, t, row) {
                            return `<div class="user-cell"><span class="user-name-main">${d}</span></div>`;
                        }
                    },
                    { data: 'plan', render: function (d) { return `<strong>${d}</strong>`; } },
                    { data: 'amount', render: function (d) { return `<span style="font-weight:600; color:#1a1d23;">${d}</span>`; } },
                    {
                        data: 'status', render: function (d) {
                            if (!d || d === '-') return '<span class="badge-status other">-</span>';
                            var lowerD = d.toLowerCase();
                            var cls = (lowerD === 'paid' || lowerD === 'success') ? 'success' : (lowerD === 'pending' ? 'pending' : (lowerD === 'failed' ? 'failed' : 'other'));
                            return `<span class="badge-status ${cls}">${d.charAt(0).toUpperCase() + d.slice(1)}</span>`;
                        }
                    },
                    { data: 'order_id', render: function (d) { return d !== '-' ? `<span class="order-id-text">${d}</span>` : '-'; } },
                    { data: 'paid_at' }
                ]
            });
            $('#kelviq_data').DataTable({
                searching: false,
                lengthChange: false,
                info: true,
                dom: '<"top">rt<"bottom"ip><"clear">',
                responsive: true,
                ajax: {
                    url: "{{ route('superAdmin-reports-data') }}",
                    type: "POST",
                    data: function (d) {
                        d._token = "{{ csrf_token() }}";
                        d.payment_gateway = "kelviq";
                        d.filter_type = $('#filter_type').val();
                        d.month = $('#filter_month').val();
                        d.year = $('#filter_year').val();
                    },
                    dataSrc: "data"
                },
                initComplete: function (settings, json) {
                    if (this.api().rows().count() === 0) {
                        var noData = '<tr><td colspan="7"><div class="no_data_found"><img src="{{ asset("assets/admin/images/staff_manage/no_data.svg") }}" alt="No data"><div class="section_title">No payment records found</div></div></td></tr>';
                        $(this.api().table().body()).html(noData);
                    }
                },
                columns: [
                    { data: 'id', render: function (d, t, row, meta) { return meta.row + 1; } },
                    {
                        data: 'user_name', render: function (d, t, row) {
                            return `<div class="user-cell"><span class="user-name-main">${d}</span></div>`;
                        }
                    },
                    { data: 'plan', render: function (d) { return `<strong>${d}</strong>`; } },
                    { data: 'amount', render: function (d) { return `<span style="font-weight:600; color:#1a1d23;">${d}</span>`; } },
                    {
                        data: 'status', render: function (d) {
                            if (!d || d === '-') return '<span class="badge-status other">-</span>';
                            var lowerD = d.toLowerCase();
                            var cls = (lowerD === 'paid' || lowerD === 'success') ? 'success' : (lowerD === 'pending' ? 'pending' : (lowerD === 'failed' ? 'failed' : 'other'));
                            return `<span class="badge-status ${cls}">${d.charAt(0).toUpperCase() + d.slice(1)}</span>`;
                        }
                    },
                    { data: 'order_id', render: function (d) { return d !== '-' ? `<span class="order-id-text">${d}</span>` : '-'; } },
                    { data: 'paid_at' }
                ]
            });
            $('#filter_type, #filter_month, #filter_year').on('change', function () {
                $('#reportsFilterForm').submit();
            });
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
