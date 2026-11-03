

        $('.continue_btn').on("click", function () {
            window.location.href = "{{ url('setting/weekly_holiday_policy_staff_level') }}";
        });

        var checkDays = [];
        var uncheckDays = [];
        $('.days').on("click", function () {
            var val = $(this).val();
            if ($(this).is(':checked')) {
                checkDays.push(val);
                const index = uncheckDays.indexOf(val);
                if (index !== -1) {
                    uncheckDays.splice(index, 1);
                }
            } else {
                const index = checkDays.indexOf(val);
                if (index !== -1) {
                    checkDays.splice(index, 1);
                }
                if (!uncheckDays.includes(val)) {
                    uncheckDays.push(val);
                }
            }
        });

        function fieldValidation() {
            var valid = true;
            $(".error").remove();
            if (!$(".days:checked").length > 0) {
                $("#business_holiday_form").after(
                    '<span class="error error_message proxima_nova_semibold">Check at least one day.</span>'
                );
                valid = false;
            }
            return valid;
        }

        $('#save_weekly_business_holiday').on('click', function (event) {
            event.preventDefault();
            $('.loader').show();
            $('#save_weekly_business_holiday').prop('disabled', true);
            if (fieldValidation()) {
                var id = <?php echo $business_id?>;
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('save_weekly_business_holiday') }}",
                    data: {
                        'checkDays': checkDays,
                        'uncheckDays': uncheckDays,
                        'id': id
                    },
                    success: function (response) {
                        if (response['status'] == 1) {
                            checkDays = [];
                            uncheckDays = [];
                            toastr["success"](response.message);
                            setTimeout(function () {
                                window.location.href = '/setting-new';
                            }, 3000);
                        } else {
                            toastr["error"](response.message)
                        }
                    }
                });
            }
        })

        $(document).ready(function () {
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                type: 'POST',
                url: "{{ route('business_holiday') }}",
                success: function (response) {
                    // console.log(response);
                    if (response['status'] == 1) {
                        response['business_holiday'].forEach(function (holiday) {
                            if (holiday == 0) {
                                $('#sunday').prop("checked", true);
                            }
                            if (holiday == 1) {
                                $('#monday').prop("checked", true);
                            }
                            if (holiday == 2) {
                                $('#tuesday').prop("checked", true);
                            }
                            if (holiday == 3) {
                                $('#wednesday').prop("checked", true);
                            }
                            if (holiday == 4) {
                                $('#thursday').prop("checked", true);
                            }
                            if (holiday == 5) {
                                $('#friday').prop("checked", true);
                            }
                            if (holiday == 6) {
                                $('#saturday').prop("checked", true);
                            }
                        });
                    } else {
                        toastr["error"](response.message)
                    }
                }
            });
        })
    

/* ---- raw @section(scripts) remainder ---- */

    
