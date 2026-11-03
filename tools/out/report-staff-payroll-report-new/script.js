
    var start_month = new Date();
    start_month.setMonth(start_month.getMonth() - 1);
    var startDate = new Date(start_month);
    var endDate = new Date(new Date().getFullYear(), new Date().getMonth(), 0);

    $('#datepicker').datepicker({
        format: 'M yyyy',
        startView: 'months',
        minViewMode: 'months',
        endDate: endDate // Disable future months
    });
    var startDateFormatted = start_month.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    $('#datepicker').datepicker('setDate', new Date(startDateFormatted));
    var table;
    function downloadDatatable(month = null , year = null) {
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
            ajax: {
                "url": "{{ route('staff_report_download_list') }}",
                "dataType": "json",
                "type": "POST",
                "data": { _token: "{{csrf_token()}}",
                    'month': month,
                    'year': year
                },
                "dataSrc": "data"
            },
            initComplete: function (settings, json) {
                var api = this.api();
                if (table.rows().count() === 0) {
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
    var start_month = $("input[name='start_month']").val();
        // Split the input string into month and year
    var parts = start_month.split(' ');
    var month_str = parts[0]; // Extract month string
    var year_str = parts[1]; // Extract year string
    // Create a date object using the month and year
    var date = new Date(Date.parse(month_str + " 1, " + year_str));
    // Extract the month and year values from the date object
    var month = date.getMonth() + 1; // Add 1 because getMonth() returns zero-based index
    var year = date.getFullYear();

    downloadDatatable(month,year);
    // $('#staff_data_find').on('input', function () {
    //     var searchValue = $(this).val();
    //     process_table.destroy();
    //     datatable(searchValue);
    // });

    $('.attendance_status_month ').on('change',function(){
        var start_month = $("input[name='start_month']").val();
        var parts = start_month.split(' ');
        var month_str = parts[0];
        var year_str = parts[1];
        var date = new Date(Date.parse(month_str + " 1, " + year_str));
        var month = date.getMonth() + 1;
        var year = date.getFullYear();
        table.destroy();
        downloadDatatable(month,year);
    });

    function downloadPayrolls(id){
        var url = "{{ route('payroll_export') }}";
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



