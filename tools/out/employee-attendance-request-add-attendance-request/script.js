

        $(document).ready(function () {
            var yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(23, 59, 59, 999);

            var punchOutPicker = $("#punch_out").flatpickr({
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                allowInput: true,
                maxDate: yesterday
            });

            $("#punch_in").flatpickr({
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                allowInput: true,
                maxDate: yesterday,
                onChange: function(selectedDates, dateStr, instance) {
                    if (selectedDates[0]) {
                        var punchOutVal = $("#punch_out").val();
                        var piDate = dateStr.split(' ')[0];
                        if (punchOutVal == "") {
                            punchOutPicker.set('defaultDate', piDate);
                        } else {
                            var poTime = punchOutVal.split(' ')[1] || "00:00";
                            punchOutPicker.setDate(piDate + ' ' + poTime);
                        }
                    }
                }
            });

            function fieldvalidation() {
                var valid = true;
                $(".error").remove();
                if ($('#punch_in').val() == "") {
                    $("#punch_in").parent().after(
                        '<span class="error error_message proxima_nova_semibold">Punch In time is required</span>'
                    );
                    valid = false;
                }
                if ($('#punch_out').val() == "") {
                    $("#punch_out").parent().after(
                        '<span class="error error_message proxima_nova_semibold">Punch Out time is required</span>'
                    );
                    valid = false;
                }
                if ($('#reason').val() == "") {
                    $("#reason").after(
                        '<span class="error error_message proxima_nova_semibold">Reason is required</span>'
                    );
                    valid = false;
                }

                if ($('#punch_in').val() != "" && $('#punch_out').val() != "") {
                    var punchInDate = $('#punch_in').val().split(' ')[0];
                    var punchOutDate = $('#punch_out').val().split(' ')[0];

                    if (punchInDate != punchOutDate) {
                        $("#punch_out").parent().after(
                            '<span class="error error_message proxima_nova_semibold">Punch Out date must be same as Punch In date</span>'
                        );
                        valid = false;
                    } else if ($('#punch_out').val() <= $('#punch_in').val()) {
                        $("#punch_out").parent().after(
                            '<span class="error error_message proxima_nova_semibold">Punch Out time must be after Punch In time</span>'
                        );
                        valid = false;
                    }
                }
                return valid;
            }

            $('#submit_request').click(function () {
                if (fieldvalidation()) {
                    $('#submit_request').prop('disabled', true);
                    var formData = new FormData($('#add_attendance_request_form')[0]);
                    $.ajax({
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        type: 'POST',
                        url: "{{ route('store-attendance-request') }}",
                        data: formData,
                        processData: false,
                        contentType: false,
                        success: function (response) {
                            if (response['status'] == 1) {
                                toastr["success"](response.message)
                                setTimeout(function () {
                                    var redirectUrl = "{{ route('attendance-request') }}"
                                    window.location.href = redirectUrl;
                                }, 3000);
                            } else if (response['status'] == 0) {
                                $('#submit_request').prop('disabled', false);
                                toastr["error"](response.message)
                            } else {
                                $('#submit_request').prop('disabled', false);
                                toastr["error"](response.message)
                            }
                        },
                        error: function (xhr) {
                            $('#submit_request').prop('disabled', false);
                            var message = "An error occurred. Please try again.";
                            if (xhr.responseJSON && xhr.responseJSON.message) {
                                message = xhr.responseJSON.message;
                            }
                            toastr["error"](message);
                        }
                    });
                }
            });
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
    
