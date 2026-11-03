
        var selectedIds = [];
        var table;
        function datatable(searchValue = null,department_id = null) {
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
                    $('#selectAllCheckboxProcess').on('change', function () {
                        var isChecked = $(this).prop('checked');
                        $('.selectCheckbox_process_model').prop('checked', isChecked);
                        var checkedCount = $('.selectCheckbox_process_model:checked').length;
                        $('.selected_check_member').html(checkedCount);
                        if (checkedCount > 0) {
                            $('#myModal').show();
                        } else {
                            $('#myModal').hide();
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
                        } else {
                            $('#myModal').hide();
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
                    "url": "{{ route('all-approval-punches') }}",
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
                        var adContent = '<tr><td colspan="8"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, add staff</div></div></td></tr>';
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
                    { "data": "date" },
                    { "data": "in_time" },
                    { "data": "out_time" },
                    { "data": "status" },
                    { "data": "action", "className": "action_btn"},
                    {
                        orderable: false,
                        data: null,
                        render: function (data, type, row) {
                            return `<a href="#" class="view-data">View</a>`;

                        }
                    }
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
        function format(d) {
            var total = d.requested.length;
            var requested = '';
            var i = 1;
            $.each(d.requested, function(index, item) {
                var suffix = ["th", "st", "nd", "rd"];
                var v = i % 100;
                var number = (i++) + (suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0]);

                var in_time = item.in_time + ' ' + item.date;
                var inTime = new Date(in_time);
                var formattedInDate = inTime.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' });
                var formattedInTime = inTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                var final_in_time = formattedInTime + ', ' + formattedInDate;

                var final_out_time = "-";
                if(item.out_time != null){
                    var out_time = item.out_time + ' ' + item.date;
                    var outTime = new Date(out_time);
                    var formattedOutDate = outTime.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' });
                    var formattedOutTime = outTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    final_out_time = formattedOutTime + ', ' + formattedOutDate;
                }

                // Parse the time string into hours, minutes, and seconds
                var timeParts = item.total_time.split(':');
                var hours = parseInt(timeParts[0]);
                var minutes = parseInt(timeParts[1]);
                var formattedHours = Math.floor((hours + minutes / 60)).toString().padStart(2, '0');
                var formattedMinutes = (minutes % 60).toString().padStart(2, '0');
                var total_hours = formattedHours + ':' + formattedMinutes;

                // console.log(item.attendance_status);
                var attendance_status_btn = '';
                if(item.attendance_status == 0){
                    attendance_status_btn += '<button type="button" class="btn btn-outline-warning btn-pending">Pending</button>';
                }else if(item.attendance_status == 1){
                    attendance_status_btn +='<button type="button" class="btn btn-outline-success btn-approve">Approve</button>';
                }else if(item.attendance_status == 2){
                    attendance_status_btn +='<button type="button" class="btn btn-outline-danger btn-decline">Decline</button>';
                }
                var approve_decline_btn = '';
                if(item.attendance_status == 0){
                    approve_decline_btn += '<button class="atten-coming-btn approve_success" onclick="approveDecline(' + item.id + ', \'' + final_out_time + '\',\''+0+'\' )">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">'+
                        '<path fill-rule="evenodd" clip-rule="evenodd" d="M13.6882 3.98043C13.8835 4.17569 13.8835 4.49228 13.6882 4.68754L6.35486 12.0209C6.15959 12.2161 5.84301 12.2161 5.64775 12.0209L2.31442 8.68754C2.11915 8.49228 2.11915 8.17569 2.31442 7.98043C2.50968 7.78517 2.82626 7.78517 3.02152 7.98043L6.0013 10.9602L12.9811 3.98043C13.1763 3.78517 13.4929 3.78517 13.6882 3.98043Z" fill="#808080" />'+
                        '</svg>'+
                        '</button>'+
                        '<button class="atten-coming-btn reject_danger" onclick="approveDecline(' + item.id + ', \'' + final_out_time + '\',\''+1+'\' )">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">'+
                        '<path fill-rule="evenodd" clip-rule="evenodd" d="M2.84154 2.84154C3.07296 2.61011 3.44817 2.61011 3.67959 2.84154L13.1611 12.323C13.3925 12.5544 13.3925 12.9296 13.1611 13.1611C12.9296 13.3925 12.5544 13.3925 12.323 13.1611L2.84154 3.67959C2.61011 3.44817 2.61011 3.07296 2.84154 2.84154Z" fill="#808080" />'+
                        '<path fill-rule="evenodd" clip-rule="evenodd" d="M13.1611 2.84154C13.3925 3.07296 13.3925 3.44817 13.1611 3.67959L3.67959 13.1611C3.44817 13.3925 3.07296 13.3925 2.84154 13.1611C2.61011 12.9296 2.61011 12.5544 2.84154 12.323L12.323 2.84154C12.5544 2.61011 12.9296 2.61011 13.1611 2.84154Z" fill="#808080" />'+
                        '</svg>'+
                        '</button>';
                }
                requested += '<div class="row main-view-punches">' +
                    '<div class="col-2" style="align-content: center;">' +
                    '<button class="staff-view-punches staff-view-svg">' +
                    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M4.08301 11.6663C4.08301 10.2079 5.24967 9.09961 6.64967 9.09961H9.62467C11.083 9.09961 12.1913 10.2663 12.1913 11.6663" stroke="#2F8CFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
                    '<path d="M9.91706 3.14922C10.8504 4.08255 10.8504 5.65755 9.91706 6.59089C8.98372 7.52422 7.40872 7.52422 6.47539 6.59089C5.54206 5.65755 5.54206 4.08255 6.47539 3.14922C7.40872 2.21589 8.92539 2.21589 9.91706 3.14922" stroke="#2F8CFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
                    '<path d="M1.16699 7.00065H4.08366" stroke="#2F8CFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
                    '<path d="M2.91699 8.16732L4.08366 7.00065L2.91699 5.83398" stroke="#2F8CFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
                    '</svg>'+ number +'</button>' +
                    '</div>' +
                    '<div class="col-3 staff-punches-time">' +
                    '<div class="punches-time-inner">'+
                    '<div>'+
                    '<p>in time:</p>' +
                    '<p>out time:</p>' +
                    '</div>'+
                    '<div class="staff-view-time">'+
                    '<p>'+final_in_time +'</p>' +
                    '<p>'+final_out_time+'</p>' +
                    '</div>'+
                    '</div>'+
                    '</div>' +
                    '<div class="col-3 staff-punches-time">' +
                    '<div class="punches-time-inner">'+
                    '<div>'+
                    '<p>Type:</p>' +
                    '<p>Total Hours:</p>' +
                    '</div>'+
                    '<div class="staff-view-time">'+
                    '<p>Manual</p>' +
                    '<p>'+total_hours+'</p>' +
                    '</div>'+
                    '</div>'+
                    '</div>' +
                    '<div class="col-2" style="align-content: center;">' + attendance_status_btn+'</div>'+
                    '<div class="col-2" style="align-content: center;">' +
                    '<div class="approve-main-sec">'+approve_decline_btn+'</div>' +
                    '</div>' +
                    '</div>';
            });
            return (
                '<div class = "main-data-detail">' +
                '<div class = "entries-data">' +
                '<div class = "row">' +
                '<div class = "col-1" style="max-width:40px">'+
                '<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M15.0664 9.71484V15.2847L19.4445 17.9533" stroke="#808080" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<path d="M5.25879 10.9294C6.98013 6.06236 11.9131 3.10145 17.0178 3.8712C22.1225 4.64096 25.963 8.92484 26.1726 14.083C26.3822 19.2412 22.902 23.8226 17.8765 25.004" stroke="#808080" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<path fill-rule="evenodd" clip-rule="evenodd" d="M12.4997 26.2555H4.37135C4.02603 26.2555 3.74609 25.9755 3.74609 25.6302V25.1225C3.75022 23.678 4.92019 22.508 6.36468 22.5039H10.5064C11.9509 22.508 13.1209 23.678 13.125 25.1225V25.6302C13.125 25.9755 12.8451 26.2555 12.4997 26.2555Z" stroke="#808080" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<path fill-rule="evenodd" clip-rule="evenodd" d="M8.43559 19.3771C7.05561 19.3771 5.93641 18.2594 5.93457 16.8794C5.93274 15.4994 7.04897 14.3787 8.42895 14.375C9.80893 14.3713 10.9311 15.4861 10.9367 16.866C10.9393 17.5311 10.677 18.1698 10.2076 18.641C9.73832 19.1122 9.10065 19.3771 8.43559 19.3771Z" stroke="#808080" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
                '</svg>' +
                '</div>'+
                '<div class="col-11">'+
                '<p>This employee has '+total+' entries today</p>' +
                '<p class="clr-p">Total approved hours: '+d.total_time+' hrs</p>' +
                '</div>'+
                '</div>' +
                '</div>' +
                '<div class="attendance-view-punches">'+requested+'</div>' +
                '</div>'
            );
        }
        function initializeViewDataHandler() {
            table.on('click', 'a.view-data', function (e) {
                e.preventDefault();
                let button = $(this);
                let tr = button.closest('tr');
                let row = table.row(tr);
                if (row.child.isShown()) {
                    row.child.hide();
                    button.text('View');
                    button.removeClass('expanded');
                } else {
                    row.child(format(row.data())).show();
                    button.text('Hide');
                    button.addClass('expanded');
                }
            });
        }
        initializeViewDataHandler();

        function approveDecline(id,final_out_time,status){
            if(final_out_time == '-' && status == 0){
                toastr["error"]("Not approved without out time");
            }else if(final_out_time == '-' && status == 1){
                toastr["error"]("Not decline without out time");
            }else{
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    url: "{{ route('attendance_approve_decline') }}",
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
        }
        function allApproveDecline(staff_id,date,punchout_time,status){
            if(punchout_time == '-' && status == 0){
                toastr["error"]("Not all Approve without out time");
            }else if(punchout_time == '-' && status == 1){
                toastr["error"]("Not all decline without out time");
            }else{
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    url: "{{ route('all_attendance_approve_decline') }}",
                    type: "POST",
                    data:{
                        'staff_id': staff_id,
                        'date':date,
                        'status': status
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

        }
    

/* ---- raw @section(scripts) remainder ---- */

    
