
        $('#business_info_btn').on('click',function(event) {
            var formData = new FormData($('#edit_business_info')[0]);
            $('.loader').show();
            $('#business_info_btn').prop('disabled', true);
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                type: 'POST',
                url: "{{ route('edit_business_info') }}",
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    if (response['status'] == 1) {
                        toastr["success"](response.message)
                        setTimeout(function () {
                            var redirectUrl = "{{ url('setting') }}"
                            window.location.href = redirectUrl;
                        }, 3000);
                    } else {
                        toastr["error"](response.message)
                    }
                }
            });
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
