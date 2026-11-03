

    $(document).ready(function () {
        // Initialize Flatpickr
        var startDatePicker = flatpickr("#start_date", {
            dateFormat: "Y-m-d",
            allowInput: false,
            minDate: "today",
            onChange: function(selectedDates, dateStr, instance) {
                if (endDatePicker) {
                    endDatePicker.set('minDate', dateStr);
                }
            }
        });
        
        var endDatePicker = flatpickr("#end_date", {
            dateFormat: "Y-m-d",
            allowInput: false,
            minDate: "today"
        });
        function setupCustomDropdown(btnId, selectId) {
            var $btn = $('#' + btnId);
            var $select = $('#' + selectId);
            var $parent = $btn.parent();
            // Build dropdown list container
            var $list = $('<ul class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto hidden custom-dropdown-list" style="margin-top: -8px!important; padding-left: 5px!important;"></ul>');
            // Populate list from select options
            $select.find('option').each(function () {
                var $opt = $(this);
                var val = $opt.val();
                var text = $opt.text();
                var isDisabled = $opt.is(':disabled');
                
                if (isDisabled && val === "") return; // Skip the placeholder ("Select...")
                
                // Create list item
                var $li = $('<li class="text-sm cursor-pointer select-none relative py-2.5 pl-3 pr-9 transition-colors flex items-center justify-between"></li>');
                
                if(isDisabled){
                    $li.addClass('text-gray-400 cursor-not-allowed bg-gray-50/50').css('pointer-events', 'none');
                } else {
                    $li.addClass('text-gray-700 hover:bg-gray-50');
                }

                // Add text span
                var $textSpan = $('<span class="block truncate"></span>').text(text);
                $li.append($textSpan);
                // Add checkmark icon (hidden by default)
                var $checkmark = $('<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-primary hidden"><svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg></span>');
                $li.append($checkmark);
                $li.data('value', val);
                $li.data('checkmark', $checkmark);
                $li.data('disabled', isDisabled);
                $list.append($li);
            });
            $parent.append($list);
            // Toggle Dropdown
            $btn.on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                // Close other dropdowns
                $('.custom-dropdown-list').not($list).addClass('hidden');
                $list.toggleClass('hidden');
            });
            // Handle Selection
            $list.on('click', 'li', function (e) {
                e.stopPropagation();
                var $li = $(this);
                if($li.data('disabled')) return;
                
                var val = $li.data('value');
                var text = $li.find('span').first().text();
                // 1. Update Button Text and color
                var $btnSpan = $btn.find('span').first();
                $btnSpan.text(text);
                $btnSpan.css('color', '#111827'); // Change to darker color (gray-900)
                // 2. Visual Feedback in List - Update all items
                $list.find('li').each(function () {
                    var $item = $(this);
                    var $itemCheckmark = $item.data('checkmark');
                    var $itemText = $item.find('span').first();
                    if ($item.data('value') == val) {
                        $itemText.addClass('font-semibold text-gray-900');
                        $itemCheckmark.removeClass('hidden');
                    } else {
                        $itemText.removeClass('font-semibold text-gray-900');
                        $itemCheckmark.addClass('hidden');
                    }
                });
                // 3. Close Dropdown
                $list.addClass('hidden');
                // 4. Update Hidden Select
                $select.val(val).trigger('change');
            });
            
            // Close on Outside Click
            $(document).on('click', function (e) {
                if (!$parent.is(e.target) && $parent.has(e.target).length === 0) {
                    $list.addClass('hidden');
                }
            });
        }
        // Initialize for Leave Type
        setupCustomDropdown('leave_type_btn', 'leave_type');
        // Initialize for Leave Duration
        setupCustomDropdown('leave_duration_btn', 'leave_duration');
        
        // Initialize for Shift Type
        setupCustomDropdown('shift_type_btn', 'shift_type');
        
        $('#leave_duration').on('change', function() {
            if ($(this).val() === 'Half Day') {
                $('#shift_type_container').removeClass('hidden');
            } else {
                $('#shift_type_container').addClass('hidden');
                $('#shift_type').val('');
                $('#shift_type_btn span:first').text('Select Shift Type').css('color', '#6b7280');
                var $list = $('#shift_type_btn').parent().find('.custom-dropdown-list');
                $list.find('li').each(function() {
                    $(this).find('span:first').removeClass('font-semibold text-gray-900');
                    $(this).data('checkmark').addClass('hidden');
                });
            }
        });

        // Prevent leading spaces in Reason field
        $('#reason').on('input', function() {
            if (/^\s/.test($(this).val())) {
                $(this).val($(this).val().replace(/^\s+/, ''));
            }
        });

        function fieldvalidation() {
            var valid = true;
            $(".error").remove();
            if ($('#start_date').val() == "") {
                $("#start_date").parent().after(
                    '<span class="error error_message proxima_nova_semibold">Start Date is required</span>'
                );
                valid = false;
            }
            if ($('#end_date').val() == "") {
                $("#end_date").parent().after(
                    '<span class="error error_message proxima_nova_semibold">End Date is required</span>'
                );
                valid = false;
            }
            if ($('#leave_type').val() == null || $('#leave_type').val() == "") {
                $("#leave_type").parent().append(
                    '<span class="error error_message proxima_nova_semibold">Leave Type is required</span>'
                );
                valid = false;
            }
            if ($('#leave_duration').val() == null || $('#leave_duration').val() == "") {
                $("#leave_duration").parent().append(
                    '<span class="error error_message proxima_nova_semibold">Leave Duration is required</span>'
                );
                valid = false;
            } else if ($('#leave_duration').val() == 'Half Day') {
                if ($('#shift_type').val() == null || $('#shift_type').val() == "") {
                    $("#shift_type").parent().append(
                        '<span class="error error_message proxima_nova_semibold">Shift Type is required</span>'
                    );
                    valid = false;
                }
            }
            if ($.trim($('#reason').val()) == "") {
                $("#reason").after(
                    '<span class="error error_message proxima_nova_semibold">Reason is required</span>'
                );
                valid = false;
            }
            return valid;
        }
        $('#submit_leave').click(function () {
            if (fieldvalidation()) {
                $('#submit_leave').prop('disabled', true);
                var formData = new FormData($('#add_leave_form')[0]);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('store-leave') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        if (response['status'] == 1) {
                            toastr["success"](response.message)
                            setTimeout(function () {
                                var redirectUrl = "{{ route('user-leaves') }}"
                                window.location.href = redirectUrl;
                            }, 3000);
                        } else if (response['status'] == 0) {
                            $('#submit_leave').prop('disabled', false);
                            toastr["error"](response.message)
                        } else {
                            $('#submit_leave').prop('disabled', false);
                            toastr["error"](response.message)
                        }
                    },
                    error: function () {
                        $('#submit_leave').prop('disabled', false);
                        toastr["error"]("An error occurred. Please try again.");
                    }
                });
            }
        });
    });


/* ---- raw @section(scripts) remainder ---- */



