
        function fieldValidation() {
            var valid = true;
            $(".error").remove();
            if ($('#location_update_interval').val() == "") {
                $("#location_update_interval").after(
                    '<span class="error error_message proxima_nova_semibold">Location update interval is required</span>'
                );
                valid = false;
            } else if (parseFloat($('#location_update_interval').val()) < 0) {
                $("#location_update_interval").after(
                    '<span class="error error_message proxima_nova_semibold">Negative value is not allowed</span>'
                );
                valid = false;
            }
            if ($('#location_api_call_interval').val() == "") {
                $("#location_api_call_interval").after(
                    '<span class="error error_message proxima_nova_semibold">Location API call interval is required</span>'
                );
                valid = false;
            } else if (parseFloat($('#location_api_call_interval').val()) < 0) {
                $("#location_api_call_interval").after(
                    '<span class="error error_message proxima_nova_semibold">Negative value is not allowed</span>'
                );
                valid = false;
            }
            return valid;
        }
        $('#live_location_setting').submit(function (event) {
            event.preventDefault();
            if (fieldValidation()) {
                var formData = new FormData($(this)[0]);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('live_location_setting_store') }}",
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

    
