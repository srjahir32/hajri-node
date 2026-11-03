
        var table;
        var selectedIds = [];
        var selectedShiftData = {};
        $(document).ready(function () {
            var working_shift_id = <?= $working_shift_id ?>;
            function datatable(searchValue = null) {
                table = $('#staff_datas').DataTable({
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
                    drawCallback: function () {
                        var api = this.api();
                        // Fetch the first row data directly without looping
                        var firstRowData = api.row().data();
                        $('#selectAllCheckbox').on('change', function () {
                            var isChecked = $(this).prop('checked');
                            $('.selectCheckbox_model').prop('checked', isChecked);
                            var checkedCount = $('.selectCheckbox_model:checked').length;
                            $('.selected_check_member').html(checkedCount);
                            var offcanvasElement = document.getElementById('shift-select');
                            var offcanvas = new bootstrap.Offcanvas(offcanvasElement);
                            if (checkedCount > 0) {
                                if(api.row().data().working_type == "Rotational Shift") {
                                    document.querySelector('input[name="working_shift_id"]:first-child').checked = true;
                                    document.querySelector('input[name="type"]:first-child').checked = true;
                                    offcanvas.show();
                                }
                                $('#myModal').show();
                                $('.approve_staff_data').addClass('review-details-container');
                            } else {
                                $('#myModal').hide();
                                if(api.row().data().working_type == "Rotational Shift") {
                                    offcanvas.hide();
                                }
                                $('.approve_staff_data').removeClass('review-details-container');
                            }
                            if (isChecked) {
                                $('.selectCheckbox_model').each(function () {
                                    var id = $(this).val();
                                    if (selectedIds.indexOf(id) === -1) {
                                        selectedIds.push(id);
                                    }
                                });
                                selectedIds.forEach(id => {
                                    // selectedShiftData[id] = $('input[name="working_shift_id"]:checked').val();
                                    selectedShiftData[id] = {
                                        start_index: $('input[name="working_shift_id"]:checked').val() || '0',
                                        type: $('input[name="type"]:checked').val() || '0' // Default type: Daily
                                    };
                                });
                            } else {
                                selectedIds = [];
                                selectedShiftData = {};
                            }
                            // console.log('Selected IDs:', selectedIds);
                        });

                        $('.selectCheckbox_model').change(function () {
                            var id = $(this).val();
                            var checkedCount = $('.selectCheckbox_model:checked').length;
                            $('.selected_check_member').html(checkedCount);
                            var offcanvasElement = document.getElementById('shift-select');
                            var offcanvas = new bootstrap.Offcanvas(offcanvasElement);
                            if (checkedCount > 0) {
                                $('#myModal').show();
                                $('.approve_staff_data').addClass('review-details-container');
                            } else {
                                if(firstRowData.working_type == "Rotational Shift") {
                                    offcanvas.hide();
                                }
                                $('#myModal').hide();
                            }
                            if ($(this).is(':checked')) {
                                selectedIds.push(id);
                                // if (!selectedShiftData[id]) {
                                    selectedShiftData[id] = {
                                        start_index: $('input[name="working_shift_id"]:checked').val() || '0',
                                        type: $('input[name="type"]:checked').val() || '0' // Default type: Daily
                                    };
                                // }
                                // selectedShiftData[id] = '0';
                                if (firstRowData.working_type == "Rotational Shift") {
                                    document.querySelector('input[name="working_shift_id"]:first-child').checked = true;
                                    document.querySelector('input[name="type"]:first-child').checked = true;
                                    offcanvas.show();
                                }
                            } else {
                                const index = selectedIds.indexOf(id);
                                if (index !== -1) {
                                    selectedIds.splice(index, 1);
                                }
                                // Remove ID from selectedShiftData
                                delete selectedShiftData[id];
                            }
                            // console.log('Selected IDs:', selectedIds);
                        });

                    },
                    ajax: {
                        "url": "{{ route('assign_staff') }}",
                        "dataType": "json",
                        "type": "POST",
                        "data": {_token: "{{csrf_token()}}",'searchValue':searchValue,"working_shift_id":working_shift_id},
                        "dataSrc": "data"
                    },
                    initComplete: function (settings, json) {
                        var api = this.api();
                        if (table.rows().count() === 0) {
                            // Display image or advertisement
                            var adContent = '<tr><td colspan="7"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, assign staff</div></div></td></tr>';
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
                        {"data": "staff_id"},
                        // { "data": "salary_amount" },
                        {"data": "phone_number"},
                        // { "data": "action", "className": "action_btn"},
                    ],
                    // createdRow: function (row, data, dataIndex) {
                    //     $(row).attr('id', 'storie_col_' + data['id']);
                    // },
                    columnDefs: [
                        {"width": "10px", "targets": 0},
                        // { "width": "40%", "targets": 3 },
                        {'targets': [0], 'orderable': false}
                    ]
                });
            }
            $(document).off('change', '#shift-select input[type="radio"], .working_type input[type="radio"]')
            .on('change', '#shift-select input[type="radio"], .working_type input[type="radio"]', function () {
                var selectedShift = $('input[name="working_shift_id"]:checked').val();
                var selectedType = $('input[name="type"]:checked').val() || '0'; // Default type: Daily
                var isSelectAllChecked = $('#selectAllCheckbox').prop('checked');
                if (isSelectAllChecked) {
                    // Apply to all selected IDs
                    selectedIds.forEach(id => {
                        if (!selectedShiftData[id]) {
                            selectedShiftData[id] = {};
                        }
                        if ($(this).is('#shift-select input[type="radio"]')) {
                            selectedShiftData[id]['start_index'] = selectedShift;
                        }
                        if ($(this).is('.working_type input[type="radio"]')) {
                            selectedShiftData[id]['type'] = selectedType;
                        }
                    });
                } else {
                    // Apply only to the last selected ID
                    var lastSelectedId = selectedIds[selectedIds.length - 1];
                    if (lastSelectedId) {
                        if (!selectedShiftData[lastSelectedId]) {
                            selectedShiftData[lastSelectedId] = {};
                        }
                        if ($(this).is('#shift-select input[type="radio"]')) {
                            selectedShiftData[lastSelectedId]['start_index'] = selectedShift;
                        }
                        if ($(this).is('.working_type input[type="radio"]')) {
                            selectedShiftData[lastSelectedId]['type'] = selectedType;
                        }
                    }
                }
            });
            datatable();

            $('.dataTables_length').addClass('bs-select');
            $('#staff_data_find').on('input', function () {
                var searchValue = $(this).val();
                table.destroy();
                datatable(searchValue);
            });
        });
        $('.cancel_selected_id').click(function () {
            $('#myModal').hide();
            selectedIds = [];
            // console.log(selectedIds);
            $('#selectAllCheckbox').prop('checked', false);
            $('.selectCheckbox_model').prop('checked', false);
        });

        $('.save-staff-btn').on('click',function (){
            if(selectedIds.length == 0){
                toastr["error"]("Please select staff");
            }else{
                $('.save-staff-btn').prop('disabled', true);
                var working_shift_id = <?= $working_shift_id ?>;
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('store_assign_shift_staff') }}",
                    data: {
                        working_shift_id:working_shift_id,
                        selectedIds:selectedIds,
                        selectedShiftData:selectedShiftData
                    },
                    success: function (response) {
                        if (response['status'] == 1) {
                            selectedIds = [];
                            toastr["success"](response.message);
                            $('#myModal').hide();
                            $('.approve_staff_data').removeClass('review-details-container');
                            $('#selectAllCheckbox').prop('checked', false);
                            table.ajax.reload(null, false);
                            $('.save-staff-btn').prop('disabled', false);
                            $('#assign_staff_count').html('('+response.data+')');
                        } else {
                            toastr["error"](response.message)
                        }
                    }
                });
            }
        })
    

/* ---- raw @section(scripts) remainder ---- */

    
