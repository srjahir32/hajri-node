
    $(document).ready(function() {
        $('#punches1').change(function() {
            if ($(this).is(':checked')) {
                $('#punches2').prop('checked', false);
            }
        });
        $('#punches2').change(function() {
            if ($(this).is(':checked')) {
                $('#punches1').prop('checked', false);
            }
        });
        $('#leave1').change(function() {
            if ($(this).is(':checked')) {
                $('#leave2').prop('checked', false);
            }
        });
        $('#leave2').change(function() {
            if ($(this).is(':checked')) {
                $('#leave1').prop('checked', false);
            }
        });
        $('#attendance1').change(function() {
            if ($(this).is(':checked')) {
                $('#attendance2').prop('checked', false);
            }
        });
        $('#attendance2').change(function() {
            if ($(this).is(':checked')) {
                $('#attendance1').prop('checked', false);
            }
        });
        $('#total1').change(function() {
            if ($(this).is(':checked')) {
                $('#total2').prop('checked', false);
            }
        });
        $('#total2').change(function() {
            if ($(this).is(':checked')) {
                $('#total1').prop('checked', false);
            }
        });
    });

    $('#processed_form').submit(function (event) {
        event.preventDefault();
        var formData = new FormData($(this)[0]);
        $.ajax({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            type: 'POST',
            url: "{{ route('bulk_approval_processed') }}",
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                if (response['status'] == 1) {
                    localStorage.setItem('step3-next-button', 'true');
                    // location.href = '/payroll/payroll-approvals'
                    location.href = '/payroll/payroll-approvals-new'
                } else {
                    toastr["error"]("Something want wrong");
                }
            }
        });
    });

    var start_month = new Date();
    start_month.setMonth(start_month.getMonth() - 1);
    // var startDate = new Date(start_month);
    var endDate = new Date(new Date().getFullYear(), new Date().getMonth(), 0);

    $('#datepicker').datepicker({
        format: 'M yyyy',
        startView: 'months',
        minViewMode: 'months',
        endDate: endDate // Disable future months
    });
    var getManualSession = {!! json_encode(Session::get('manual_process_payroll')) !!};
    if(getManualSession){
        var monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        // Get the numeric month value from data
        var monthNumber = getManualSession['month'];
        // Convert numeric month to short name format
        var shortMonthName = monthNames[monthNumber - 1];
        // Get the year value from data
        var year = getManualSession['year'];
        // Construct the formatted start month string
        var startDateFormatted = shortMonthName + ' ' + year;
        $('#datepicker').datepicker('setDate', new Date(startDateFormatted));
        $('#datepicker').val(startDateFormatted);
        $('.selected_date').html(startDateFormatted);
        // $('.pending_number').html(getManualSession['pending']);
        // $('.processed_number').html(getManualSession['processed']);
        $.ajax({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            type: 'POST',
            url: "{{ route('set-session-payroll') }}",
            data: {
                month: monthNumber,
                year:year
            },
            success: function(response) {
                if(response.status == 1){
                    $('.pending_number').html(response.data.pending);
                    $('.processed_number').html(response.data.processed);
                }
            }
        });
    }else {
        var month = start_month.getMonth() + 1; // Add 1 to get the month in the range of 1 to 12
        var year = start_month.getFullYear();
        var monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        // Convert numeric month to short name format
        var shortMonthName = monthNames[month - 1];
        // Construct the formatted start month string
        var startDateFormatted = shortMonthName + ' ' + year;
        $('#datepicker').datepicker('setDate', new Date(startDateFormatted));
        $('#datepicker').val(startDateFormatted);
        $('.selected_date').html(startDateFormatted);
        $.ajax({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            type: 'POST',
            url: "{{ route('set-session-payroll') }}",
            data: {
                month: month,
                year:year
            },
            success: function(response) {
                if(response.status == 1){
                    $('.pending_number').html(response.data.pending);
                    $('.processed_number').html(response.data.processed);
                }
            }
        });
    }
    $('.attendance_status_month ').on('change',function(){
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
        $.ajax({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            type: 'POST',
            url: "{{ route('set-session-payroll') }}",
            data: {
                month: month,
                year:year
            },
            success: function(response) {
                if(response.status == 1){
                    location.reload();
                }
            }
        });
    });


/* ---- raw @section(scripts) remainder ---- */



