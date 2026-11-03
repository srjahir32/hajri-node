
        $(document).ready(function() {
            $('#selectAllGlobal').change(function() {
                const isChecked = $(this).prop('checked');
                $('.permission-checkbox').prop('checked', isChecked);
                $('.category-select-all').prop('checked', isChecked);
            });
            $('.category-select-all').change(function() {
                const isChecked = $(this).prop('checked');
                $(this).closest('.permission-card').find('.permission-checkbox').prop('checked', isChecked);
                updateGlobalSelectAll();
            });
            $(document).on('change', '.permission-checkbox', function() {
                const $card = $(this).closest('.permission-card');
                const totalInCard = $card.find('.permission-checkbox').length;
                const checkedInCard = $card.find('.permission-checkbox:checked').length;
                $card.find('.category-select-all').prop('checked', totalInCard === checkedInCard);
                updateGlobalSelectAll();
            });
            function updateGlobalSelectAll() {
                const total = $('.permission-checkbox').length;
                const checked = $('.permission-checkbox:checked').length;
                $('#selectAllGlobal').prop('checked', total > 0 && total === checked);
            }
            $('.permission-card').each(function() {
                const $card = $(this);
                const totalInCard = $card.find('.permission-checkbox').length;
                const checkedInCard = $card.find('.permission-checkbox:checked').length;
                $card.find('.category-select-all').prop('checked', totalInCard > 0 && totalInCard === checkedInCard);
            });
            updateGlobalSelectAll();
            function fieldValidation() {
                var valid = true;
                $(".error_message").remove();
                if ($('#role_name').val() == "") {
                    $("#role_name").after('<span class="error_message font-semibold">Role name field is required</span>');
                    valid = false;
                }
                return valid;
            }
            $('#save_role_btn').click(function(e){
                e.preventDefault();
                if(fieldValidation()){
                    var formData = new FormData($('#save_role_form')[0]);
                    $('.loader').show();
                    $('#save_role_btn').prop('disabled', true);
                    $.ajax({
                        headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
                        type: 'POST',
                        url: "{{ route('save_role') }}",
                        data: formData,
                        processData: false,
                        contentType: false,
                        success: function(response) {
                            $('.loader').hide();
                            if (response['status'] == 1) {
                                toastr["success"](response.message);
                                setTimeout(function () {
                                    window.location.href = "{{ route('roles') }}";
                                }, 2000);
                            } else {
                                $('#save_role_btn').prop('disabled', false);
                                toastr["error"](response.message);
                            }
                        },
                        error: function(xhr) {
                            $('.loader').hide();
                            $('#save_role_btn').prop('disabled', false);
                            if(xhr.status === 422) {
                                var errors = xhr.responseJSON.errors;
                                if(errors.role_name) {
                                    $("#role_name").after('<span class="error_message font-semibold">' + errors.role_name[0] + '</span>');
                                }
                            } else {
                                toastr["error"]("An error occurred. Please try again.");
                            }
                        }
                    });
                }
            });
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
