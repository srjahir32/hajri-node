
        function fieldValidation(){
            var valid = true;
            $(".error").remove();
            if ($('#import_file').val() == "") {
                $("#import_file").after(
                    '<span class="error error_message proxima_nova_semibold">Upload file field is required</span>'
                );
                valid = false;
            }else{
                var fileExtension = $('#import_file').val().split('.').pop().toLowerCase();
                if (fileExtension !== 'xlsx' && fileExtension !== 'csv') {
                    $("#import_file").after(
                        '<span class="error error_message proxima_nova_semibold">Only Excel (xlsx) and CSV files are allowed</span>'
                    );
                    valid = false;
                }
            }
            return valid;
        }
        // import question file
        $('#import_form').submit(function(event) {
            event.preventDefault();
            if (fieldValidation()) {
                var formData = new FormData($(this)[0]);
                $('.excel-add-staff-btn').prop('disabled', true);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('upload-excel-add-staff') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        // console.log(response.data);
                        if (response['status'] == 1) {
                            $('.loader').show();
                            toastr["success"](response.message);
                            $('#import_form')[0].reset();
                            setTimeout(function () {
                                // window.location.href = '/staff/bulk_excel_add_staff_onboarding';
                                window.location.href = '/staff/bulk_excel_add_staff_onboarding_new';
                            }, 3000);
                        }else{
                            $('.excel-add-staff-btn').prop('disabled', false);
                            toastr["error"](response.message)
                        }
                    },
                    error: function (xhr, status, error) {
                        $('.excel-add-staff-btn').prop('disabled', false);
                        var errorMessage = "An error occurred while uploading the file.";
                        if (xhr.responseJSON && xhr.responseJSON.message) {
                            errorMessage = xhr.responseJSON.message;
                        } else if (xhr.responseJSON && xhr.responseJSON.error) {
                            errorMessage = xhr.responseJSON.error;
                        }
                        toastr["error"](errorMessage);
                    }
                });
            }
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
