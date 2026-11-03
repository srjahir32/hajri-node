
        var table;
        var selectedIds = [];
        // $('.cancel_selected_id').click(function () {
        //     $('#myModal').hide();
        //     selectedIds = [];
        //     $('#selectAllCheckbox').prop('checked', false);
        //     $('.selectCheckbox_model').prop('checked', false);
        // });
        $(document).ready(function () {
            function datatable(searchValue = null, character_page_sorting = null, number_page_sorting = null, business_id = null, status_filter = null) {
                if (character_page_sorting == null) {
                    character_page_sorting = $('.character_page_sorting').val();
                }
                if (number_page_sorting == null) {
                    number_page_sorting = $('.number_page_sorting').val();
                }
                if (business_id == null) {
                    business_id = $('.business_filter').val();
                }
                if (status_filter == null) {
                    status_filter = $('.status_filter').val();
                }
                table = $('#staff_datas').DataTable({
                    searching: false,
                    lengthChange: false,
                    info: true,
                    dom: '<"top">rt<"bottom"ip><"clear">',
                    responsive: true,
                    order: [],
                    // drawCallback: function () {
                    //     $('#selectAllCheckbox').off('change').on('change', function () {
                    //         var isChecked = $(this).prop('checked');
                    //         $('.selectCheckbox_model').prop('checked', isChecked);
                    //         var checkedCount = $('.selectCheckbox_model:checked').length;
                    //         $('.selected_check_member').html(checkedCount);
                    //         if (checkedCount > 0) {
                    //             $('#myModal').show();
                    //         } else {
                    //             $('#myModal').hide();
                    //         }
                    //         if (isChecked) {
                    //             selectedIds = [];
                    //             $('.selectCheckbox_model').each(function () {
                    //                 var id = $(this).val();
                    //                 selectedIds.push(id);
                    //             });
                    //         } else {
                    //             selectedIds = [];
                    //         }
                    //     });
                    //     $('.selectCheckbox_model').off('change').on('change', function () {
                    //         var id = $(this).val();
                    //         var checkedCount = $('.selectCheckbox_model:checked').length;
                    //         $('.selected_check_member').html(checkedCount);
                    //         if (checkedCount > 0) {
                    //             $('#myModal').show();
                    //         } else {
                    //             $('#myModal').hide();
                    //         }
                    //         if ($(this).is(':checked')) {
                    //             if (selectedIds.indexOf(id) === -1) {
                    //                 selectedIds.push(id);
                    //             }
                    //         } else {
                    //             const index = selectedIds.indexOf(id);
                    //             if (index !== -1) {
                    //                 selectedIds.splice(index, 1);
                    //             }
                    //         }
                    //     });
                    // },
                    ajax: {
                        "url": "{{ route('superAdmin-all-staff') }}",
                        "dataType": "json",
                        "type": "POST",
                        "data": {
                            _token: "{{csrf_token()}}",
                            'searchValue': searchValue,
                            'character_page_sorting': character_page_sorting,
                            'number_page_sorting': number_page_sorting,
                            'business_id': business_id,
                            'status_filter': status_filter
                        },
                        "dataSrc": "data"
                    },
                    initComplete: function (settings, json) {
                        var api = this.api();
                        if (table.rows().count() === 0) {
                            var adContent = '<tr><td colspan="7"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="No staff data"></div><div class="section_title">No staff found</div></div></td></tr>';
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
                                var firstLetter = data ? data.charAt(0).toUpperCase() : 'S';
                                var colors = ['#2F8CFF', '#00B8D9', '#36B37E', '#FF5630', '#FFAB00', '#6554C0'];
                                var color = colors[row.id % colors.length];
                                var avatarHtml = `<div class="staff-avatar" style="background-color: ${color};">${firstLetter}</div>`;
                                var profileUrl = "{{ route('superAdmin-staff-profile', ['id' => '__ID__']) }}".replace('__ID__', row.id);
                                // ${avatarHtml}
                                return `<div class="staff-info-cell">
                                            <span class="staff-name">${data}</span>
                                        </div>`;
                            }
                        },
                        { data: "email" },
                        { data: "phone_number" },
                        // {
                        //     data: "department_name",
                        //     render: function (data) {
                        //         if (data === '-') return data;
                        //         return `<span class="badge-dept" style="white-space: nowrap;"><i class="fas fa-users"></i> ${data}</span>`;
                        //     }
                        // },
                        {
                            data: "business_name",
                            // render: function (data) {
                            //     if (data === '-') return data;
                            //     return `<span class="badge-company" style="white-space: nowrap;"><i class="fas fa-building"></i> ${data}</span>`;
                            // }
                        },
                        {
                            data: "is_deactivate",
                            render: function (data, type, row) {
                                if (data == 0) {
                                    return `<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200" style="border-color: #dbfce7 !important;">Active</span>`;
                                } else {
                                    return `<span class="px-3 py-1 rounded-full text-xs font-semibold border" style="background-color: #fee2e2; color: #b91c1c; border-color: #fee2e2 !important;">Deactive</span>`;
                                }
                            }
                        },
                        { data: "created_at" },
                        {
                            "data": "id",
                            "orderable": false,
                            "render": function (data, type, row) {
                                var profileUrl = "{{ route('superAdmin-staff-profile', ['id' => '__ID__']) }}".replace('__ID__', data);
                                return `<a href="${profileUrl}" style="display:inline-flex; align-items:center; gap:4px; color:#3b82f6; font-size:12px; font-weight:600; text-decoration:none; border:1px solid #bfdbfe; border-radius:8px; padding:5px;">
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
            // $('#staff_data_find').on('click', function () {
                // $('#myModal').hide();
                // selectedIds = [];
                // $('#selectAllCheckbox').prop('checked', false);
                // $('.selectCheckbox_model').prop('checked', false);
            // });
            $('#staff_data_find').on('input', function () {
                var searchValue = $(this).val();
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var business_id = $('.business_filter').val();
                var status_filter = $('.status_filter').val();
                table.destroy();
                datatable(searchValue, character_page_sorting, number_page_sorting, business_id, status_filter);
                applyPagination(number_page_sorting);
            });
            $('.character_page_sorting').change(function () {
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var searchValue = $('#staff_data_find').val();
                var business_id = $('.business_filter').val();
                var status_filter = $('.status_filter').val();
                table.destroy();
                datatable(searchValue, character_page_sorting, number_page_sorting, business_id, status_filter);
                applyPagination(number_page_sorting);
            });
            $('.number_page_sorting').change(function () {
                var searchValue = $('#staff_data_find').val();
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var business_id = $('.business_filter').val();
                var status_filter = $('.status_filter').val();
                table.destroy();
                datatable(searchValue, character_page_sorting, number_page_sorting, business_id, status_filter);
                applyPagination(number_page_sorting);
            });
            $('.business_filter').change(function () {
                var business_id = $(this).val();
                var searchValue = $('#staff_data_find').val();
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var status_filter = $('.status_filter').val();
                table.destroy();
                datatable(searchValue, character_page_sorting, number_page_sorting, business_id, status_filter);
                applyPagination(number_page_sorting);
            });
            $('.status_filter').change(function () {
                var status_filter = $(this).val();
                var searchValue = $('#staff_data_find').val();
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var business_id = $('.business_filter').val();
                table.destroy();
                datatable(searchValue, character_page_sorting, number_page_sorting, business_id, status_filter);
                applyPagination(number_page_sorting);
            });
            // Company search functionality
            $('#companySearch').on('keyup', function () {
                var value = $(this).val().toLowerCase();
                $(this).closest('.dropdown-options').find('li').each(function () {
                    if ($(this).text().toLowerCase().indexOf(value) > -1) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
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
            $('.delete_staff_btn').on('click', function (event) {
                event.preventDefault();
                if (selectedIds.length === 0) return;
                if (confirm("Are you sure you want to delete the selected staff member(s)?")) {
                    $.ajax({
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        type: 'POST',
                        url: "{{ route('superAdmin-delete-staff') }}",
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
                                $('#staff_count').html('(' + response.staff_count + ')');
                            } else {
                                toastr["error"](response.message)
                            }
                        }
                    });
                }
            });
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
