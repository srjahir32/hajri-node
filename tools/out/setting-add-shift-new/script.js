
        $(document).ready(function() {
            // $(document).on('click touch', '.selectDropdown ul li a', function(e) {
            //     e.preventDefault();
            //     var dropdown = $(this).closest('.selectDropdown');
            //     var active = $(this).parent().hasClass('active');
            //     var label = active ? dropdown.find('select').attr('placeholder') : $(this).text();
            //     var selectedId = $(this).attr('data-id'); // Get the data-id attribute of the selected option
            //
            //     dropdown.find('option').prop('selected', false);
            //     dropdown.find('ul li').removeClass('active');
            //     dropdown.toggleClass('filled', !active);
            //     dropdown.children('span').text(label);
            //
            //     if (!active) {
            //         dropdown.find('option[value="' + selectedId + '"]').prop('selected', true);
            //         $(this).parent().addClass('active');
            //     }
            //
            //     dropdown.removeClass('open');
            //
            //     // Trigger change event and pass the selected id
            //     dropdown.find('select').trigger('change', [selectedId]);
            // });
            // Listen for the change event
            $('select.select-club-services').on('change', function(e, selectedId) {
                var selectedVal = selectedId || $(this).val();
                if(selectedVal == ''){
                    $('.fixed-type').addClass('d-none');
                    $('.rotational-type').addClass('d-none');
                    $('.flexible-type').addClass('d-none');
                }else if(selectedVal == 1){
                    $('.fixed-type').removeClass('d-none');
                    $('.rotational-type').addClass('d-none');
                    $('.flexible-type').addClass('d-none');
                }else if(selectedVal == 2){
                    $('.fixed-type').addClass('d-none');
                    $('.rotational-type').removeClass('d-none');
                    $('.flexible-type').addClass('d-none');
                }else if (selectedVal == 3){
                    $('.fixed-type').addClass('d-none');
                    $('.rotational-type').addClass('d-none');
                    $('.flexible-type').removeClass('d-none');
                }
            });
        });

        // $('#add_shift').click(function () {
        //     addnewrow();
        // });
        // $('body').delegate('.single-remove', 'click', function () {
        //     var id = $(this).attr('id');
        //     $('#' + id).closest('tr').remove();
        // });
        // function addnewrow() {
        //     var n = 0;
        //     if (isNaN(parseInt($('.itemRowSingle tr:last').attr('id')))) {
        //         n = parseInt($('.itemRowSingle tr').length) + parseInt(1);
        //     }
        //     if (!isNaN(parseInt($('.itemRowSingle tr:last').attr('id')))) {
        //         n = parseInt($('.itemRowSingle tr:last').attr('id')) + parseInt(1);
        //     }
        //     var tr = '<tr id="' + n + '">' +
        //         '<td width="12%"> ' +
        //             '<input type="text" id="shift_name_' + n + '" name="data[' + n + '][shift_name]" class="form-control shift-edit-input" placeholder="Enter name">' +
        //         '</td>' +
        //         '<td width="12%">' +
        //             '<input type="time" id="shift_start_time_' + n + '" name="data[' + n + '][shift_start_time]" class="form-control shift-input shift-edit-input">'+
        //         '</td>' +
        //         '<td width="12%">' +
        //             '<input type="time" id="shift_end_time_' + n + '" name="data[' + n + '][shift_end_time]" class="form-control shift-end-time shift-input shift-edit-input">'+
        //         '</td>' +
        //         '<td width="1%">' +
        //             // '<input type="time" id="break_time_' + n + '" name="data[' + n + '][break_time]" class="form-control shift-input shift-edit-input">'+
        //             '<div style="display: flex;">'+
        //                 '<select id="break_hour_' + n + '" name="data[' + n + '][break_hour]" class="form-control shift-dropdown" style="margin-right: 5px;">'+
        //                     '<option value="00">00</option>'+
        //                     '<option value="01">01</option>'+
        //                     '<option value="02">02</option>'+
        //                     '<option value="03">03</option>'+
        //                     '<option value="04">04</option>'+
        //                     '<option value="05">05</option>'+
        //                     '<option value="06">06</option>'+
        //                     '<option value="07">07</option>'+
        //                     '<option value="08">08</option>'+
        //                     '<option value="09">09</option>'+
        //                     '<option value="10">10</option>'+
        //                     '<option value="11">11</option>'+
        //                     '<option value="12">12</option>'+
        //                 '</select>'+
        //                 '<span style="padding-block-start: 2.3%;">:</span>'+
        //                 '<select id="break_minute_' + n + '" name="data[' + n + '][break_minute]" class="form-control shift-dropdown" style="margin-left: 5px;">'+
        //                     '<option value="00">00</option>'+
        //                     '<option value="05">05</option>'+
        //                     '<option value="10">10</option>'+
        //                     '<option value="15">15</option>'+
        //                     '<option value="20">20</option>'+
        //                     '<option value="25">25</option>'+
        //                     '<option value="30">30</option>'+
        //                     '<option value="35">35</option>'+
        //                     '<option value="40">40</option>'+
        //                     '<option value="45">45</option>'+
        //                     '<option value="50">50</option>'+
        //                     '<option value="55">55</option>'+
        //                 '</select>'+
        //             '</div>'+
        //         '</td>' +
        //         '<td width="6%">'+
        //             '<span class="total-payable" id="total_payable_' + n + '">00:00 Hrs</span>'+
        //             // '<input type="hidden" id="total_payable_data_' + n + '" name="data[' + n + '][total_payable]">'+
        //         '</td>' +
        //         '<td style="vertical-align: middle!important;"><div class="total-delete-icon"><a href="JavaScript:void(0);" id="delete_' + n + '" class="text-danger single-remove">' +
        //         '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">'+
        //         '<path fill-rule="evenodd" clip-rule="evenodd" d="M3.32085 4.8749C3.42492 4.76287 3.57092 4.69922 3.72383 4.69922H14.2493C14.402 4.69922 14.5478 4.76268 14.6518 4.87442C14.7559 4.98615 14.8088 5.13611 14.7979 5.28839L14.1477 14.3949C14.0708 15.4677 13.1783 16.2992 12.1028 16.2992H5.89283C4.81935 16.2992 3.92801 15.4709 3.84811 14.4004L3.17532 5.28972C3.16406 5.13723 3.21679 4.98694 3.32085 4.8749ZM12.1028 15.1992C12.6009 15.1992 13.0148 14.8141 13.0505 14.3164L13.6587 5.79922H4.31594L4.94505 14.3185C4.94505 14.3185 4.94506 14.3186 4.94505 14.3185C4.98219 14.8155 5.39584 15.1992 5.89283 15.1992H12.1028Z" fill="#808080" />'+
        //         '<path fill-rule="evenodd" clip-rule="evenodd" d="M8.99922 7.69922C9.30298 7.69922 9.54922 7.94546 9.54922 8.24922V12.7492C9.54922 13.053 9.30298 13.2992 8.99922 13.2992C8.69546 13.2992 8.44922 13.053 8.44922 12.7492V8.24922C8.44922 7.94546 8.69546 7.69922 8.99922 7.69922Z" fill="#808080" />'+
        //         '<path fill-rule="evenodd" clip-rule="evenodd" d="M2.44922 5.24922C2.44922 4.94546 2.69546 4.69922 2.99922 4.69922H14.9992C15.303 4.69922 15.5492 4.94546 15.5492 5.24922C15.5492 5.55298 15.303 5.79922 14.9992 5.79922H2.99922C2.69546 5.79922 2.44922 5.55298 2.44922 5.24922Z" fill="#808080" />'+
        //         '<path fill-rule="evenodd" clip-rule="evenodd" d="M5.49416 3.02953C5.79441 2.22921 6.55906 1.69922 7.41387 1.69922H10.5849C11.4397 1.69922 12.2043 2.22921 12.5046 3.02953L13.2644 5.05614C13.371 5.34057 13.2269 5.65758 12.9424 5.76422C12.658 5.87085 12.341 5.72672 12.2344 5.44229L11.4747 3.41591C11.4746 3.41587 11.4747 3.41595 11.4747 3.41591C11.3354 3.04479 10.981 2.79922 10.5849 2.79922H7.41387C7.01771 2.79922 6.6634 3.04467 6.52411 3.41579C6.5241 3.41583 6.52413 3.41576 6.52411 3.41579L5.76436 5.44229C5.65773 5.72672 5.34072 5.87085 5.05629 5.76422C4.77187 5.65758 4.62774 5.34057 4.73437 5.05614L5.49416 3.02953Z" fill="#808080" />'+
        //         '<path fill-rule="evenodd" clip-rule="evenodd" d="M11.6111 7.70065C11.914 7.72236 12.142 7.98558 12.1203 8.28856L11.7978 12.7886C11.7761 13.0915 11.5129 13.3195 11.2099 13.2978C10.9069 13.2761 10.6789 13.0129 10.7006 12.7099L11.0231 8.20993C11.0449 7.90695 11.3081 7.67894 11.6111 7.70065Z" fill="#808080" />'+
        //         '<path fill-rule="evenodd" clip-rule="evenodd" d="M6.38766 7.70065C6.69064 7.67894 6.95386 7.90695 6.97557 8.20993L7.29807 12.7099C7.31978 13.0129 7.09177 13.2761 6.78879 13.2978C6.48581 13.3195 6.2226 13.0915 6.20088 12.7886L5.87838 8.28856C5.85667 7.98558 6.08468 7.72236 6.38766 7.70065Z" fill="#808080" />'+
        //         '</svg>'+
        //         '</a></div></td>'+
        //         '</tr>';
        //     $('.itemRowSingle').append(tr);
        //     bindDropdownChangeEvents();
        // }
        // // Function to bind change events to dropdowns
        // function bindDropdownChangeEvents() {
        //     $('.shift-dropdown, .shift-end-time').off('change').on('change', function() {
        //         var id = $(this).closest('tr').attr('id');
        //         var startHour = $('#shift_start_time_' + id).val();
        //         var endHour = $('#shift_end_time_' + id).val();
        //         var breakHour = $('#break_hour_' + id).val();
        //         var breakMinute = $('#break_minute_' + id).val();
        //         // Logic to calculate total payable hours based on the selected times and break
        //         calculatePayableHours(id, startHour, endHour, breakHour, breakMinute);
        //     });
        // }
        // //
        // // Function to calculate payable hours
        // function calculatePayableHours(id, startHour, endHour, breakHour, breakMinute) {
        //     var startTime = new Date('1970-01-01T' + startHour + 'Z');
        //     var endTime = new Date('1970-01-01T' + endHour + 'Z');
        //     if (endTime <= startTime) {
        //         endTime.setDate(endTime.getDate() + 1); // Add one day to endTime
        //     }
        //     var timeDifference = endTime - startTime;
        //     var breakMilliseconds = (parseInt(breakHour) * 60 + parseInt(breakMinute)) * 60 * 1000;
        //     timeDifference -= breakMilliseconds;
        //     var hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));
        //     var minutesDifference = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        //     $('#total_payable_' + id).text(hoursDifference+':'+minutesDifference+ ' Hrs');
        //     // $('#total_payable_data_' + id).val(hoursDifference+':'+minutesDifference+ ' Hrs'); // Update this with the actual calculation result
        // }

        $('#add_shift').click(function () {
            addNewShift();
        });
        function addNewShift() {
            var shiftCount = $('.rotational-main').length + 1;
            // Clone the existing shift section without events
            var newShift = $('.rotational-main:first').clone().removeClass('d-none');
            // Add unique ID for the rotational-main div
            newShift.attr('id', shiftCount);  // Add unique ID to the cloned div
            // Update input fields and IDs with new index
            newShift.find('input, select, span').each(function () {
                var oldId = $(this).attr('id');
                if (oldId) {
                    var newId = oldId.replace(/\d+/, shiftCount);
                    $(this).attr('id', newId);
                }
                var oldName = $(this).attr('name');
                if (oldName) {
                    var newName = oldName.replace(/\d+/, shiftCount);
                    $(this).attr('name', newName);
                }
                // Clear only input fields, excluding total payable hours
                if ($(this).is('input')) {
                    $(this).val('');
                }
                // Set default value for only total payable hours
                if ($(this).hasClass('total-payable')) {
                    $(this).text('00:00 Hrs');
                } else if ($(this).is('span')) {
                    $(this).text(':'); // Clear other spans
                }
            });
            // Add delete button to the cloned shift
            newShift.append(`
                <div class="total-delete-icon">
                    <a href="JavaScript:void(0);" class="text-danger single-remove">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M3.32085 4.8749C3.42492 4.76287 3.57092 4.69922 3.72383 4.69922H14.2493C14.402 4.69922 14.5478 4.76268 14.6518 4.87442C14.7559 4.98615 14.8088 5.13611 14.7979 5.28839L14.1477 14.3949C14.0708 15.4677 13.1783 16.2992 12.1028 16.2992H5.89283C4.81935 16.2992 3.92801 15.4709 3.84811 14.4004L3.17532 5.28972C3.16406 5.13723 3.21679 4.98694 3.32085 4.8749ZM12.1028 15.1992C12.6009 15.1992 13.0148 14.8141 13.0505 14.3164L13.6587 5.79922H4.31594L4.94505 14.3185C4.94505 14.3185 4.94506 14.3186 4.94505 14.3185C4.98219 14.8155 5.39584 15.1992 5.89283 15.1992H12.1028Z" fill="#808080" />
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M8.99922 7.69922C9.30298 7.69922 9.54922 7.94546 9.54922 8.24922V12.7492C9.54922 13.053 9.30298 13.2992 8.99922 13.2992C8.69546 13.2992 8.44922 13.053 8.44922 12.7492V8.24922C8.44922 7.94546 8.69546 7.69922 8.99922 7.69922Z" fill="#808080" />
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M2.44922 5.24922C2.44922 4.94546 2.69546 4.69922 2.99922 4.69922H14.9992C15.303 4.69922 15.5492 4.94546 15.5492 5.24922C15.5492 5.55298 15.303 5.79922 14.9992 5.79922H2.99922C2.69546 5.79922 2.44922 5.55298 2.44922 5.24922Z" fill="#808080" />
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M5.49416 3.02953C5.79441 2.22921 6.55906 1.69922 7.41387 1.69922H10.5849C11.4397 1.69922 12.2043 2.22921 12.5046 3.02953L13.2644 5.05614C13.371 5.34057 13.2269 5.65758 12.9424 5.76422C12.658 5.87085 12.341 5.72672 12.2344 5.44229L11.4747 3.41591C11.4746 3.41587 11.4747 3.41595 11.4747 3.41591C11.3354 3.04479 10.981 2.79922 10.5849 2.79922H7.41387C7.01771 2.79922 6.6634 3.04467 6.52411 3.41579C6.5241 3.41583 6.52413 3.41576 6.52411 3.41579L5.76436 5.44229C5.65773 5.72672 5.34072 5.87085 5.05629 5.76422C4.77187 5.65758 4.62774 5.34057 4.73437 5.05614L5.49416 3.02953Z" fill="#808080" />
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M11.6111 7.70065C11.914 7.72236 12.142 7.98558 12.1203 8.28856L11.7978 12.7886C11.7761 13.0915 11.5129 13.3195 11.2099 13.2978C10.9069 13.2761 10.6789 13.0129 10.7006 12.7099L11.0231 8.20993C11.0449 7.90695 11.3081 7.67894 11.6111 7.70065Z" fill="#808080" />
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M6.38766 7.70065C6.69064 7.67894 6.95386 7.90695 6.97557 8.20993L7.29807 12.7099C7.31978 13.0129 7.09177 13.2761 6.78879 13.2978C6.48581 13.3195 6.2226 13.0915 6.20088 12.7886L5.87838 8.28856C5.85667 7.98558 6.08468 7.72236 6.38766 7.70065Z" fill="#808080" />
                        </svg>
                    </a>
                </div>
            `);
            // Append the new shift outside of the original .rotational-main
            $('.append-box').append(newShift);
            bindDropdownChangeEvents();
        }
        function bindDropdownChangeEvents() {
            // Bind change event to dropdowns and the shift end time
            $('.shift-dropdown, .shift-end-time').off('change').on('change', function() {
                var id = $(this).closest('.rotational-main').attr('id'); // Find the parent div's ID
                // Get the values for start and end time, and break hours/minutes
                var startHour = $('#shift_start_time_' + id).val();
                var endHour = $('#shift_end_time_' + id).val();
                var breakHour = $('#break_hour_' + id).val();
                var breakMinute = $('#break_minute_' + id).val();
                // Call function to calculate the payable hours
                calculatePayableHours(id, startHour, endHour, breakHour, breakMinute);
            });
        }
        // Function to calculate total payable hours
        function calculatePayableHours(id, startHour, endHour, breakHour, breakMinute) {
            // Create Date objects for start and end time
            var startTime = new Date('1970-01-01T' + startHour + 'Z');
            var endTime = new Date('1970-01-01T' + endHour + 'Z');
            // Check if the end time is earlier than or equal to the start time (shift goes past midnight)
            if (endTime <= startTime) {
                endTime.setDate(endTime.getDate() + 1); // Add one day to endTime
            }
            // Calculate the time difference in milliseconds
            var timeDifference = endTime - startTime;
            // Convert break time to milliseconds
            var breakMilliseconds = (parseInt(breakHour) * 60 + parseInt(breakMinute)) * 60 * 1000;
            // Subtract the break time from the total time
            timeDifference -= breakMilliseconds;
            // Convert the time difference from milliseconds to hours and minutes
            var hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60)); // Full hours
            var minutesDifference = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)); // Remaining minutes
            // Format the total payable time as 'HH:MM Hrs'
            var formattedTime = padTime(hoursDifference) + ':' + padTime(minutesDifference) + ' Hrs';
            // Update the displayed total payable hours
            $('#total_payable_' + id).text(formattedTime);
        }

        // Helper function to pad time (e.g., '03' instead of '3')
        function padTime(time) {
            return time < 10 ? '0' + time : time;
        }

        bindDropdownChangeEvents();
        // Delete shift event handler using event delegation
        $(document).on('click', '.single-remove', function () {
            $(this).closest('.rotational-main').remove();
        });

        function fieldValidation(){
            var valid = true;
            $(".error").remove();
            if ($('#shift_type_id').val() == "") {
                $("#shift_error").after(
                    '<span class="error error_message proxima_nova_semibold">Shift type field is required</span>'
                );
                valid = false;
            }
            if ($('#name').val() == "") {
                $("#name").after(
                    '<span class="error error_message proxima_nova_semibold">Shift name field is required</span>'
                );
                valid = false;
            }

            var shift_type_id = $('#shift_type_id').val();
            if (shift_type_id == "1") {
                if ($('#shift_fixed_name').val() == "") {
                    $("#shift_fixed_name").after(
                        '<span class="error error_message proxima_nova_semibold">Fixed shift name field is required</span>'
                    );
                    valid = false;
                }
                if ($('#shift_fixed_start_time').val() == "") {
                    $("#shift_fixed_start_time").after(
                        '<span class="error error_message proxima_nova_semibold">Start time field is required</span>'
                    );
                    valid = false;
                }
                if ($('#shift_fixed_end_time').val() == "") {
                    $("#shift_fixed_end_time").after(
                        '<span class="error error_message proxima_nova_semibold">End time field is required</span>'
                    );
                    valid = false;
                }
            } else if (shift_type_id == "2") {
                $('.rotational-main').each(function () {
                    var shiftNameInput = $(this).find('input[name*="[shift_name]"]');
                    var startTimeInput = $(this).find('input[name*="[shift_start_time]"]');
                    var endTimeInput = $(this).find('input[name*="[shift_end_time]"]');

                    if (shiftNameInput.length && shiftNameInput.val() == "") {
                        shiftNameInput.after(
                            '<span class="error error_message proxima_nova_semibold">Shift name field is required</span>'
                        );
                        valid = false;
                    }
                    if (startTimeInput.length && startTimeInput.val() == "") {
                        startTimeInput.after(
                            '<span class="error error_message proxima_nova_semibold">Start time field is required</span>'
                        );
                        valid = false;
                    }
                    if (endTimeInput.length && endTimeInput.val() == "") {
                        endTimeInput.after(
                            '<span class="error error_message proxima_nova_semibold">End time field is required</span>'
                        );
                        valid = false;
                    }
                });
            } else if (shift_type_id == "3") {
                if ($('#working_hours').val() == "") {
                    $("#working_hours").after(
                        '<span class="error error_message proxima_nova_semibold">Working hours field is required</span>'
                    );
                    valid = false;
                }
            }

            return valid;
        }
        $('#add-shift').submit(function (event) {
            event.preventDefault();
            if (fieldValidation()) {
                var formData = new FormData($(this)[0]);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('store_shift') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        if (response['status'] == 1) {
                            $('.loader').show();
                            $('#create-shift-btn').prop('disabled', true);
                            toastr["success"](response.message);
                            $('#add-shift')[0].reset();
                            setTimeout(function () {
                                // window.location.href = '/setting/shift_setting';
                                window.location.href = '/setting/shift_setting_new';
                            }, 3000);
                        } else {
                            toastr["error"](response.message)
                        }
                    }
                });
            }
        });

        $('.shift-fixed-dropdown, #shift_fixed_end_time').on('change',function (){
            var start_time = $('#shift_fixed_start_time').val();
            var end_time = $('#shift_fixed_end_time').val();
            var break_hour = $('#shift_fixed_break_hour').val();
            var break_minute = $('#shift_fixed_break_minute').val();
            // Parse time strings into Date objects
            var startTime = new Date('1970-01-01T' + start_time + 'Z');
            var endTime = new Date('1970-01-01T' + end_time + 'Z');
            // Calculate the time difference in milliseconds
            if (endTime <= startTime) {
                endTime.setDate(endTime.getDate() + 1); // Add one day to endTime
            }
            var timeDifference = endTime - startTime;
            // Convert break hours and minutes to milliseconds
            var breakMilliseconds = (parseInt(break_hour) * 60 + parseInt(break_minute)) * 60 * 1000;
            // Subtract break time from the total time difference
            timeDifference -= breakMilliseconds;
            // Convert time difference to hours and minutes
            var hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));
            var minutesDifference = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
            $('#total_fixed_payable').html(hoursDifference+':'+minutesDifference+' Hrs');
        })
    

/* ---- raw @section(scripts) remainder ---- */

    
