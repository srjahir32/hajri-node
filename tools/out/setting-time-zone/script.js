
        $(document).ready(function () {
            const dropdownContainer = $('#timezone-dropdown-container');
            const searchInput = $('#timezone-search');
            const options = $('#timezone-options-list li').not('#no-results');
            const noResults = $('#no-results');
            const trigger = dropdownContainer.find('.dropdown-trigger');
            const menu = dropdownContainer.find('.dropdown-options');
            const select = $('#timezone');
            const selectedValueSpan = dropdownContainer.find('.selected-value');
            const clearBtn = $('#clear-timezone');

            function filterOptions() {
                const query = searchInput.val().toLowerCase().trim();
                let matchCount = 0;

                options.each(function () {
                    const text = $(this).data('value').toLowerCase();
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
                const text = $(this).text().trim();

                selectedValueSpan.text(text);
                select.val(value).trigger('change');
                options.removeClass('selected');
                $(this).addClass('selected');
                clearBtn.removeClass('hidden').show();

                menu.slideUp(100);
            });

            // Clear timezone selection
            clearBtn.on('click', function (e) {
                e.stopPropagation();
                select.val('').trigger('change');
                selectedValueSpan.text('Select Time Zone');
                options.removeClass('selected');
                clearBtn.addClass('hidden').hide();
                filterOptions();
                if (!menu.is(':visible')) {
                    menu.slideDown(100);
                }
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
        });

        function fieldValidation() {
            var valid = true;
            $(".error").remove();
            if ($('#timezone').val() == "") {
                $(".dropdown-trigger").after(
                    '<span class="error error_message proxima_nova_semibold mt-1 block text-danger">Time Zone is required</span>'
                );
                valid = false;
            }
            return valid;
        }

        $('#timezone_setting').submit(function (event) {
            event.preventDefault();
            if (fieldValidation()) {
                $('.loader').show();
                $('#save-btn').prop('disabled', true);
                var formData = new FormData($(this)[0]);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('time_zone_store') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        $('.loader').hide();
                        $('#save-btn').prop('disabled', false);
                        if (response['status'] == 1) {
                            toastr["success"](response.message);
                            setTimeout(function () {
                                location.reload();
                            }, 1500);
                        } else {
                            toastr["error"](response.message)
                        }
                    },
                    error: function (xhr, status, error) {
                        $('.loader').hide();
                        $('#save-btn').prop('disabled', false);
                        toastr["error"]("An error occurred. Please try again.");
                    }
                });
            }
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
