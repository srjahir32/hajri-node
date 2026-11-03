
        // $('.input-group.date').datepicker({
        //     format: 'dd, M yyyy',
        //     autoclose: true
        // });
        // $('.input-group.date').datepicker('setDate', new Date());
        var start_month = new Date();
        start_month.setMonth(start_month.getMonth());
        var startDate = new Date(start_month);
        var endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
        $('#datepicker').datepicker({
            format: 'M yyyy',
            startView: 'months',
            minViewMode: 'months',
            // endDate: endDate // Disable future months
        });

        @if(request()->month)
            $('#datepicker').datepicker('setDate', '{{request()->month}}');
        @else
            var startDateFormatted = start_month.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            $('#datepicker').datepicker('setDate', new Date(startDateFormatted));
        @endif
        var selectedIds = [];
        var table;
        $(document).ready(function () {            
            var leaveStatus = localStorage.getItem('leaveStatus');
            if(leaveStatus){
                $('.status_filter').val(leaveStatus);
                var text = $('.status_filter option:selected').text();
                var wrapper = $('.status_filter').closest('.custom-dropdown');
                wrapper.find('.selected-value').text(text);
                wrapper.find('.dropdown-options li').removeClass('selected');
                wrapper.find('.dropdown-options li[data-value="'+leaveStatus+'"]').addClass('selected');
            } else {
                $('.status_filter').val('all');
            }
            // function datatable(searchValue = null, month = null , year = null) {
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
                    drawCallback: function() {
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
                                $('.selectCheckbox_model').each(function () {
                                    var id = $(this).val();
                                    if (selectedIds.indexOf(id) === -1) {
                                        selectedIds.push(id);
                                    }
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
                        $('#closeModal').off('click').on('click', function () {
                            selectedIds = [];
                            $('.selectCheckbox_model').prop('checked', false);
                            $('#selectAllCheckbox').prop('checked', false);
                            $('#myModal').hide();
                        });
                    },
                    initComplete: function (settings, json) {
                        var api = this.api();
                        if (table.rows().count() === 0) {
                            // Display image or advertisement
                            var adContent = '<tr><td colspan="9"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found</div></div></td></tr>';
                            $(api.table().body()).html(adContent);
                        }
                    },
                    ajax: {
                        "url": "{{ route('staff_leave_attendance') }}",
                        "dataType": "json",
                        "type": "POST",
                        "data": function(d) {
                            d._token = "{{csrf_token()}}";
                            d.searchValue = $('#staff_data_find').val();
                            var start_month_val = $("input[name='start_month']").val();
                            if (start_month_val) {
                                var partes = start_month_val.split(' ');
                                var date = new Date(Date.parse(partes[0] + " 1, " + partes[1]));
                                d.month = date.getMonth() + 1;
                                d.year = date.getFullYear();
                            }
                            d.department_id = $('#department').val();
                            d.status = $('.status_filter').val();
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
                        { "data": "is_paid"},
                        { "data": "leave_type"},
                        { "data": "reason"},
                        { "data": "start_date"},
                        { "data": "end_date"},
                        { "data": "created_at"},
                        // { "data": "action"},
                        @if(auth()->user()->can('approve_leave') || auth()->user()->can('rejected_leave'))
                        { "data": "action"},
                        @endif
                    ],
                    columnDefs: [
                        { "width": "10px", "targets": 0 },
                        {'targets': [0], 'orderable': false}
                    ]
                });
                $('.dataTables_length').addClass('bs-select');
            // }
            function updateTable() {
                if ($.fn.DataTable.isDataTable('#staff_datas')) {
                    table.ajax.reload();
                }
            }

            $('.dropdown-trigger').on('click', function(e) {
                e.stopPropagation();
                $(this).closest('.custom-dropdown').toggleClass('active');
            });

            $('.dropdown-options li').on('click', function() {
                var value = $(this).data('value');
                var text = $(this).text();
                var $dropdown = $(this).closest('.custom-dropdown');
                
                $dropdown.find('.selected-value').text(text);
                $dropdown.find('.dropdown-options li').removeClass('selected');
                $(this).addClass('selected');
                $dropdown.find('.status_filter').val(value).trigger('change');
                $dropdown.removeClass('active');
            });

            $(document).on('click', function() {
                $('.custom-dropdown').removeClass('active');
            });

            $('#staff_data_find').on('input', function () {
                updateTable();
            });

            $('.status_filter').change(function () {
                var status = $(this).val();
                localStorage.setItem('leaveStatus', status);
                updateTable();
            });

            $('.attendance_status_month ').on('change',function(){
                updateTable();
            }); 
            $('#department').on('click', function () {
                $('#myModal').hide();
                selectedIds = [];
                $('#selectAllCheckbox').prop('checked', false);
                $('.selectCheckbox_model').prop('checked', false);
            });
            $('#department').on('change', function () {
                $('#myModal').hide();
                selectedIds = [];
                $('#selectAllCheckbox').prop('checked', false);
                updateTable();
            }); 
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
        $(".leave_reject_select").on('click', function(){
            if(!selectedIds || selectedIds.length === 0){
                toastr["error"]('Please select any checkboxes');
            }else{
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    url: "{{ route('leaves_reject_select') }}",
                    type: "POST",
                    data:{
                        'selectedIds': selectedIds,
                    },
                    success: function(response) {
                        if(response.status == 1) {
                            toastr["success"](response.message);
                            $('#selectAllCheckbox').prop('checked', false);
                            selectedIds = [];
                            $('#myModal').hide();
                            table.ajax.reload(null, false);
                        }else{
                            toastr["error"](response.message);
                        }
                    },
                });
            }
        });
        $(".leave_approve_selected").on('click', function(){
            if(!selectedIds || selectedIds.length === 0){
                toastr["error"]('Please select any checkboxes');
            }else{
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    url: "{{ route('leaves_approve_select') }}",
                    type: "POST",
                    data:{
                        'selectedIds': selectedIds,
                    },
                    success: function(response) {
                        if(response.status == 1) {
                            toastr["success"](response.message);
                            $('#selectAllCheckbox').prop('checked', false);
                            selectedIds = [];
                            $('#myModal').hide();
                            table.ajax.reload(null, false);
                        }else{
                            toastr["error"](response.message);
                        }
                    },
                });
            }
        }); 
    

/* ---- raw @section(scripts) remainder ---- */

    
