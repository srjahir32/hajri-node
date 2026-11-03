

        $(document).ready(function () {
            $('.select2').select2({
                width: '100%'
            });
        });

        $('#edit_profile').submit(function (event) {
            event.preventDefault();
            $('.loader').show();
            $('.profile-edit-submit-btn').prop('disabled', true);
            var formData = new FormData($(this)[0]);
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                type: 'POST',
                url: "{{route('edit-profile')}}",
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    if (response['status'] == 1) {
                        toastr["success"](response.message)
                        setTimeout(function () {
                            // window.location.href = '/dashboard';
                            window.location.href = '/dashboard-new';
                        }, 3000);
                    } else {
                        toastr["error"](response.message)
                    }
                }
            });
        })
        function updateImagePreview(input) {
            if (input.files && input.files[0]) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    $('#imagePreview').attr('src', e.target.result);
                };
                reader.readAsDataURL(input.files[0]);
            }
        }
        // Trigger the updateImagePreview function when a file is selected
        $('#imageUpload').change(function () {
            updateImagePreview(this);
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
    
