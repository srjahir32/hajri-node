
        var selectedIds = [];
        var table;
        $(document).ready(function () {
            function datatable(searchValue = null, month = null, year = null) {
                table = $('#staff_datas').DataTable({
                    // "lengthMenu": [[5, 10, 20], [5, 10, 20]],
                    searching: false,
                    lengthChange: false,
                    info: false,
                    responsive: true,
                    // pagingType: "full_numbers",
                    order: [
                        [0, "desc"]
                    ],
                    drawCallback: function () {
                        $('#selectAllCheckbox').on('change', function () {
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
                                $('.selectCheckbox_model').each(function () {
                                    var id = $(this).val();
                                    if (selectedIds.indexOf(id) === -1) {
                                        selectedIds.push(id);
                                    }
                                });
                            } else {
                                selectedIds = [];
                            }
                            // console.log('Selected IDs:', selectedIds);
                        });
                        $('.selectCheckbox_model').change(function () {
                            var id = $(this).val();
                            var checkedCount = $('.selectCheckbox_model:checked').length;
                            $('.selected_check_member').html(checkedCount);
                            if (checkedCount > 0) {
                                $('#myModal').show();
                            } else {
                                $('#myModal').hide();
                            }
                            if ($(this).is(':checked')) {
                                selectedIds.push(id);
                            } else {
                                const index = selectedIds.indexOf(id);
                                if (index !== -1) {
                                    selectedIds.splice(index, 1);
                                }
                            }
                        });
                        $('#closeModal').click(function () {
                            var selectedIds = [];
                            $('.selectCheckbox_model').prop('checked', false);
                            $('#selectAllCheckbox').prop('checked', false);
                            $('#myModal').hide();
                        });
                    },
                    initComplete: function (settings, json) {
                        var api = this.api();
                        if (table.rows().count() === 0) {
                            // Display image or advertisement
                            var adContent = '<tr><td colspan="9"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, add staff</div></div></td></tr>';
                            $(api.table().body()).html(adContent);
                        }
                    },
                    ajax: {
                        "url": "{{ route('payroll_leave_approve') }}",
                        "dataType": "json",
                        "type": "POST",
                        "data": {_token: "{{csrf_token()}}", 'searchValue': searchValue, 'month': month, 'year': year}
                    },
                    columns: [
                        {
                            data: 'id',
                            type: 'num',
                            render: function (data, type, row) {
                                return `<input type="checkbox" class="selectCheckbox_model" id="selectCheckbox_model" value="${row.id}">`;
                            }
                        },
                        {
                            data: "name",
                            render: function (data, type, row) {
                                var routeUrl = "{{ route('staff-profile', ':id') }}";
                                var url = routeUrl.replace(':id', row.staff_id);
                                return `
                                    <a href="${url}" class="staff-edit">
                                        <div class="user-images">
                                            <div><img src="${row.staff_photo}" class="approve-user-img" alt=""></div>
                                            <div>${data}<p class="data-sub-field">${row.department_name}</p></div>
                                        </div>
                                    </a>
                                `;
                            }
                        },
                        {"data": "created_at"},
                        {"data": "is_paid"},
                        {"data": "start_date"},
                        {"data": "end_date"},
                        {"data": "leave_type"},
                        {"data": "status"},
                        { "data": "action", "className": "action_btn"}
                        // {"data": "action"},
                    ],
                    columnDefs: [
                        {"width": "10px", "targets": 0},
                        {'targets': [0], 'orderable': false}
                    ]
                });
                $('.dataTables_length').addClass('bs-select');
            }
            var getManualSession = {!! json_encode(Session::get('manual_process_payroll')) !!};
            datatable(null,getManualSession.month,getManualSession.year)
        });
        function ApproveAndDecline(id,status){
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                url: "{{ route('check_approve_decline') }}",
                type: "POST",
                data:{
                    'id': id,
                    'status':status
                },
                success: function(response) {
                    if(response.status == 1) {
                        toastr["error"](response.message);
                    }else{
                        $.ajax({
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            },
                            url: "{{ route('leave_approve_and_decline') }}",
                            type: "POST",
                            data:{
                                'id': id,
                                'status':status
                            },
                            success: function(response) {
                                if(response.status == 1) {
                                    toastr["success"](response.message);
                                    table.ajax.reload(null, false);
                                }else{
                                    toastr["error"](response.message);
                                }
                            },
                        });
                    }
                },
            });
        }
    

/* ---- raw @section(scripts) remainder ---- */

    
