
        var table;
        var selectedIds = [];
        // $('.cancel_selected_id').click(function () {
        //     $('#myModal').hide();
        //     selectedIds = [];
        //     $('#selectAllCheckbox').prop('checked', false);
        //     $('.selectCheckbox_model').prop('checked', false);
        // });
        $(document).ready(function () {
            function datatable(searchValue = null, character_page_sorting = null, number_page_sorting = null) {
                if (character_page_sorting == null) {
                    character_page_sorting = $('.character_page_sorting').val();
                }
                if (number_page_sorting == null) {
                    number_page_sorting = $('.number_page_sorting').val();
                }
                table = $('#business_datas').DataTable({
                    searching: false,
                    lengthChange: false,
                    info: true,
                    dom: '<"top">rt<"bottom"ip><"clear">',
                    responsive: true,
                    order: [],
                    drawCallback: function () {
                        /*
                        $('#selectAllCheckbox').off('change').on('change', function () {
                            var isChecked = $(this).prop('checked');
                            $('.selectCheckbox_model').prop('checked', isChecked);
                            var checkedCount = $('.selectCheckbox_model:checked').length;
                            $('.selected_check_member').html(checkedCount);
                            if (checkedCount > 0) {
                                $('#myModal').show();
                            } else {
                                $('#myModal').hide();
                            }
                            if (isChecked) {
                                selectedIds = [];
                                $('.selectCheckbox_model').each(function () {
                                    var id = $(this).val();
                                    selectedIds.push(id);
                                });
                            } else {
                                selectedIds = [];
                            }
                        });
                        $('.selectCheckbox_model').off('change').on('change', function () {
                            var id = $(this).val();
                            var checkedCount = $('.selectCheckbox_model:checked').length;
                            $('.selected_check_member').html(checkedCount);
                            if (checkedCount > 0) {
                                $('#myModal').show();
                            } else {
                                $('#myModal').hide();
                            }
                            if ($(this).is(':checked')) {
                                if (selectedIds.indexOf(id) === -1) {
                                    selectedIds.push(id);
                                }
                            } else {
                                const index = selectedIds.indexOf(id);
                                if (index !== -1) {
                                    selectedIds.splice(index, 1);
                                }
                            }
                        });
                        */
                    },
                    ajax: {
                        "url": "{{ route('superAdmin-all-businesses') }}",
                        "dataType": "json",
                        "type": "POST",
                        "data": {
                            _token: "{{csrf_token()}}",
                            'searchValue': searchValue,
                            'character_page_sorting': character_page_sorting,
                            'number_page_sorting': number_page_sorting
                        },
                        "dataSrc": "data"
                    },
                    initComplete: function (settings, json) {
                        var api = this.api();
                        if (table.rows().count() === 0) {
                            var adContent = '<tr><td colspan="7"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="No business data"></div><div class="section_title">No businesses found</div></div></td></tr>';
                            $(api.table().body()).html(adContent);
                        }
                    },
                    columns: [
                        // {
                        //     data: 'id',
                        //     type: 'num',
                        //     render: function (data, type, row) {
                        //         return `<input type="checkbox" class="selectCheckbox_model" id="selectCheckbox_model" value="${row.id}">`;
                        //     }
                        // },
                        {
                            data: "name",
                            render: function (data, type, row) {
                                var logoHtml = '';
                                if (row.logo && !row.logo.includes('dummy-user.png')) {
                                    logoHtml = `<img src="${row.logo}" class="business-logo" alt="Logo">`;
                                } else {
                                    var firstLetter = data ? data.charAt(0).toUpperCase() : 'B';
                                    var colors = ['#2F8CFF', '#00B8D9', '#36B37E', '#FF5630', '#FFAB00', '#6554C0'];
                                    var color = colors[row.id % colors.length];
                                    logoHtml = `<div class="business-avatar" style="background-color: ${color};">${firstLetter}</div>`;
                                }
                                // <div style="flex-shrink: 0;">
                                //     ${logoHtml}
                                // </div>
                                return `<div class="business-info-cell">
                                                        <div style="min-width: 0; width: 100%;">
                                                            <span class="business-name" title="${data}">${data}</span>
                                                        </div>
                                                    </div>`;
                            }
                        },
                        {
                            data: "owner_name",
                            render: function (data, type, row) {
                                return `<div>
                                                        <span class="owner-name">${data}</span>
                                                        <p class="owner-sub">${row.owner_phone}</p>
                                                        <p class="owner-sub" style="font-size: 11px; opacity: 0.85;">${row.owner_email}</p>
                                                    </div>`;
                            }
                        },
                        {
                            "data": "plan",
                            render: function (data) {
                                let badgeClass = 'bg-gray-100 text-gray-800 border-gray-200';
                                if (data && data.toLowerCase().includes('expired')) {
                                    badgeClass = 'bg-red-100 text-red-800 border-red-200';
                                } else if (data && data.toLowerCase() === 'trial') {
                                    badgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
                                } else if (data && data !== '-') {
                                    badgeClass = 'bg-green-100 text-green-800 border-green-200';
                                }
                                return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}">${data}</span>`;
                            }
                        },
                        {
                            "data": "active_employees",
                            render: function (data) {
                                return `<span style="white-space: nowrap; font-weight: 500;">${data}</span>`;
                            }
                        },
                        {
                            "data": "expires_on",
                            render: function (data) {
                                return `<span class="text-gray-900" style="white-space: nowrap;">${data}</span>`;
                            }
                        },
                        { "data": "created_at" },
                        {
                            "data": "id",
                            "orderable": false,
                            "render": function (data, type, row) {
                                var url = "{{ url('/super-admin/business') }}/" + data;
                                return `<a href="${url}" style="display:inline-flex; align-items:center; gap:4px; color:#3b82f6; font-size:12px; font-weight:600; text-decoration:none; border:1px solid #bfdbfe; border-radius:8px; padding:5px;">
                                                        <i class="fas fa-eye"></i>
                                                    </a>`;
                            }
                        }
                    ],
                    columnDefs: [
                        // {'targets': [0], 'orderable': false}
                    ]
                });
            }
            datatable();
            $('#staff_data_find').on('click', function () {
                // $('#myModal').hide();
                // selectedIds = [];
                // $('#selectAllCheckbox').prop('checked', false);
                // $('.selectCheckbox_model').prop('checked', false);
            });
            $('#staff_data_find').on('input', function () {
                var searchValue = $(this).val();
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                table.destroy();
                datatable(searchValue, character_page_sorting, number_page_sorting);
                applyPagination(number_page_sorting);
            });
            $('.character_page_sorting').change(function () {
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var searchValue = $('#staff_data_find').val();
                table.destroy();
                datatable(searchValue, character_page_sorting, number_page_sorting);
                applyPagination(number_page_sorting);
            });
            $('.number_page_sorting').change(function () {
                var searchValue = $('#staff_data_find').val();
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                table.destroy();
                datatable(searchValue, character_page_sorting, number_page_sorting);
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
            $('.delete_business_btn').on('click', function (event) {
                event.preventDefault();
                if (selectedIds.length === 0) return;
                if (confirm("Are you sure you want to delete the selected business(es)?")) {
                    $.ajax({
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        type: 'POST',
                        url: "{{ route('superAdmin-delete-business') }}",
                        data: {
                            'selectedIds': selectedIds
                        },
                        success: function (response) {
                            if (response['status'] == 1) {
                                toastr["success"](response.message);
                                $('#myModal').hide();
                                $('#selectAllCheckbox').prop('checked', false);
                                selectedIds = [];
                                table.ajax.reload(null, false);
                                $('#business_count').html('(' + response.business_count + ')');
                            } else {
                                toastr["error"](response.message)
                            }
                        }
                    });
                }
            });
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
