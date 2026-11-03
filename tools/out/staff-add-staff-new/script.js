
        try {
            var systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (systemTimezone === 'Asia/Calcutta') {
                systemTimezone = 'Asia/Kolkata';
            }
            if (systemTimezone) {
                $('#timezone').val(systemTimezone);
            }
        } catch (e) {
            console.error('Error detecting system timezone:', e);
        }
        $('.staff-salary.date').datepicker({
            format: 'dd, M',
            autoclose: true
        });
        // $('.staff-salary.date').datepicker('setDate', new Date('2023-01-01'));
        $("#phone_number").intlTelInput({
            initialCountry: "in",
            separateDialCode: true,
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.13/js/utils.js",
        });

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
        // $('.add-staff-dropzone').on('click',function (){
        //     $('#images-dropzone').click();
        // })
        // let uploadedDocumentMap = {};
        // Dropzone.autoDiscover = false;
        // let myDropzone = new Dropzone("div#images-dropzone",{
        //     url: '{{ route('uploadStaffPhoto') }}',
        //     autoProcessQueue: false,
        //     thumbnailWidth:'50',
        //     maxFilesize: 2,
        //     thumbnailHeight:'50',
        //     uploadMultiple: true,
        //     addRemoveLinks: true,
        //     parallelUploads: 10,
        //     acceptedFiles: 'image/jpeg, image/jpg, image/png',
        //     dictRemoveFile: `
        //                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        //                 <path fill-rule="evenodd" clip-rule="evenodd" d="M2.84154 2.83958C3.07296 2.60816 3.44817 2.60816 3.67959 2.83958L13.1611 12.3211C13.3925 12.5525 13.3925 12.9277 13.1611 13.1591C12.9296 13.3905 12.5544 13.3905 12.323 13.1591L2.84154 3.67763C2.61011 3.44621 2.61011 3.071 2.84154 2.83958Z" fill="#ffffff"/>
        //                 <path fill-rule="evenodd" clip-rule="evenodd" d="M13.1611 2.83958C13.3925 3.071 13.3925 3.44621 13.1611 3.67763L3.67959 13.1591C3.44817 13.3905 3.07296 13.3905 2.84154 13.1591C2.61011 12.9277 2.61011 12.5525 2.84154 12.3211L12.323 2.83958C12.5544 2.60816 12.9296 2.60816 13.1611 2.83958Z" fill="#ffffff"/>
        //                 </svg>`,
        //     headers: {
        //         'X-CSRF-TOKEN': "{{ csrf_token() }}"
        //     },
        //     successmultiple: function(data, response) {
        //         $.each(response['name'], function (key, val) {
        //             $('form').append('<input type="hidden" name="photos[]" value="' + val + '">');
        //             uploadedDocumentMap[data[key].name] = val;
        //         });
        //         var formData = new FormData($('#add_staff')[0]);
        //         $.ajax({
        //             headers: {
        //                 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        //             },
        //             type: 'POST',
        //             url: "{{ route('add-record-staff') }}",
        //             data: formData,
        //             processData: false,
        //             contentType: false,
        //             success: function(response) {
        //                 // console.log(response);
        //                 if (response['status'] == 1) {
        //                     toastr["success"](response.message);
        //                     $('#add_staff')[0].reset();
        //                     setTimeout(function () {
        //                         window.location.href = '/staff';
        //                     }, 3000);
        //                 }else{
        //                     toastr["error"](response.message)
        //                 }
        //             }
        //         });
        //         // }
        //     },
        //     removedfile: function (file) {
        //         $(".error").remove();
        //         file.previewElement.remove()
        //         let name = '';
        //         if (typeof file.file_name !== 'undefined') {
        //             name = file.file_name;
        //         } else {
        //             name = uploadedDocumentMap[file.name];
        //         }
        //         $('form').find('input[name="photos[]"][value="' + name + '"]').remove();
        //     },
        //     error: function(file, response) {
        //         if (file.size > this.options.maxFilesize * 1024 * 1024) {
        //             $(".image-error").html(
        //                 '<span class="error error_message proxima_nova_semibold">File size upload on ' + this.options.maxFilesize + ' MB</span>'
        //             );
        //         } else {
        //             alert('An error occurred while uploading the file.');
        //         }
        //     }
        // });
        $('#working_shift_id').on('change', function () {
            var selectedShiftId = $(this).val(); // Get selected shift ID
            var rotational_id = "<?= $rotational_shift_id?>";
            if (selectedShiftId == rotational_id) {
                $('.start_index').removeClass('d-none');
                $('.type').removeClass('d-none');
            } else {
                $('.start_index').addClass('d-none');
                $('.type').addClass('d-none');
            }
        })
        const phoneNumberInput = document.getElementById('phone_number');
        if (phoneNumberInput) {
            phoneNumberInput.addEventListener('input', function (event) {
                let value = event.target.value.replace(/\D/g, ''); // Remove non-numeric characters
                event.target.value = value;
            });
        }
        $('#staff_email').on('input', function () {
            var value = $(this).val();
            // This regex allows letters (a-z, A-Z), numbers (0-9), '@', and '.'
            var cleanValue = value.replace(/[^a-zA-Z0-9@.]/g, '');
            $(this).val(cleanValue);
        });
        $('#salary_amount').on('input paste', function () {
            var value = $(this).val();
            if (value < 0) {
                $(this).val('');
            }
            // Remove any non-numeric characters except for a single decimal point
            this.value = this.value.replace(/[^0-9.]/g, '');
            if ((this.value.match(/\./g) || []).length > 1) {
                this.value = this.value.replace(/\.$/, '');
            }
        });
        $('#salary_amount').on('keydown', function (e) {
            if (['e', 'E', '+', '-'].includes(e.key)) {
                e.preventDefault();
            }
        });
        function formatPhoneNumber(value) {
            return value ? value.replace(/\D/g, '') : '';
        }
        function fieldValidation() {
            var valid = true;
            $(".error").remove();
            if ($('#first_name').val() == "") {
                $("#first_name").after(
                    '<span class="error error_message proxima_nova_semibold">First name field is required</span>'
                );
                valid = false;
            }
            if ($('#last_name').val() == "") {
                $("#last_name").after(
                    '<span class="error error_message proxima_nova_semibold">Last name field is required</span>'
                );
                valid = false;
            }
            if ($('#middle_name').val() == "") {
                $("#middle_name").after(
                    '<span class="error error_message proxima_nova_semibold">Middle name field is required</span>'
                );
                valid = false;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if ($('#staff_email').val() == "") {
                $("#staff_email").after(
                    '<span class="error error_message proxima_nova_semibold">Email field is required</span>'
                );
                valid = false;
            } else if (!emailRegex.test($('#staff_email').val())) {
                $("#staff_email").after(
                    '<span class="error error_message proxima_nova_semibold">Please enter a valid email address.</span>'
                );
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
            if ($('#department_id').val() == "") {
                $("#department_error").after(
                    '<span class="error error_message proxima_nova_semibold">Department field is required</span>'
                );
                valid = false;
            }
            if ($('#working_shift_id').val() == "") {
                $("#working_shift_error").after(
                    '<span class="error error_message proxima_nova_semibold">Shift field is required</span>'
                );
                valid = false;
            }
            // if ($('#role_id').val() == "") {
            //     $("#role_id_error").after(
            //         '<span class="error error_message proxima_nova_semibold">Role field is required</span>'
            //     );
            //     valid = false;
            // }
            if ($('#working_shift_id').val() == "<?= $rotational_shift_id?>") {
                if ($('#start_index').val() == "") {
                    $("#start_index_error").after(
                        '<span class="error error_message proxima_nova_semibold">Shift timings field is required</span>'
                    );
                    valid = false;
                }
            }
            var salary_amount = $('#salary_amount').val();
            // if (salary_amount == "") {
            //     $("#salary_amount").after(
            //         '<span class="error error_message proxima_nova_semibold">Salary amount field is required</span>'
            //     );
            //     valid = false;
            // } else
            if (parseFloat(salary_amount) < 0) {
                $("#salary_amount").after(
                    '<span class="error error_message proxima_nova_semibold">Salary amount cannot be negative</span>'
                );
                valid = false;
            }
            if ($('#salary_cycle').val() == "") {
                $("#salary_cycle").after(
                    '<span class="error error_message proxima_nova_semibold">Salary cycle field is required</span>'
                );
                valid = false;
            }
            // if (myDropzone.getQueuedFiles().length === 0) {
            //     $(".image-error").html(
            //         '<span class="error error_message proxima_nova_semibold">At least one image is required</span>'
            //     );
            //     valid = false;
            // }
            // if ($('#photo').val() == "") {
            //     $(".staff-images").after(
            //         '<span class="error error_message proxima_nova_semibold">Photo field is required</span>'
            //     );
            //     valid = false;
            // }else {
            //     for (var i = 0; i < $("#photo").get(0).files.length; ++i) {
            //
            //         var img = $("#photo").get(0).files[i].name;
            //
            //         var img_ext = img.split('.').pop().toLowerCase();
            //         if ($.inArray(img_ext, ['jpg', 'jpeg', 'png']) === -1) {
            //             $('.staff-images').after("<span class='error'>File (" + img + ") type not allowed.</span>");
            //             valid = false;
            //         }
            //     }
            // }
            // if ($('#bank_name').val() == "") {
            //     $("#bank_name").after(
            //         '<span class="error error_message proxima_nova_semibold">Bank name field is required</span>'
            //     );
            //     valid = false;
            // }
            // if ($('#account_holder_name').val() == "") {
            //     $("#account_holder_name").after(
            //         '<span class="error error_message proxima_nova_semibold">Account holder name field is required</span>'
            //     );
            //     valid = false;
            // }
            // Account Number Validation
            // var accountNumber = $('#account_number').val();
            // if (accountNumber == "") {
            //     $("#account_number").after(
            //         '<span class="error error_message proxima_nova_semibold">Account number field is required</span>'
            //     );
            //     valid = false;
            // }
            if ($('#confirm_account_number').val() != $('#account_number').val()) {
                $("#confirm_account_number").after(
                    '<span class="error error_message proxima_nova_semibold">Confirm account number not match</span>'
                );
                valid = false;
            }
            // else {
            //     // Account Number Validation (9-18 digits)
            //     var accountRegex = /^\d{9,18}$/;
            //     if (!accountRegex.test(accountNumber)) {
            //         $("#account_number").after(
            //             '<span class="error error_message proxima_nova_semibold">Account number must be between 9 and 18 digits</span>'
            //         );
            //         valid = false;
            //     }
            // }
            // IFSC Code Validation
            // var ifscCode = $('#IFSC_code').val();
            // if (ifscCode == "") {
            //     $("#IFSC_code").after(
            //         '<span class="error error_message proxima_nova_semibold">IFSC code field is required</span>'
            //     );
            //     valid = false;
            // }
            // else {
            //     // IFSC Code Validation (exactly 11 characters)
            //     if (ifscCode.length != 11) {
            //         $("#IFSC_code").after(
            //             '<span class="error error_message proxima_nova_semibold">IFSC code must be exactly 11 characters</span>'
            //         );
            //         valid = false;
            //     }
            // }
            // UPI ID Validation
            var upiId = $('#UPI_id').val();
            // if (upiId == "") {
            //     $("#UPI_id").after(
            //         '<span class="error error_message proxima_nova_semibold">UPI id field is required</span>'
            //     );
            //     valid = false;
            // } else
            if (upiId != ""){
                // UPI ID Validation (exactly one @)
                var atCount = (upiId.match(/@/g) || []).length;
                if (atCount !== 1) {
                    $("#UPI_id").after(
                        '<span class="error error_message proxima_nova_semibold">UPI ID must contain exactly one "@"</span>'
                    );
                    valid = false;
                }
            }
            if (!valid) {
                var $firstError = $(".error:visible, .error").first();
                if ($firstError.length) {
                    var $targetInput = $firstError.prev('input, select, textarea');
                    if (!$targetInput.length) {
                        var $prevWrapper = $firstError.prev();
                        if ($prevWrapper.is('input, select, textarea')) {
                            $targetInput = $prevWrapper;
                        } else if ($prevWrapper.find('input, select, textarea').length) {
                            $targetInput = $prevWrapper.find('input, select, textarea').first();
                        } else {
                            $targetInput = $firstError.closest('.shift-inner-sub-label-edit, .form-group').find('input, select, textarea').first();
                        }
                    }
                    if ($targetInput.length) {
                        $targetInput.focus();
                        if ($targetInput[0].scrollIntoView) {
                            $targetInput[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }
                }
            }
            return valid;
        }
        $('#add_staff').submit(function (event) {
            event.preventDefault();
            if (fieldValidation()) {
                var phone_number = $('#phone_number').val().replace(/\s/g, '');
                var formData = new FormData($('#add_staff')[0]);
                var countryData = $("#phone_number").intlTelInput("getSelectedCountryData");
                if (countryData && countryData.dialCode) {
                    formData.set('country_code', countryData.dialCode.toString().replace('+', '').trim());
                }
                formData.set('phone_number', phone_number);
                var tz = $('#timezone').val() || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '');
                if (tz === 'Asia/Calcutta') {
                    tz = 'Asia/Kolkata';
                }
                if (tz) {
                    formData.set('timezone', tz);
                }
                $('.create-staff-btn').prop('disabled', true);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('add-record-staff') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        if (response['status'] == 1) {
                            $('.loader').show();
                            $('.create-staff-btn').prop('disabled', false);
                            toastr["success"](response.message);
                            $('#add_staff')[0].reset();
                            setTimeout(function () {
                                // window.location.href = '/staff';
                                window.location.href = '/staff-new';
                            }, 3000);
                        } else if (response['status'] == 2) {
                            $("#staff_email").after(
                                '<span class="error error_message proxima_nova_semibold">' + response['message'] + '</span>'
                            );
                            $('#staff_email').focus();
                            $('.create-staff-btn').prop('disabled', false);
                        } else if (response['status'] == 3) {
                            $('.loader').show();
                            $('.create-staff-btn').prop('disabled', false);
                            $('.loader').hide();
                            toastr["error"](response.message);
                        } else {
                            toastr["error"](response.message)
                        }
                    }
                });
            }
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
