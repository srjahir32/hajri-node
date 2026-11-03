
        var leaveStartPeriod = "{{ $leave_template['leave_start_period'] ?? '' }}";
        var leaveEndPeriod = "{{ $leave_template['leave_end_period'] ?? '' }}";
        $('.leave-policy-time.date').datepicker({
            format: 'M yyyy',
            startView: 'months',
            minViewMode: 'months',
            autoclose: true
        }).on('changeDate', function (selected) {
            var minDate = new Date(selected.date.valueOf());
            $('.leave-policy-to-time.date').datepicker('setStartDate', minDate);
        });
        $('.leave-policy-to-time.date').datepicker({
            format: 'M yyyy',
            startView: 'months',
            minViewMode: 'months',
            autoclose: true
        }).on('changeDate', function (selected) {
            var maxDate = new Date(selected.date.valueOf());
            $('.leave-policy-time.date').datepicker('setEndDate', maxDate);
        });
        if (leaveStartPeriod) {
            $('.leave-policy-time.date').datepicker('setDate', leaveStartPeriod);
        } else {
            var currentDate = new Date();
            $('.leave-policy-time.date').datepicker('setDate', new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
        }

        if (leaveEndPeriod) {
            $('.leave-policy-to-time.date').datepicker('setDate', leaveEndPeriod);
        } else {
            var currentDate = new Date();
            $('.leave-policy-to-time.date').datepicker('setDate', new Date(currentDate.getFullYear(), 11, 31));
        }
        var startDate = $('.leave-policy-time.date').datepicker('getDate');
        var endDate = $('.leave-policy-to-time.date').datepicker('getDate');
        if (startDate) {
            $('.leave-policy-to-time.date').datepicker('setStartDate', startDate);
        }
        if (endDate) {
            $('.leave-policy-time.date').datepicker('setEndDate', endDate);
        }
        $("#policy_cycle_monthly").change(function () {
            $('#leave_start_period').prop('disabled', false);
            $('#leave_end_period').prop('disabled', true);
            var currentDate = new Date();
            $('.leave-policy-to-time.date').datepicker('setDate', new Date(currentDate.getFullYear(), 11, 31));
        });
        $("#policy_cycle_yearly").change(function () {
            $('#leave_end_period').prop('disabled', false);
        });
        function fieldValidation() {
            var valid = true;
            $(".error").remove();
            if ($('#template_name').val() == "") {
                $("#template_name").after(
                    '<span class="error error_message proxima_nova_semibold">Template name field is required</span>'
                );
                valid = false;
            }
            var numberOfLeaves = $('#number_of_leaves').val();
            if (numberOfLeaves == "") {
                $("#number_of_leaves").after(
                    '<span class="error error_message proxima_nova_semibold">Number of Leaves field is required</span>'
                );
                valid = false;
            } else if (parseFloat(numberOfLeaves) <= 0) {
                $("#number_of_leaves").after(
                    '<span class="error error_message proxima_nova_semibold">Number of Leaves must be greater than 0</span>'
                );
                valid = false;
            }
            // if($('#leave_end_period').prop('disabled', false) || $('#leave_start_period').prop('disabled', false)){
            //     $(".leave-edit-inner").after(
            //         '<span class="error error_message proxima_nova_semibold">Leave Period name field is required</span>'
            //     );
            //     valid = false;
            // }
            return valid;
        }
        $('#save_leave_policy_btn').click(function (e) {
            e.preventDefault();
            if (fieldValidation()) {
                $('#leave_end_period').prop('disabled', false);
                var formData = new FormData($('#save_leave_policy')[0]);
                if ($('#policy_cycle_monthly').is(':checked')) {
                    $('#leave_end_period').prop('disabled', true);
                }
                $('.loader').show();
                $('#save_leave_policy_btn').prop('disabled', true);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('add_edit_leave_policy') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        if (response['status'] == 1) {
                            toastr["success"](response.message);
                            setTimeout(function () {
                                
                                var redirectUrl = "{{ url('setting/leave_policy_new') }}"
                                window.location.href = redirectUrl;
                            }, 3000);
                        } else {
                            toastr["error"](response.message)
                        }
                    }
                });
            }
        })
        $('#delete_template').on('click', function () {
            var id = $(this).data('id'); // Capture the ID from the button's data-id attribute
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                type: 'POST',
                url: "{{ route('delete_leave_template') }}",
                data: { 'id': id },
                success: function (response) {
                    if (response['status'] == 1) {
                        toastr["success"](response.message);
                        setTimeout(function () {
                            window.location.href = "{{ url('setting/leave_policy_new') }}";
                        }, 3000);
                    } else {
                        toastr["error"](response.message);
                    }
                },
            });
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
