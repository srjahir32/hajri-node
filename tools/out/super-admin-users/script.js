
        var table;
        $(document).ready(function () {
            function datatable(searchValue = null, character_page_sorting = null, number_page_sorting = null, status_filter = null) {
                if (character_page_sorting == null) {
                    character_page_sorting = $('.character_page_sorting').val();
                }
                if (number_page_sorting == null) {
                    number_page_sorting = $('.number_page_sorting').val();
                }
                if (status_filter == null) {
                    status_filter = $('.status_filter').val();
                }
                table = $('#users_datas').DataTable({
                    searching: false,
                    lengthChange: false,
                    info: true,
                    dom: '<"top">rt<"bottom"ip><"clear">',
                    responsive: true,
                    order: [],
                    ajax: {
                        "url": "{{ route('superAdmin-all-users') }}",
                        "dataType": "json",
                        "type": "POST",
                        "data": {
                            _token: "{{csrf_token()}}",
                            'searchValue': searchValue,
                            'character_page_sorting': character_page_sorting,
                            'number_page_sorting': number_page_sorting,
                            'status_filter': status_filter
                        },
                        "dataSrc": "data"
                    },
                    initComplete: function (settings, json) {
                        var api = this.api();
                        if (table.rows().count() === 0) {
                            var adContent = '<tr><td colspan="6"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="No users data"></div><div class="section_title">No users found</div></div></td></tr>';
                            $(api.table().body()).html(adContent);
                        }
                    },
                    columns: [
                        {
                            data: "name",
                            render: function (data, type, row) {
                                var firstLetter = data ? data.charAt(0).toUpperCase() : 'U';
                                var colors = ['#2F8CFF', '#00B8D9', '#36B37E', '#FF5630', '#FFAB00', '#6554C0'];
                                var color = colors[row.id % colors.length];
                                return `<div class="staff-info-cell">
                                            <span class="staff-name">${data}</span>
                                        </div>`;
                            }
                        },
                        { data: "email" },
                        { data: "phone_number" },
                        {
                            data: "businesses",
                            render: function (data) {
                                return `<span style="white-space: nowrap;">${data}</span>`;
                            }
                        },
                        {
                            data: "status",
                            render: function (data, type, row) {
                                if (data === 'Registered') {
                                    return `<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200" style="border-color: #dbfce7 !important;">Registered</span>`;
                                } else {
                                    return `<span class="px-3 py-1 rounded-full text-xs font-semibold border" style="background-color: #fee2e2; color: #b91c1c; border-color: #fee2e2 !important;">Incomplete</span>`;
                                }
                            }
                        },
                        { data: "created_at" },
                        {
                            "data": "id",
                            "orderable": false,
                            "render": function (data, type, row) {
                                return `<a href="javascript:void(0)" style="display:inline-flex; align-items:center; gap:4px; color:#3b82f6; font-size:12px; font-weight:600; text-decoration:none; border:1px solid #bfdbfe; border-radius:8px; padding:5px;">
                                            <i class="fas fa-eye"></i>
                                        </a>`;
                            }
                        }
                    ]
                });
            }
            datatable();
            $('#users_data_find').on('input', function () {
                var searchValue = $(this).val();
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var status_filter = $('.status_filter').val();
                table.destroy();
                datatable(searchValue, character_page_sorting, number_page_sorting, status_filter);
                applyPagination(number_page_sorting);
            });
            $('.character_page_sorting').change(function () {
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var searchValue = $('#users_data_find').val();
                var status_filter = $('.status_filter').val();
                table.destroy();
                datatable(searchValue, character_page_sorting, number_page_sorting, status_filter);
                applyPagination(number_page_sorting);
            });
            $('.number_page_sorting').change(function () {
                var searchValue = $('#users_data_find').val();
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var status_filter = $('.status_filter').val();
                table.destroy();
                datatable(searchValue, character_page_sorting, number_page_sorting, status_filter);
                applyPagination(number_page_sorting);
            });
            $('.status_filter').change(function () {
                var status_filter = $(this).val();
                var searchValue = $('#users_data_find').val();
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                table.destroy();
                datatable(searchValue, character_page_sorting, number_page_sorting, status_filter);
                applyPagination(number_page_sorting);
            });
            function applyPagination(number_page_sorting) {
                if (number_page_sorting === 'all') {
                    table.page.len(-1).draw();
                } else if (number_page_sorting === '10perpage') {
                    table.page.len(10).draw();
                } else if (number_page_sorting === '50perpage') {
                    table.page.len(50).draw();
                } else if (number_page_sorting === '100perpage') {
                    table.page.len(100).draw();
                } else {
                    table.page.len(parseInt(number_page_sorting)).draw();
                }
            }
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
