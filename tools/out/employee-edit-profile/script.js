


        $(document).ready(function() {
            const dropdownContainer = $('#timezone-dropdown-container');
            const searchInput = $('#timezone-search');
            const options = $('#timezone-options-list li').not('#no-results');
            const noResults = $('#no-results');
            const trigger = dropdownContainer.find('.dropdown-trigger');
            const menu = dropdownContainer.find('.dropdown-options');
            const select = $('#timezone');
            const selectedValueSpan = dropdownContainer.find('.selected-value');
            const clearBtn = $('#clear-timezone');
            const defaultText = 'Select Time Zone';

            function filterOptions() {
                const query = searchInput.val().toLowerCase().trim();
                let matchCount = 0;

                options.each(function () {
                    const text = ($(this).data('value') || $(this).text()).toLowerCase();
                    if (query === '' || text.includes(query)) {
                        $(this).removeClass('hidden').show();
                        matchCount++;
                    } else {
                        $(this).addClass('hidden').hide();
                    }
                });

                if (matchCount === 0) {
                    noResults.removeClass('hidden').show();
                } else {
                    noResults.addClass('hidden').hide();
                }
            }

            // Toggle dropdown
            trigger.off('click').on('click', function (e) {
                e.stopPropagation();
                if (menu.is(':visible')) {
                    menu.slideUp(100);
                } else {
                    searchInput.val('');
                    filterOptions();
                    menu.slideDown(100, function () {
                        searchInput.focus();
                    });
                }
            });

            // Select option
            options.off('click').on('click', function (e) {
                e.stopPropagation();
                const value = $(this).data('value');
                const text = value ? $(this).text().trim() : defaultText;

                selectedValueSpan.text(text);
                select.val(value).trigger('change');
                options.removeClass('font-bold text-blue-600 bg-blue-50');
                $(this).addClass('font-bold text-blue-600 bg-blue-50');

                if (value) {
                    clearBtn.removeClass('hidden').show();
                } else {
                    clearBtn.addClass('hidden').hide();
                }

                menu.slideUp(100);
            });

            // Clear timezone selection
            clearBtn.on('click', function (e) {
                e.stopPropagation();
                select.val('').trigger('change');
                selectedValueSpan.text(defaultText);
                options.removeClass('font-bold text-blue-600 bg-blue-50');
                options.first().addClass('font-bold text-blue-600 bg-blue-50');
                clearBtn.addClass('hidden').hide();
                filterOptions();
            });

            // Prevent closing when clicking search container or input
            searchInput.closest('.search-container').on('click', function (e) {
                e.stopPropagation();
            });

            // Filter Options on Search
            searchInput.on('input', function () {
                filterOptions();
            });

            // Close dropdown on click outside
            $(document).on('click', function (e) {
                if (!dropdownContainer.is(e.target) && dropdownContainer.has(e.target).length === 0) {
                    menu.slideUp(100);
                }
            });
            // Select the PAN_number input
            var panNumberInput = $('#PAN_number');
            // Select the submit button
            var submitButton = $('#staff_step1_btn');
            // Attach a keydown event handler to the PAN_number input
            panNumberInput.on('keydown', function(event) {
                // Check if the pressed key is 'Enter'
                if (event.key === 'Enter') {
                    // Trigger the submit button click event
                    submitButton.click();
                }
            });
        });
        var today = new Date();
        $('#date_of_birth').datepicker({
            format: 'dd M yyyy',
            autoclose: true,
            endDate: today,
        });
        $('#date_of_joining').datepicker({
            format: 'dd M yyyy',
            autoclose: true,
        });

        var dobVal = '<?= $staff->StaffProfile?->date_of_birth ? \Carbon\Carbon::parse($staff->StaffProfile->date_of_birth)->format('d M Y') : '' ?>';
        if (dobVal) {
            $('#date_of_birth').datepicker('setDate', dobVal);
        }
        

        var formattedValue = $('#phone_number').val().replace(/(\d{5})(?!$)/g, '$1 ').trim();
        var phone_number = $('#phone_number').val(formattedValue);

        const phoneNumberInput = document.getElementById('phone_number');
        phoneNumberInput.addEventListener('input', function (event) {
            let value = event.target.value.replace(/\D/g, ''); // Remove non-numeric characters
            const formattedValue = formatPhoneNumber(value);
            event.target.value = formattedValue;
        });
        function formatPhoneNumber(value) {
            // Add spaces after every 5 digits
            return value.replace(/(\d{5})/g, '$1 ').trim();
        }
        function fieldValidation(){
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
            }
            else{
                if (!emailRegex.test($('#staff_email').val())) {
                    $("#staff_email").after(
                        '<span class="error error_message proxima_nova_semibold">Please enter valid Email</span>'
                    );
                    valid = false;
                }
            }
            // var filter = /^[6-9][0-9]{9}$/;
            var filter = /^[6-9]\d{4}\s\d{5}$/;
            if ($('#phone_number').val() == "") {
                $("#phone_number").after(
                    '<span class="error error_message proxima_nova_semibold">Phone number field is required</span>'
                );
                valid = false;
            }
            else{
                if (!filter.test($('#phone_number').val())) {
                    $("#phone_number").after(
                        '<span class="error error_message proxima_nova_semibold">Please enter valid Mobile number</span>'
                    );
                    valid = false;
                }
            }
            return valid;
        }
        $('#staff_step1_btn').click(function(event) {
            event.preventDefault();
            // console.log(myDropzone.getQueuedFiles().length);
            // if(myDropzone.getQueuedFiles().length == 0){
            staffAddStep()
            // }else{
            //     myDropzone.processQueue();
            // }
        })
        function staffAddStep(){
            if(fieldValidation()) {
                $('.loader').show();
                $('#staff_step1_btn').prop('disabled', true);
                var formData = new FormData($('#staff_personal_info')[0]);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('user-update-profile') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        $('.loader').hide();
                        $('#staff_step1_btn').prop('disabled', false);

                        if (response['status'] == 1) {
                            toastr["success"](response.message);
                            setTimeout(function() {
                                window.location.reload();
                            }, 3000);
                        } else if (response['status'] == 2) {
                            // toastr["success"](response.message);
                            $("#staff_email").after(
                                '<span class="error error_message proxima_nova_semibold">'+response['message']+'</span>'
                            );
                        }else {
                            toastr["error"](response.message)
                        }
                    },
                    error: function() {
                        $('.loader').hide();
                        $('#staff_step1_btn').prop('disabled', false);
                        toastr["error"]("An error occurred. Please try again.");
                    }
                });
            }
        }
        $('.input-group.date').datepicker({
            format: 'dd, M yyyy',
            autoclose: true
        });
        $('.input-group.date').datepicker('setDate', new Date('2023-04-19'));
        $('.single-date-picker.date').datepicker({
            format: 'dd, M yyyy',
            autoclose: true
        });
        $('.single-date-picker.date').datepicker('setDate', new Date('2023-04-19'));

        $('.from-date-picker.date').datepicker({
            format: 'dd, M yyyy',
            autoclose: true
        });
        $('.from-date-picker.date').datepicker('setDate', new Date('2023-09-29'));

        $('.to-date-picker.date').datepicker({
            format: 'dd, M yyyy',
            autoclose: true
        });
        $('.to-date-picker.date').datepicker('setDate', new Date('2023-12-08'));

        //  datatable
        $(document).ready(function () {
            // muklti checkbox
            $('#selectAllCheckbox').on('change', function () {
                var isChecked = $(this).prop('checked');
                $('.selectCheckbox_model').prop('checked', isChecked);
            })
            // search data
            $('#staff_data_find').on('input', function () {
                var searchValue = $(this).val();
                table.search(searchValue).draw();
            });
            $('.selectCheckbox_model').change(function () {
                if ($(this).is(':checked')) {
                    $('#myModal').show();
                } else {
                    $('#myModal').hide();
                }
            });
            $('#closeModal').click(function () {
                $('#myModal').hide();
            });
            // Handle radio button changes
            $('#dateRangePicker').hide();
            $('input[name="dateType"]').change(function () {
                // console.log(this);
                if (this.value === "Date") {
                    $('#singleDatePicker').show();
                    $('#dateRangePicker').hide();
                } else if (this.value === "Range") {
                    $('#singleDatePicker').hide();
                    $('#dateRangePicker').show();
                }
            });
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
    
