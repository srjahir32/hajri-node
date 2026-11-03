
        var process_table;
        var process_selectedIds = [];
        function datatable(searchValue = null,department_id = null) {
            // Destroy existing DataTable instance if it exists
            if ($.fn.DataTable.isDataTable(process_table)) {
                process_table.clear().destroy();
            }
            process_table = $('.process-payroll-datas').DataTable({
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
                    $('#selectAllCheckboxProcess').on('change', function () {
                        var isChecked = $(this).prop('checked');
                        $('.selectCheckbox_process_model').prop('checked', isChecked);
                        var checkedCount = $('.selectCheckbox_process_model:checked').length;
                        $('.selected_check_member').html(checkedCount);
                        if (checkedCount > 0) {
                            $('#myModal').show();
                            $('.approve-main-content').addClass('review-details-container');
                        } else {
                            $('#myModal').hide();
                            $('.approve-main-content').removeClass('review-details-container');
                        }
                        if (isChecked) {
                            $('.selectCheckbox_process_model').each(function () {
                                var id = $(this).val();
                                if (process_selectedIds.indexOf(id) === -1) {
                                    process_selectedIds.push(id);
                                }
                            });
                        } else {
                            process_selectedIds = [];
                        }
                    });
                    $('.selectCheckbox_process_model').change(function () {
                        var id = $(this).val();
                        var checkedCount = $('.selectCheckbox_process_model:checked').length;
                        $('.selected_check_member').html(checkedCount);
                        if (checkedCount > 0) {
                            $('#myModal').show();
                            $('.approve-main-content').addClass('review-details-container');
                        } else {
                            $('#myModal').hide();
                            $('.approve-main-content').removeClass('review-details-container');
                        }
                        if ($(this).is(':checked')) {
                            process_selectedIds.push(id);
                        } else {
                            const index = process_selectedIds.indexOf(id);
                            if (index !== -1) {
                                process_selectedIds.splice(index, 1);
                            }
                        }
                        // console.log('Selected IDs:', selectedIds);
                    });
                },
                ajax: {
                    "url": "{{ route('all-process-payroll') }}",
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
                    if (process_table.rows().count() === 0) {
                        // Display image or advertisement
                        var adContent = '<tr><td colspan="5"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, add staff</div></div></td></tr>';
                        $(api.table().body()).html(adContent);
                    }
                },
                columns: [
                    {
                        data: 'id',
                        type: 'num',
                        render: function (data, type, row) {
                            return `<input type="checkbox" class="selectCheckbox_process_model" id="selectCheckbox_process_model" value="${row.id}">`;
                        }
                    },
                    {
                        data: "name",
                        render: function (data, type, row) {
                            var routeUrl = "{{ route('staff-profile', ':id') }}";
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
                    { "data": "staff_id" },
                    { "data": "phone_number" },
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
        datatable();
        var download_table;
        var download_selectedIds = [];
        function downloadDatatable() {
            if ($.fn.DataTable.isDataTable(download_table)) {
                download_table.clear().destroy();
            }
            download_table = $('.download-payroll-datas').DataTable({
                // "lengthMenu": [[5, 10, 20], [5, 10, 20]],
                // lengthMenu: [[10, 20, 50, -1], [10, 20, 50, "All"]],
                // dom: '<"float-left"B><"float-right"f>rt<"row"<"col-sm-4"l><"col-sm-4"i><"col-sm-4"p>>',
                searching: false,
                lengthChange: false,
                info: false,
                responsive: true,
                // pagingType: "full_numbers",
                order: [
                    // [0, "desc"]
                ],
                ajax: {
                    "url": "{{ route('all-download-payroll') }}",
                    "dataType": "json",
                    "type": "POST",
                    "data": { _token: "{{csrf_token()}}",
                        // 'searchValue': searchValue,
                    },
                    "dataSrc": "data"
                },
                initComplete: function (settings, json) {
                    var api = this.api();
                    if (download_table.rows().count() === 0) {
                        // Display image or advertisement
                        var adContent = '<tr><td colspan="5"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, add staff</div></div></td></tr>';
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
                    { "data": "staff_payment_type" },
                    { "data": "report_cycle" },
                    { "data": "report_type" },
                    { "data": "generated_on" },
                    { "data": "action"},
                ],
                // createdRow: function (row, data, dataIndex) {
                //     $(row).attr('id', 'storie_col_' + data['id']);
                // },
                columnDefs: [
                    // { "width": "10px", "targets": 0 },
                    // { "width": "40%", "targets": 3 },
                    {'targets': [0], 'orderable': false}
                ]
            });
            $('.dataTables_length').addClass('bs-select');
        }
        // downloadDatatable();
        $('#staff_data_find').on('input', function () {
            var searchValue = $(this).val();
            process_table.destroy();
            datatable(searchValue);
        });
        
        if (localStorage.getItem('step2-next-button') === 'true') {
            //remove active in step 1 2 4
            $('.step1, .step3, .step4').removeClass('active');
            $('#step1, #step3, #step4').removeClass('staff_info_active');
            $('.step-1, .step-3, .step-4').removeClass('info_active');
             //add active in step 3
            $('.step2').addClass('active');
            $('#step2').addClass('staff_info_active');
            $('.step-2').addClass('info_active');
            $('.header_title').html('Process Payroll');

            // $('.step1-number, .step2-number').addClass('d-none');
            // $('.step1-check, .step2-check').addClass('check-active');

            localStorage.removeItem('step2-next-button');
        }
        if (localStorage.getItem('step3-next-button') === 'true') {
            //remove active in step 1 2 4
            $('.step1, .step2, .step4').removeClass('active');
            $('#step1, #step2, #step4').removeClass('staff_info_active');
            $('.step-1, .step-2, .step-4').removeClass('info_active');
            //add active in step 3
            $('.step3').addClass('active');
            $('#step3').addClass('staff_info_active');
            $('.step-3').addClass('info_active');
            $('.header_title').html('Process Payroll');

            // $('.step1-number, .step2-number').addClass('d-none');
            // $('.step1-check, .step2-check').addClass('check-active');

            localStorage.removeItem('step3-next-button');
        }
        // //step-1 click
        $('.approval-back-btn').click(function(){
            $('.profile-step').addClass('active');
            $('.page-title-area').removeClass('active');
            $('.payroll-approval').addClass('active');
            //add active in step 1
            $('.step1').addClass('active');
            $('#step1').addClass('staff_info_active');
            $('.step-1').addClass('info_active');
            //remove active in step 2 3 4
            $('.step2, .step3, .step4').removeClass('active');
            $('#step2, #step3, #step4').removeClass('staff_info_active');
            $('.step-2, .step-3, .step-4').removeClass('info_active');

            $('.step1-check').addClass('info_active');
            $('.step2-check, .step3-check, .step4-check').removeClass('info_active');
            $('.header_title').html('Payroll Approvals');
        })
        // //step-2 click
        $('.review-back-btn').click(function(){
            $('.profile-step,.page-title-area, .payroll-approval').removeClass('active');
            // $('.payroll-approval').removeClass('active');
            $('.approval-back').addClass('active');
             // Hide the second span on the first page
            $('.step1-number').addClass('d-none');
            $('.step1-check').addClass('check-active');

            $('.step1-check, .step3-check, .step4-check').removeClass('info_active');
            $('.step2-check').addClass('info_active');
            //remove active in step 1 3 4
            $('.step1, .step3, .step4').removeClass('active');
            $('#step1, #step3, #step4').removeClass('staff_info_active');
            $('.step-1, .step-3, .step-4').removeClass('info_active');
            //add active in step 2
            $('.step2').addClass('active');
            $('#step2').addClass('staff_info_active');
            $('.step-2').addClass('info_active');
            $('.header_title').html('Review Details');
        })
        // //step-3 click
        $('.download-back-btn').click(function(){
            $('.profile-step,.page-title-area').removeClass('active');
            $('.reviews').addClass('active');

            $('.step1-number, .step2-number').addClass('d-none');
            $('.step1-check, .step2-check').addClass('check-active');

            $('.step1-check, .step2-check, .step4-check').removeClass('info_active');
            $('.step3-check').addClass('info_active');
            //remove active in step 1 2 4
            $('.step1, .step2, .step4').removeClass('active');
            $('#step1, #step2, #step4').removeClass('staff_info_active');
            $('.step-1, .step-2, .step-4').removeClass('info_active');

            $('.step3').addClass('active');
            $('#step3').addClass('staff_info_active');
            $('.step-3').addClass('info_active');
            $('.header_title').html('Process Payroll');
            $('.holiday-policy-count').html('(0 Employees)');
            process_selectedIds = [];
            datatable();
        })
        $('#approve_btn').click(function(event) {
            event.preventDefault();
            var approve_punches_pending_count = <?= $approve_punches_pending_count?>;
            var approve_leave_pending_count = <?= $approve_leave_pending_count?>;
            if(approve_punches_pending_count == 0 && approve_leave_pending_count == 0){
                $('.approval-back').addClass('active');
                $('.payroll-approval').removeClass('active');
                $('.profile-step').removeClass('active');
                $('.step1').removeClass('active');
                $('#step1').removeClass('staff_info_active');
                $('.step-1').removeClass('info_active');

                $('.step2').addClass('active');
                $('#step2').addClass('staff_info_active');
                $('.step-2').addClass('info_active');

                $('.step1-number').addClass('d-none');
                $('.step1-check').addClass('check-active');
                $('.step1-check, .step3-check').removeClass('info_active');
                $('.step2-check').addClass('info_active');
            }else{
                toastr["error"]("Please approve punches and leaves")
            }
        })
        $('#review_btn').click(function(event) {
            var attendance_review_count = <?= $attendance_review_count?>;
            var total_pay_review_count = <?= $total_pay_review_count?>;
            if(attendance_review_count == 0 && total_pay_review_count == 0) {
                event.preventDefault();
                $('.profile-step, .page-title-area').removeClass('active');
                $('.reviews').addClass('active');
                //remove active in step 1 2
                $('.step1, .step2').removeClass('active');
                $('#step1, #step2').removeClass('staff_info_active');
                $('.step-1, .step-2').removeClass('info_active');

                $('.step3').addClass('active');
                $('#step3').addClass('staff_info_active');
                $('.step-3').addClass('info_active');
                $('.header_title').html('Process Payroll');

                $('.step2-number').addClass('d-none');
                $('.step2-check').addClass('check-active');
                $('.step1-check, .step2-check ').removeClass('info_active');
            }else{
                toastr["error"]("Please approve attendance and total pay review")
            }
        })
        $('#process_btn').click(function(event) {
            if(process_selectedIds.length == 0){
                toastr["error"]("Please select staff")
            }else{
                $('#staff_count').html(process_selectedIds.length);
                $('#myModal').hide();
                $('.approve-main-content').removeClass('review-details-container');
                event.preventDefault();
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('add-payroll-record') }}",
                    data: {
                        "selectedIds":process_selectedIds
                    },
                    success: function(response) {
                        if (response['status'] == 1) {
                            $('.profile-step, .page-title-area').removeClass('active');
                            $('.download-reports').addClass('active');
                            // remove active in step 1 2 3
                            $('.step1, .step2, .step3').removeClass('active');
                            $('#step1, #step2, #step3').removeClass('staff_info_active');
                            $('.step-1, .step-2, .step-2').removeClass('info_active');
                            // add active in step 4
                            $('.step4').addClass('active');
                            $('#step4').addClass('staff_info_active');
                            $('.step-4').addClass('info_active');

                            $('.step3-number').addClass('d-none');
                            $('.step3-check').addClass('check-active');
                            $('.step1-check, .step2-check ,.step3-check').removeClass('info_active');
                            // download_table.
                            downloadDatatable();
                        }else{
                            toastr["error"](response.message)
                        }
                    }
                });
            }
        });
        $('.cancel_process_selected_id').click(function () {
            $('#myModal').hide();
            $('.approve-main-content').removeClass('review-details-container');
            process_selectedIds = [];
            $('#selectAllCheckboxProcess').prop('checked', false);
            $('.selectCheckbox_process_model').prop('checked', false);
        });
        function downloadPayrolls(id){
            var url = '{{ route('payroll_export') }}';
            var queryParams = $.param({ payrun_id: id });
            var finalUrl = url + '?' + queryParams;
            window.location.href = finalUrl;
            if(finalUrl){
                toastr["success"]('Your files is being downloaded');
            }else {
                toastr["error"]('Somthing went wrong.');
            }
        }
    

/* ---- raw @section(scripts) remainder ---- */

    
    
