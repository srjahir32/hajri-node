
    $('#back_button').click(function() {
        localStorage.setItem('step2-next-button', 'true');
        window.location.href = 'payroll-approvals';
    });
    var table;
    var selectedIds = [];
    function datatable(searchValue = null,department_id = null) {
        table = $('.payroll_process_datas').DataTable({
            // "lengthMenu": [[5, 10, 20], [5, 10, 20]],
            lengthMenu: [[10, 20, 50, -1], [10, 20, 50, "All"]],
            // dom: '<"float-left"B><"float-right"f>rt<"row"<"col-sm-4"l><"col-sm-4"i><"col-sm-4"p>>',
            searching: false,
            // lengthChange: false,
            info: false,
            responsive: true,
            // pagingType: "full_numbers",
            order: [
                // [0, "desc"]
            ],
            drawCallback: function () {
                $('#selectAllCheckbox').on('change', function () {
                    var isChecked = $(this).prop('checked');
                    $('.selectCheckbox_model').prop('checked', isChecked);
                    var checkedCount = $('.selectCheckbox_model:checked').length;
                    $('.selected_check_member').html(checkedCount);
                    if (checkedCount > 0) {
                        $('#myModal').show();
                        $('.approve-main-content').addClass('review-details-container');
                    } else {
                        $('#myModal').hide();
                        $('.approve-main-content').removeClass('review-details-container');
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

                selectAllCheckboxes();

                $('.selectCheckbox_model').change(function () {
                    var id = $(this).val();
                    var checkedCount = $('.selectCheckbox_model:checked').length;
                    $('.selected_check_member').html(checkedCount);
                    if (checkedCount > 0) {
                        $('#myModal').show();
                        $('.approve-main-content').addClass('review-details-container');
                    } else {
                        $('#myModal').hide();
                        $('.approve-main-content').removeClass('review-details-container');
                    }
                    if ($(this).is(':checked')) {
                        selectedIds.push(id);
                    } else {
                        const index = selectedIds.indexOf(id);
                        if (index !== -1) {
                            selectedIds.splice(index, 1);
                        }
                    }
                    // console.log('Selected IDs:', selectedIds);
                });
                $('#closeModal').click(function () {
                    selectedIds = [];
                    $('.selectCheckbox_model').prop('checked', false);
                    $('#selectAllCheckbox').prop('checked', false);
                    $('#myModal').hide();
                    $('.approve-main-content').removeClass('review-details-container');
                    // console.log('Selected IDs:', selectedIds);
                });
            },
            ajax: {
                "url": "{{ route('all-total-pay-review') }}",
                "dataType": "json",
                "type": "POST",
                "data": { _token: "{{csrf_token()}}",
                    'searchValue': searchValue,
                    'department_id': department_id,
                },
                "dataSrc": "data"
            },
            initComplete: function (settings, json) {
                var api = this.api();
                if (table.rows().count() === 0) {
                    // Display image or advertisement
                    var adContent = '<tr><td colspan="11"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, add staff</div></div></td></tr>';
                    $(api.table().body()).html(adContent);
                }
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
                        var routeUrl = "{{ route('staff-profile-new', ':id') }}";
                        var url = routeUrl.replace(':id', row.id);
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
                { "data": "total_working_hours" },
                { "data": "worked_hour" },
                { "data": "overtime" },
                { "data": "salary" },
                { "data": "base_salary" },
                { "data": "paid_leave_income" },
                { "data": "overtime_salary" },
                { "data": "deduction" },
                { "data": "net_salary" },
                // { "data": "action", "className": "action_btn"},
            ],
            // createdRow: function (row, data, dataIndex) {
            //     $(row).attr('id', 'storie_col_' + data['id']);
            // },
            columnDefs: [
                { "width": "10px", "targets": 0 },
                // { "width": "40%", "targets": 3 },
                {'targets': [0], 'orderable': false}
            ]
        });
        $('.dataTables_length').addClass('bs-select');
    }

    function selectAllCheckboxes() {
        $('.selectCheckbox_model').prop('checked', $('#selectAllCheckbox').prop('checked'));
    }

    datatable();
    $('#staff_data_find').on('input', function () {
        var searchValue = $(this).val();
        table.destroy();
        datatable(searchValue);
    });
    $(document).on('click', '.selectDropdown ul li', function() {
        var department_id = $(this).find('a').data('id'); // Retrieve the data-id attribute from the <a> element inside the <li>
        var searchValue = null;
        table.destroy();
        datatable(searchValue,department_id);
    });
    $('.cancel_selected_id').click(function () {
        $('#myModal').hide();
        selectedIds = [];
        // console.log(selectedIds);
        $('#selectAllCheckbox').prop('checked', false);
        $('.selectCheckbox_model').prop('checked', false);
    });

    $('#approve_step2_btn').on('click',function (event){
        event.preventDefault();
        if (table.rows().count() === 0) {
            localStorage.setItem('step2-next-button', 'true');
            location.href = '/payroll/payroll-approvals-new'
        }else{
            if(selectedIds.length == 0){
                toastr["error"]("Please select staff")
            }else {
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('payroll_total_pay_review') }}",
                    data: {
                        "selectedIds": selectedIds
                    },
                    success: function (response) {
                        selectedIds = [];
                        if (response['status'] == 1) {
                            $('#selectAllCheckbox').prop('checked', false);
                            $('#myModal').hide();
                            $('.approve-main-content').removeClass('review-details-container');
                            toastr["success"](response.message);
                            table.ajax.reload(null, false);
                        } else {
                            toastr["error"](response.message)
                        }
                    }
                });
            }
        }
    })
    

/* ---- raw @section(scripts) remainder ---- */


