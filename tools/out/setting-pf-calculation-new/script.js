
        // Update PF status label when toggle changes
        function updatePFStatus(checkbox) {
            const statusLabel = document.getElementById('pf_status_label');
            if (checkbox.checked) {
                statusLabel.textContent = 'Enabled';
                statusLabel.classList.remove('text-gray-500');
                statusLabel.classList.add('text-green-600');
            } else {
                statusLabel.textContent = 'Disabled';
                statusLabel.classList.remove('text-green-600');
                statusLabel.classList.add('text-gray-500');
            }
        }

        // Reset to default values
        $('#reset_to_default_btn').on('click', function() {
            $('#employee_percentage').val('12');
            $('#employer_epf_percentage').val('3.67');
            $('#employer_eps_percentage').val('8.33');
            $('#capped_amount').val('15000');
            
            // Show confirmation toast
            toastr["info"]("Form reset to default values");
        });

        function formValidation(){
            var valid = true;
            $(".error").remove();
            if ($('#employee_percentage').val() == "") {
                $("#employee_percentage").after(
                    '<span class="error error_message proxima_nova_semibold">Employee percentage is required</span>'
                );
                valid = false;
            }
            if ($('#employer_eps_percentage').val() == "") {
                $("#employer_eps_percentage").after(
                    '<span class="error error_message proxima_nova_semibold">Employee EPS percentage is required</span>'
                );
                valid = false;
            }
            if ($('#employer_epf_percentage').val() == "") {
                $("#employer_epf_percentage").after(
                    '<span class="error error_message proxima_nova_semibold">Employee EPF percentage is required</span>'
                );
                valid = false;
            }
            if ($('#capped_amount').val() == "") {
                $("#capped_amount").after(
                    '<span class="error error_message proxima_nova_semibold">Capped amount is required</span>'
                );
                valid = false;
            }
            return valid;
        }
        $('#business_pf_btn').on('click',function(event) {
            if(formValidation()) {
                var formData = new FormData($('#business_pf')[0]);
                $('.loader').show();
                $('#business_pf_btn').prop('disabled', true);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('pf_calculation_add_edit') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        if (response['status'] == 1) {
                            toastr["success"](response.message)
                            setTimeout(function () {
                                var redirectUrl = "{{ url('setting-new') }}"
                                window.location.href = redirectUrl;
                            }, 3000);
                        } else {
                            toastr["error"](response.message)
                        }
                    }
                });
            }
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
