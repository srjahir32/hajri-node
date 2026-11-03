

        $('#assign-staff-btn').on('click', function (event) {
            event.preventDefault();
            // Switch to the staff_selection tab
            var tab = new bootstrap.Tab(document.querySelector('#profile-tab'));
            tab.show();
        });
        var table;
        var selectedIds = [];
        var unselectedIds = [];
        $(document).ready(function () {
            function datatable(searchValue = null) {
                table = $('#staff_datas').DataTable({
                    // "lengthMenu": [[5, 10, 20], [5, 10, 20]],
                    searching: false,
                    lengthChange: false,
                    info: false,
                    responsive: true,
                    // pagingType: "full_numbers",
                    order: [
                        // [0, "desc"]
                    ],
                    drawCallback: function () {
                        var checkedCount = $('.selectCheckbox_model:checked').length;
                        $('.save_count').html(checkedCount);
                        $('#selectAllCheckbox').on('change', function () {
                            var isChecked = $(this).prop('checked');
                            $('.selectCheckbox_model').prop('checked', isChecked);
                            var checkedCount = $('.selectCheckbox_model:checked').length;
                            $('.save_count').html(checkedCount);
                            if (isChecked) {
                                $('.selectCheckbox_model').each(function () {
                                    var id = $(this).val();
                                    if (selectedIds.indexOf(id) === -1) {
                                        selectedIds.push(id);
                                    }
                                });
                            } else {
                                selectedIds = [];
                            }
                        });
                        $('.selectCheckbox_model').change(function () {
                            var checkedCount = $('.selectCheckbox_model:checked').length;
                            $('.save_count').html(checkedCount);
                            var id = $(this).val();
                            if ($(this).is(':checked')) {
                                selectedIds.push(id);
                                const index = unselectedIds.indexOf(id);
                                if (index !== -1) {
                                    unselectedIds.splice(index, 1);
                                }
                            } else {
                                const index = selectedIds.indexOf(id);
                                if (index !== -1) {
                                    selectedIds.splice(index, 1);
                                }
                                if (!unselectedIds.includes(id)) {
                                    unselectedIds.push(id);
                                }
                            }
                        });
                    },
                    ajax: {
                        "url": "{{ route('overtime_staff_list') }}",
                        "dataType": "json",
                        "type": "POST",
                        "data": {
                            _token: "{{csrf_token()}}",
                            'searchValue': searchValue,
                        }
                    },
                    columns: [
                        {
                            data: 'id',
                            type: 'num',
                            render: function (data, type, row) {
                                var isChecked = (row.overtime_rule) ? 'checked' : '';
                                (row.overtime_rule) ? selectedIds.push(row.id) : '';
                                // return `<input type="checkbox" class="selectCheckbox_model" id="selectCheckbox_model" value="${row.id}">`;
                                return `<input type="checkbox" class="selectCheckbox_model" id="selectCheckbox_model" value="${row.id}" ${isChecked}>`;
                            }
                        },
                        {
                            data: "name",
                            render: function (data, type, row) {
                                var routeUrl = "{{ route('staff-profile-new', ':id') }}";
                                var url = routeUrl.replace(':id', row.id);
                                return `<a href="${url}" class="staff-edit">
                                            <div class="user-images">
                                                <div><img src="${row.staff_photo}" class="approve-user-img" alt=""></div>
                                                <div>${data}<p class="data-sub-field">${row.department_name}</p></div>
                                            </div>
                                        </a> `;
                            }
                        },
                        { "data": "staff_id" },
                        {
                            data: 'salary_payment_type',
                            render: function (data, type, row) {
                                return `<div class="salary-payment-type">
                                        <div class="salary-payment-text section_sub_title">R
                                        <div class="tooltip-text">Regular</div></div>Monthly
                                    </div>`;
                            }
                        },
                        { "data": "phone_number" },
                    ],
                    // createdRow: function (row, data, dataIndex) {
                    //     $(row).attr('id', 'storie_col_' + data['id']);
                    // },
                    columnDefs: [
                        { "width": "10px", "targets": 0 }
                        // { "width": "40%", "targets": 3 },
                        // {'targets': [1,2], 'orderable': false}
                    ]
                });
                $('.dataTables_length').addClass('bs-select');
            }
            datatable();
            $('#staff_data_find').on('input', function () {
                var searchValue = $('#staff_data_find').val();
                table.destroy();
                datatable(searchValue);
            });
            $('#apply_overtime_to_staff').on('click', function () {
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('apply_overtime_to_staff') }}",
                    data: {
                        'selectedIds': selectedIds,
                        'unselectedIds': unselectedIds,
                    },
                    success: function (response) {
                        if (response['status'] == 1) {
                            $('.loader').show();
                            $('#apply_overtime_to_staff').prop('disabled', true);
                            selectedIds = [];
                            unselectedIds = [];
                            toastr["success"](response.message)
                            table.ajax.reload(null, false);
                            setTimeout(function () {
                                var redirectUrl = "{{ url('setting/automation_rules_new') }}"
                                window.location.href = redirectUrl;
                            }, 3000);
                        } else {
                            toastr["error"](response.message)
                        }
                    }
                });
            });
        });
        var c_t = "";
        function timepicker(el, S, index) {
            var div = document.querySelector('.timepicker_wrapper[data-index="' + index + '"]');
            var initialTime = el.value; // Store the current value before changing the time
            function pad(n) {
                return ('0' + n).slice(-2);
            }
            if (S === 'a') {
                var html = "";
                for (var i = 0; i <= 23; i++) {
                    html += '<option value="' + pad(i) + '">' + pad(i) + '</option>';
                }
                div.querySelector('.timepicker_hour').innerHTML = html;
                html = "";
                for (var i = 0; i <= 59; i++) {
                    html += '<option value="' + pad(i) + '">' + pad(i) + '</option>';
                }
                div.querySelector('.timepicker_minute').innerHTML = html;
                // Pre-select the current hour and minute
                var timeParts = initialTime.split(':');
                div.querySelector('.timepicker_hour').value = timeParts[0];
                div.querySelector('.timepicker_minute').value = timeParts[1];
                // Show the timepicker_wrapper associated with this input
                div.style.display = "block";
                div.style.zIndex = "9999";
            }
            if (S === 'c') {
                div.querySelector('.timepicker_hour').value = "";
                div.querySelector('.timepicker_minute').value = "";
                el.value = initialTime;  // Revert back to original value
                div.style.display = "none";  // Hide the timepicker
            }
            if (S === 's') {
                var hr = div.querySelector('.timepicker_hour').value;
                var min = div.querySelector('.timepicker_minute').value;
                if (hr !== "" && min !== "") {
                    el.value = hr + ":" + min;  // Update the input value with selected time
                    div.style.display = "none"; // Hide the timepicker
                }
            }
        }
        function changeTimepickerheader(el, S, index) {
            var k = document.querySelectorAll('.timepicker_header[data-index="' + index + '"] b');
            var currentValue = $('#shift_hour_' + index).val(); // Get the current value of the input field
            var timeParts = currentValue.split(':');
            if (S === '1') {
                timeParts[0] = el.value; // Update hour
                k[0].innerHTML = el.value;
            }
            if (S === '2') {
                timeParts[1] = el.value; // Update minute
                k[1].innerHTML = el.value;
            }
            // Rebuild the time with the updated hour and minute
            var updatedTime = timeParts.join(':');
            $('#shift_hour_' + index).val(updatedTime); // Update the input field with the new time
        }
        function timepickersecond(element, type) {
            // Parse the existing time from the input field
            const existingTime = element.value || "00:00";
            const [existingHours, existingMinutes] = existingTime.split(':').map(Number);
            // Populate dropdowns
            const hoursDropdown = document.querySelector('.timepicker_hour_second');
            const minutesDropdown = document.querySelector('.timepicker_minute_second');
            // Clear existing options to prevent duplicates
            hoursDropdown.innerHTML = '';
            minutesDropdown.innerHTML = '';
            // Populate hours and minutes options
            for (let i = 0; i < 24; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = padTime(i);
                if (i === existingHours) option.selected = true; // Select current hour
                hoursDropdown.appendChild(option);
            }
            for (let i = 0; i < 60; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = padTime(i);
                if (i === existingMinutes) option.selected = true; // Select current minute
                minutesDropdown.appendChild(option);
            }
            // Update the header display
            updateTimePickerHeader(existingHours, existingMinutes);
            // Add change event listeners for updates
            hoursDropdown.addEventListener('change', function () {
                const selectedHour = parseInt(this.value, 10);
                updateTimePickerHeader(selectedHour, parseInt(minutesDropdown.value, 10));
                element.value = `${padTime(selectedHour)}:${padTime(parseInt(minutesDropdown.value, 10))}`;
            });
            minutesDropdown.addEventListener('change', function () {
                const selectedMinute = parseInt(this.value, 10);
                updateTimePickerHeader(parseInt(hoursDropdown.value, 10), selectedMinute);
                element.value = `${padTime(parseInt(hoursDropdown.value, 10))}:${padTime(selectedMinute)}`;
            });
        }
        function updateTimePickerHeader(hours, minutes) {
            const header = document.querySelector('.timepicker_header_second');
            header.innerHTML = `<b>${padTime(hours)}</b><b>${padTime(minutes)}</b>`;
        }
        function padTime(value) {
            if (value === undefined || value === null) {
                value = 0; // Ensure value is never undefined or null
            }
            return value.toString().padStart(2, '0');
        }
        function timepickerthird(el, S) {
            var div = document.querySelector('.timepicker_wrapper_third');
            var hoursDropdown = document.querySelector('.timepicker_hour_third');
            var minutesDropdown = document.querySelector('.timepicker_minute_third');
            var header = document.querySelector('.timepicker_header_third');
            function pad(n) {
                if (n === undefined || n === null || isNaN(n)) {
                    n = 0; // Default to 0 if the value is invalid
                }
                return n.toString().padStart(2, '0');
            }
            if (S === 'a') {
                // Populate dropdowns if not already populated
                if (!hoursDropdown.innerHTML.trim()) {
                    let hoursHtml = "";
                    for (let i = 0; i <= 23; i++) {
                        hoursHtml += `<option value="${pad(i)}">${pad(i)}</option>`;
                    }
                    hoursDropdown.innerHTML = hoursHtml;
                    let minutesHtml = "";
                    for (let i = 0; i <= 59; i++) {
                        minutesHtml += `<option value="${pad(i)}">${pad(i)}</option>`;
                    }
                    minutesDropdown.innerHTML = minutesHtml;
                }
                // Set dropdowns to current input value or default to 00:00
                const currentTime = el.value || "00:00";
                const [currentHour, currentMinute] = currentTime.split(':').map(Number);
                hoursDropdown.value = pad(currentHour);
                minutesDropdown.value = pad(currentMinute);
                // Update the header display
                updateTimePickerHeader(header, currentHour, currentMinute);
                // Display the time picker
                div.style.display = "block";
                div.style.zIndex = "9999";
            }
            if (S === 's') {
                // Save the selected time to the input
                const selectedHour = hoursDropdown.value;
                const selectedMinute = minutesDropdown.value;
                if (selectedHour !== "" && selectedMinute !== "") {
                    el.value = `${selectedHour}:${selectedMinute}`;
                    div.style.display = "none";
                }
            }
            if (S === 'c') {
                // Clear the time selection
                hoursDropdown.value = "";
                minutesDropdown.value = "";
                el.value = "";
                div.style.display = "none";
            }
            if (S === 'x') {
                // Close the time picker
                div.style.display = "none";
            }
        }
        function changeTimepickerheaderthird(el, S) {
            var header = document.querySelector('.timepicker_header_third');
            var hoursDropdown = document.querySelector('.timepicker_hour_third');
            var minutesDropdown = document.querySelector('.timepicker_minute_third');
            var inputField = document.querySelector('.hours_time_2');
            if (S === '1') {
                // Update hour in the header
                const hour = el.value;
                header.children[0].innerHTML = hour;
            }
            if (S === '2') {
                // Update minute in the header
                const minute = el.value;
                header.children[1].innerHTML = minute;
            }
            // Dynamically update the input field
            const currentHour = hoursDropdown.value;
            const currentMinute = minutesDropdown.value;
            inputField.value = `${currentHour}:${currentMinute}`;
        }
        function updateTimePickerHeader(header, hours, minutes) {
            header.innerHTML = `<b>${pad(hours)}</b><b>${pad(minutes)}</b>`;
        }
        function pad(n) {
            if (n === undefined || n === null || isNaN(n)) {
                n = 0; // Default to 0 if the value is invalid
            }
            return n.toString().padStart(2, '0');
        }
        $(document).ready(function () {
            $(".hours_time_1").on("click", function () {
                $(".timepicker_wrapper_second").show();
            });
            $(".hours_time_2").on("click", function () {
                $(".timepicker_wrapper_third").show();
            });
            // Hide timepicker_wrapper when anything other than timepicker_wrapper or hours_time is clicked
            $(document).on("click", function (e) {
                var containers = $(".timepicker_wrapper, .hours_time");
                if (!containers.is(e.target) && containers.has(e.target).length === 0) {
                    $(".timepicker_wrapper").hide();
                }
                var containers_1 = $(".timepicker_wrapper_second, .hours_time_1");
                if (!containers_1.is(e.target) && containers_1.has(e.target).length === 0) {
                    $(".timepicker_wrapper_second").hide();
                }
                var containers_2 = $(".timepicker_wrapper_third, .hours_time_2");
                if (!containers_2.is(e.target) && containers_2.has(e.target).length === 0) {
                    $(".timepicker_wrapper_third").hide();
                }
            });
            $('#add_time_range').click(function () {
                addNewRow();
            });
            // $('body').delegate('.single-remove', 'click', function() {
            //     var id = $(this).attr('id');
            //     $('#' + id).closest('tr').remove();
            // });
            function addNewRow() {
                var n = 0;
                var lastRow = $('.shifts .shift-container:last').attr('id');
                if (isNaN(parseInt(lastRow))) {
                    n = $('.shifts .shift-container').length + 1;
                } else {
                    n = parseInt(lastRow) + 1;
                }
                // Create the new shift container
                var newShiftContainer = '<div class="shift-container" id="' + n + '">' +
                    '<div class="shift-item">' +
                    '<label class="shift-type-label">If Staff Works for more than</label>' +
                    '<input type="text" class="form-control shift-edit-input hours_time" onclick="timepicker(this, `a`, ' + n + ')" name="data[' + n + '][shift_hour]" id="shift_hour_' + n + '" placeholder="00:00 hrs" autocomplete="off">' +
                    '<div class="timepicker_wrapper"  data-index="' + n + '">' +
                    '<div class="">' +
                    '<div class="timepicker_wrapper_main">' +
                    '<p class="timepicker_header" data-index="' + n + '">' +
                    '<b>12</b><b>00</b>' +
                    '</p>' +
                    '<div class="timepicker_data_select">' +
                    '<div class="timing_title">' +
                    '<label for="" class="label_title">Hours</label>' +
                    '<select onchange="changeTimepickerheader(this,`1`,' + n + ')" size="5" class="timepicker_hour" ></select>' +
                    '</div>' +
                    '<div class="timing_title">' +
                    '<label for="" class="label_title">Min</label>' +
                    '<select onchange="changeTimepickerheader(this,`2`,' + n + ')" size="5" class="timepicker_minute"></select>' +
                    '</div>' +
                    '</div>' +
                    '<div class="timepicker_control"></div>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '<span class="form-text">No Late Fine for 0 mins</span>' +
                    '</div>' +
                    '<div class="shift-item">' +
                    '<label class="shift-type-label">Overtime Type <span class="required">*</span></label>' +
                    '<select id="overtime_type_' + n + '" name="data[' + n + '][overtime_type]" class="form-select create-select section_sub_title account_setting_data">' +
                    '<option value="">Select Overtime Type</option>' +
                    '<option value="fixed">Fixed Amount</option>' +
                    '<option value="1">1x Salary (Per Minutes Salary)</option>' +
                    '<option value="1.5">1.5x Salary (Per Minutes Salary)</option>' +
                    '<option value="2">2x Salary (Per Minutes Salary)</option>' +
                    '<option value="custom">Add Custom Salary Multiple</option>' +
                    '</select>' +
                    '</div>' +
                    '<div class="shift-item" style="margin-top: auto; margin-bottom: auto">' +
                    '</div>' +
                    // Append the delete button
                    '<div class="total-delete-icon">' +
                    '<a href="JavaScript:void(0);" class="text-danger single-remove" id="delete_' + n + '">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">' +
                    '<path fill-rule="evenodd" clip-rule="evenodd" d="M3.32085 4.8749C3.42492 4.76287 3.57092 4.69922 3.72383 4.69922H14.2493C14.402 4.69922 14.5478 4.76268 14.6518 4.87442C14.7559 4.98615 14.8088 5.13611 14.7979 5.28839L14.1477 14.3949C14.0708 15.4677 13.1783 16.2992 12.1028 16.2992H5.89283C4.81935 16.2992 3.92801 15.4709 3.84811 14.4004L3.17532 5.28972C3.16406 5.13723 3.21679 4.98694 3.32085 4.8749ZM12.1028 15.1992C12.6009 15.1992 13.0148 14.8141 13.0505 14.3164L13.6587 5.79922H4.31594L4.94505 14.3185C4.94505 14.3185 4.94506 14.3186 4.94505 14.3185C4.98219 14.8155 5.39584 15.1992 5.89283 15.1992H12.1028Z" fill="#808080" />' +
                    '<path fill-rule="evenodd" clip-rule="evenodd" d="M8.99922 7.69922C9.30298 7.69922 9.54922 7.94546 9.54922 8.24922V12.7492C9.54922 13.053 9.30298 13.2992 8.99922 13.2992C8.69546 13.2992 8.44922 13.053 8.44922 12.7492V8.24922C8.44922 7.94546 8.69546 7.69922 8.99922 7.69922Z" fill="#808080" />' +
                    '<path fill-rule="evenodd" clip-rule="evenodd" d="M2.44922 5.24922C2.44922 4.94546 2.69546 4.69922 2.99922 4.69922H14.9992C15.303 4.69922 15.5492 4.94546 15.5492 5.24922C15.5492 5.55298 15.303 5.79922 14.9992 5.79922H2.99922C2.69546 5.79922 2.44922 5.55298 2.44922 5.24922Z" fill="#808080" />' +
                    '<path fill-rule="evenodd" clip-rule="evenodd" d="M5.49416 3.02953C5.79441 2.22921 6.55906 1.69922 7.41387 1.69922H10.5849C11.4397 1.69922 12.2043 2.22921 12.5046 3.02953L13.2644 5.05614C13.371 5.34057 13.2269 5.65758 12.9424 5.76422C12.658 5.87085 12.341 5.72672 12.2344 5.44229L11.4747 3.41591C11.4746 3.41587 11.4747 3.41595 11.4747 3.41591C11.3354 3.04479 10.981 2.79922 10.5849 2.79922H7.41387C7.01771 2.79922 6.6634 3.04467 6.52411 3.41579C6.5241 3.41583 6.52413 3.41576 6.52411 3.41579L5.76436 5.44229C5.65773 5.72672 5.34072 5.87085 5.05629 5.76422C4.77187 5.65758 4.62774 5.34057 4.73437 5.05614L5.49416 3.02953Z" fill="#808080" />' +
                    '<path fill-rule="evenodd" clip-rule="evenodd" d="M11.6111 7.70065C11.914 7.72236 12.142 7.98558 12.1203 8.28856L11.7978 12.7886C11.7761 13.0915 11.5129 13.3195 11.2099 13.2978C10.9069 13.2761 10.6789 13.0129 10.7006 12.7099L11.0231 8.20993C11.0449 7.90695 11.3081 7.67894 11.6111 7.70065Z" fill="#808080" />' +
                    '<path fill-rule="evenodd" clip-rule="evenodd" d="M6.38766 7.70065C6.69064 7.67894 6.95386 7.90695 6.97557 8.20993L7.29807 12.7099C7.31978 13.0129 7.09177 13.2761 6.78879 13.2978C6.48581 13.3195 6.2226 13.0915 6.20088 12.7886L5.87838 8.28856C5.85667 7.98558 6.08468 7.72236 6.38766 7.70065Z" fill="#808080" />' +
                    '</svg>' +
                    '</a>' +
                    '</div>' +
                    '</div>'; // End of new shift container HTML
                // Append the new shift container to the shifts section
                $('.shifts').append(newShiftContainer);
                // Optional: Initialize any additional JS for new elements (such as event listeners for the delete buttons)
                initializeDropdowns();
                initializeDeleteButton(n);
            }
            // Initialize delete button functionality
            function initializeDeleteButton(shiftId) {
                $('#delete_' + shiftId).click(function () {
                    $('#' + shiftId).remove(); // Remove the shift container when delete is clicked
                });
            }
            // Handle dropdown selection
            $(document).on('click touch', '.selectDropdown ul li a', function (e) {
                e.preventDefault();
                var dropdown = $(this).closest('.selectDropdown');
                var active = $(this).parent().hasClass('active');
                var label = active ? dropdown.find('select').attr('placeholder') : $(this).text();
                dropdown.find('option').prop('selected', false);
                dropdown.find('ul li').removeClass('active');
                dropdown.toggleClass('filled', !active);
                dropdown.children('span').text(label);
                if (!active) {
                    dropdown.find('option:contains(' + $(this).text() + ')').prop('selected', true);
                    $(this).parent().addClass('active');
                }
                dropdown.find('option:contains(' + $(this).text() + ')').prop('selected', true);
                dropdown.removeClass('open');
            });
            // Toggle dropdown visibility
            $(document).on('click touch', '.account_setting_data > span', function (e) {
                var self = $(this).parent();
                self.toggleClass('open');
            });
            // Hide dropdown when clicking outside
            $(document).on('click', function (e) {
                var container = $(".account_setting_data");
                if (!container.is(e.target) && container.has(e.target).length === 0) {
                    container.removeClass("open");
                }
            });
            // Initialize dropdowns on page load
            initializeDropdowns();
            $('#add_overtime_rules').submit(function (event) {
                event.preventDefault();
                var give_overtime = 0;
                var half_day_overtime = 0;
                var full_day_overtime = 0;
                var give_overtime_type = 'give overtime';
                var half_day_overtime_type = 'half day overtime';
                var full_day_overtime_type = 'full day overtime';
                if ($("#give_overtime").prop('checked') == true) {
                    give_overtime = 1;
                }
                if ($("#half_day_overtime").prop('checked') == true) {
                    half_day_overtime = 1;
                }
                if ($("#full_day_overtime").prop('checked') == true) {
                    full_day_overtime = 1;
                }
                var formData = new FormData($(this)[0]);
                formData.append('give_overtime', give_overtime);
                formData.append('half_day_overtime', half_day_overtime);
                formData.append('full_day_overtime', full_day_overtime);
                formData.append('give_overtime_type', give_overtime_type);
                formData.append('half_day_overtime_type', half_day_overtime_type);
                formData.append('full_day_overtime_type', full_day_overtime_type);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('store_overtime_rules') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        if (response['status'] == 1) {
                            $('.loader').show();
                            $('#create-overtime-btn').prop('disabled', true);
                            toastr["success"](response.message);
                            // $('#add_overtime_rules')[0].reset();
                            setTimeout(function () {
                                // window.location.href = '/setting/automation_rules';
                                window.location.href = '/setting/automation_rules_new';
                            }, 3000);
                        } else {
                            toastr["error"](response.message)
                        }
                    }
                });
            });
        });
        function addAmountField(id) {
            var inputField = $('<input />').attr({
                type: 'number',
                class: 'form-control shift-edit-input',
                name: 'data[' + id + '][amount]',
                id: 'amount_' + id,
                placeholder: 'Enter amount'
            });
            // Ensure we target the last div within the shift-container correctly
            $('#' + id).find('.shift-item').last().empty().append(inputField);
        }
        function addCustomField(id) {
            var inputField = $('<input />').attr({
                type: 'text',
                class: 'form-control shift-edit-input',
                name: 'data[' + id + '][overtime_type]',
                id: 'overtime_type_' + id,
                placeholder: 'Enter multiple'
            });
            $('#' + id).find('.shift-item').last().empty().append(inputField);
        }
        function editField(id) {
            // Remove existing hidden input
            $('#overtime_type_' + id).remove();
            // Define the new select dropdown element
            var inputField = ` <div class="shifts-data">
                                <div class="filters sidebar-select approve-punch-data">
                                    <label class="shift-type-label">Overtime Type <span class="required">*</span></label>
                                    <select id="overtime_type_${id}" name="data[${id}][overtime_type]" class="form-select create-select section_sub_title account_setting_data">
                                        <option value="">Select Overtime Type</option>
                                        <option value="fixed">Fixed Amount</option>
                                        <option value="1">1x Salary (Per Minutes Salary)</option>
                                        <option value="1.5">1.5x Salary (Per Minutes Salary)</option>
                                        <option value="2">2x Salary (Per Minutes Salary)</option>
                                        <option value="custom">Add Custom Salary Multiple</option>
                                    </select>
                                </div>
                            </div>`;
            // Select the appropriate `.shift-item` within the `.shift-container` related to the current id
            $('#shift_hour_' + id).closest('.shift-container').find('.shift-item:nth-child(2)').empty().append(inputField);
            // Re-initialize dropdowns if required
            initializeDropdowns();
        }
        function initializeDropdowns() {
            $('select.account_setting_data').each(function () {
                if (!$(this).parent().hasClass('selectDropdown')) {  // Ensure we only wrap if not already wrapped
                    var dropdown = $('<div />').addClass('account_setting_data selectDropdown');
                    $(this).wrap(dropdown);
                    var label = $('<span />').text($(this).attr('placeholder')).insertAfter($(this));
                    var list = $('<ul />');
                    var select = $(this);
                    $(this).find('option').each(function () {
                        var optionValue = $(this).val();
                        if ($(this).text() == 'Fixed Amount') {
                            // var trId = select.closest('tr').attr('id');
                            var trId = select.closest('.shift-container').attr('id');
                            list.append($('<li />').append($('<a class="select_business_category" style="color: #2F8CFF!important;" data-id="' + optionValue + '" onclick="addAmountField(\'' + trId + '\')"/>').text($(this).text())));
                        } else if ($(this).text() == 'Add Custom Salary Multiple') {
                            // var trId = select.closest('tr').attr('id');
                            var trId = select.closest('.shift-container').attr('id');
                            list.append($('<li />').append($('<a class="select_business_category" style="color: #2F8CFF!important;" data-id="' + optionValue + '" onclick="addCustomField(\'' + trId + '\')"/>').text($(this).text())));
                        }
                        else {
                            list.append($('<li />').append($('<a class="select_business_category" data-id="' + optionValue + '" />').text($(this).text())));
                        }
                    });
                    list.insertAfter($(this));
                    if ($(this).find('option:selected').length) {
                        label.text($(this).find('option:selected').text());
                        list.find('li:contains(' + $(this).find('option:selected').text() + ')').addClass('active');
                        $(this).parent().addClass('filled');
                    }
                }
            });
        }
        var deleteId;
        function deleteOvertime(id) {
            deleteId = id;
        }
        $('#delete_overtime_btn').on('click', function () {
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                url: "{{ route('delete_overtime') }}",
                type: "POST",
                data: { "delete_id": deleteId },
                success: function (response) {
                    if (response['status'] == 1) {
                        $('.cancel_modal .loader').show();
                        $('.cancel_modal').prop('disabled', true);
                        $('.delete_overtime_btn .loader').show();
                        $('.delete_overtime_btn').prop('disabled', true);
                        toastr["success"](response.message);
                        $('#deleteModal').modal('hide');
                        setTimeout(function () {
                            location.reload(true)
                        }, 2000);
                    } else {
                        toastr["error"](response.message)
                    }
                }
            });
        })
    

/* ---- raw @section(scripts) remainder ---- */

    
    
