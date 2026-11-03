
        $(document).ready(function () {
            var userCountryCode = "{{ isset($user->country_code) && $user->country_code ? str_replace('+', '', $user->country_code) : '' }}";
            var initialCountryIso = "in";
            if (userCountryCode && window.intlTelInputGlobals) {
                var allCountries = window.intlTelInputGlobals.getCountryData();
                var matchCountry = allCountries.find(function (c) {
                    return c.dialCode == userCountryCode;
                });
                if (matchCountry) {
                    initialCountryIso = matchCountry.iso2;
                }
            }

            $("#phone_number").intlTelInput({
                initialCountry: initialCountryIso,
                separateDialCode: true,
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.13/js/utils.js",
            });

            if (userCountryCode && window.intlTelInputGlobals) {
                var allCountries = window.intlTelInputGlobals.getCountryData();
                var matchCountry = allCountries.find(function (c) {
                    return c.dialCode == userCountryCode;
                });
                if (matchCountry) {
                    $("#phone_number").intlTelInput("setCountry", matchCountry.iso2);
                }
            }

            // Intercept search input events in capture phase so intlTelInput does not block keyboard input or focus
            ['keydown', 'keypress', 'keyup', 'mousedown', 'mouseup', 'click'].forEach(function (eventName) {
                document.addEventListener(eventName, function (e) {
                    if (e.target && e.target.classList && e.target.classList.contains('iti__search-input')) {
                        e.stopPropagation();
                        if (eventName === 'keydown' && e.key === 'Escape') {
                            $(e.target).closest('.iti__country-list').addClass('iti__hide');
                        }
                    }
                }, true);
            });

            function initCountrySearch() {
                $('.iti__country-list').each(function () {
                    var $countryList = $(this);
                    if ($countryList.find('.iti__search-container').length === 0) {
                        var searchHtml = '<li class="iti__search-container">' +
                            '<input type="text" class="iti__search-input" placeholder="Search country or code..." autocomplete="off">' +
                            '</li>';
                        $countryList.prepend(searchHtml);
                    }
                });
            }

            initCountrySearch();

            $(document).on('input', '.iti__search-input', function () {
                var value = $(this).val().toLowerCase().trim();
                var $list = $(this).closest('.iti__country-list');
                $list.find('.iti__country').each(function () {
                    var countryName = $(this).find('.iti__country-name').text().toLowerCase();
                    var dialCode = $(this).find('.iti__dial-code').text().toLowerCase();
                    if (countryName.indexOf(value) !== -1 || dialCode.indexOf(value) !== -1) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
            });

            $(document).on('click', '.iti__selected-flag', function () {
                var $iti = $(this).closest('.iti');
                var $list = $iti.find('.iti__country-list');
                initCountrySearch();
                var $search = $list.find('.iti__search-input');
                if ($search.length) {
                    $search.val('');
                    $list.find('.iti__country').show();
                    setTimeout(function () {
                        $search.focus();
                    }, 50);
                }
            });
            $("#phone_number").on("countrychange input", function () {
                $("#error").next('.error').remove();
            });
            const phoneNumberInput = document.getElementById('phone_number');
            if (phoneNumberInput && phoneNumberInput.value) {
                let value = phoneNumberInput.value.replace(/\D/g, '');
                phoneNumberInput.value = formatPhoneNumber(value);
            }
            phoneNumberInput.addEventListener('input', function (event) {
                let value = event.target.value.replace(/\D/g, ''); // Remove non-numeric characters
                const formattedValue = formatPhoneNumber(value);
                event.target.value = formattedValue;
            });
            function formatPhoneNumber(value) {
                // Add spaces after every 5 digits
                return value.replace(/(\d{5})/g, '$1 ').trim();
            }
            function fieldValidation() {
                var valid = true;
                $(".error_message").remove();
                if ($('#name').val() == "") {
                    $("#name").after('<span class="error_message font-semibold">Name field is required</span>');
                    valid = false;
                }
                var emailFilter = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if ($('#email').val() == "") {
                    $("#email").after('<span class="error_message font-semibold">Email field is required</span>');
                    valid = false;
                } else if (!emailFilter.test($('#email').val())) {
                    $("#email").after('<span class="error_message font-semibold">Please enter a valid email address</span>');
                    valid = false;
                }
                var rawPhone = $('#phone_number').val() ? $('#phone_number').val().replace(/\s/g, '') : '';
                if (rawPhone == "") {
                    $("#error").after(
                        '<span class="error error_message proxima_nova_semibold">Phone number field is required</span>'
                    );
                    valid = false;
                } else {
                    var isItiValid = false;
                    if (typeof $("#phone_number").intlTelInput === "function") {
                        isItiValid = $("#phone_number").intlTelInput("isValidNumber");
                    }
                    if (!isItiValid) {
                        var countryData = $("#phone_number").intlTelInput("getSelectedCountryData");
                        var countryName = (countryData && countryData.name) ? countryData.name.split('(')[0].trim() : '';
                        var dialCode = (countryData && countryData.dialCode) ? '(+' + countryData.dialCode + ')' : '';
                        var countryLabel = countryName ? countryName + ' ' + dialCode : 'the selected country';

                        var errorCode = (typeof $("#phone_number").intlTelInput === "function") ? $("#phone_number").intlTelInput("getValidationError") : -1;
                        var errorMsg = "Please enter a valid phone number for " + countryLabel;

                        if (errorCode === 2) {
                            errorMsg = "Phone number is too short for " + countryLabel;
                        } else if (errorCode === 3) {
                            errorMsg = "Phone number is too long for " + countryLabel;
                        } else if (errorCode === 1) {
                            errorMsg = "Invalid country code";
                        }

                        $("#error").after(
                            '<span class="error error_message proxima_nova_semibold">' + errorMsg + '</span>'
                        );
                        valid = false;
                    }
                }
                if ($('#role_id').val() == "") {
                    $("#role_id_error").after(
                        '<span class="error error_message proxima_nova_semibold">Role field is required</span>'
                    );
                    valid = false;
                }
                return valid;
            }
            $('#save_and_update_admin_user_btn').click(function (e) {
                e.preventDefault();
                if (fieldValidation()) {
                    var formData = new FormData($('#save_role_form')[0]);
                    $('.loader').show();
                    $('#save_and_update_admin_user_btn').prop('disabled', true);
                    var phone_number = $('#phone_number').val().replace(/\s/g, '');
                    var countryData = $("#phone_number").intlTelInput("getSelectedCountryData");
                    if (countryData && countryData.dialCode) {
                        formData.set('country_code', countryData.dialCode);
                    }
                    formData.set('phone_number', phone_number);
                    $.ajax({
                        headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
                        type: 'POST',
                        url: "{{ route('save_admin_user') }}",
                        data: formData,
                        processData: false,
                        contentType: false,
                        success: function (response) {
                            $('.loader').hide();
                            if (response['status'] == 1) {
                                toastr["success"](response.message);
                                setTimeout(function () {
                                    window.location.href = "{{ route('admin_users') }}";
                                }, 2000);
                            } else {
                                $('#save_and_update_admin_user_btn').prop('disabled', false);
                                toastr["error"](response.message);
                            }
                        },
                        error: function (xhr) {
                            $('.loader').hide();
                            $('#save_and_update_admin_user_btn').prop('disabled', false);
                            $(".error_message").remove();
                            if (xhr.status === 422) {
                                var errors = xhr.responseJSON.errors;
                                if (errors.name) {
                                    $("#name").after('<span class="error_message font-semibold">' + errors.name[0] + '</span>');
                                }
                                if (errors.email) {
                                    $("#email").after('<span class="error_message font-semibold">' + errors.email[0] + '</span>');
                                }
                                if (errors.phone_number) {
                                    $("#error").after('<span class="error_message font-semibold">' + errors.phone_number[0] + '</span>');
                                }
                                if (errors.role_id) {
                                    $("#role_id_error").after('<span class="error_message font-semibold">' + errors.role_id[0] + '</span>');
                                }
                                if (errors.role_name) {
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

    
