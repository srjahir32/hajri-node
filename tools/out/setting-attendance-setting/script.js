
        function fieldValidation(){
            var valid = true;
            $(".error").remove();
            if ($('#punch_in_tolerance').val() == "") {
                $("#punch_in_tolerance").after(
                    '<span class="error error_message proxima_nova_semibold">Punch in time tolerance field is required</span>'
                );
                valid = false;
            }
            return valid;
        }
        $('#attendance_setting').submit(function (event) {
            event.preventDefault();
            if (fieldValidation()) {
                var formData = new FormData($(this)[0]);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('attendance_setting_store') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        if (response['status'] == 1) {
                            $('.loader').show();
                            $('#save-btn').prop('disabled', true);
                            toastr["success"](response.message);
                            // $('#attendance_setting')[0].reset();
                            setTimeout(function () {
                                location.reload();
                            }, 3000);
                        } else {
                            toastr["error"](response.message)
                        }
                    }
                });
            }
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
