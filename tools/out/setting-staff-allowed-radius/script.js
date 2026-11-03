
        function fieldValidation() {
            var valid = true;
            $(".error").remove();
            if ($('#staff_allowed_radius').val() == "") {
                $("#staff_allowed_radius").after(
                    '<span class="error error_message proxima_nova_semibold">Staff allowed radius is required</span>'
                );
                valid = false;
            } else if (parseFloat($('#staff_allowed_radius').val()) < 0) {
                $("#staff_allowed_radius").after(
                    '<span class="error error_message proxima_nova_semibold">Negative value is not allowed</span>'
                );
                valid = false;
            }
            return valid;
        }
        $('#staff_allowed_radius_setting').submit(function (event) {
            event.preventDefault();
            if (fieldValidation()) {
                var formData = new FormData($(this)[0]);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('staff_allowed_radius_store') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        if (response['status'] == 1) {
                            $('.loader').show();
                            $('#save-btn').prop('disabled', true);
                            toastr["success"](response.message);
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

    
