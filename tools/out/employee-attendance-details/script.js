
    $(document).ready(function() {
        // --- Shared Data Loading Function ---
        function loadAttendanceData(url) {
            // Visual feedback - opacity
            $('#attendance-card-container').css('opacity', '0.5');
            $.ajax({
                url: url,
                type: "GET",
                dataType: "json",
                success: function(response) {
                    $('#attendance-card-container').html(response.html);
                    $('#attendance-card-container').css('opacity', '1');
                    // Update header title if provided
                    if(response.monthTitle) {
                        $('#header-date-title').text(response.monthTitle);
                    }
                    // Update URL
                    window.history.pushState(null, '', url);
                    // Update active state of links
                    $('.ajax-link').removeClass('active');
                    $('.ajax-link').each(function() {
                       if($(this).attr('href') === url) {
                           $(this).addClass('active');
                       }
                    });
                },
                error: function(xhr) {
                    $('#attendance-card-container').css('opacity', '1');
                    console.log('Error:', xhr);
                    toastr.error('Failed to load data.');
                }
            });
        }
        // --- Filter Links Handler ---
        $(document).on('click', '.ajax-link', function(e) {
            e.preventDefault();
            var url = $(this).attr('href');
            loadAttendanceData(url);
        });
        // --- Custom Date Picker Logic ---
        let pickerYear = {{ $currentMonth->year }};
        // Month names
        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        // Limits based on current real time
        const realYear = {{ \Carbon\Carbon::now()->year }};
        const realMonth = {{ \Carbon\Carbon::now()->month }};
        function renderPicker() {
            $('#picker-year-display').text(pickerYear);
            // Handle Next Year Button State
            if (pickerYear >= realYear) {
                $('#picker-next-year').prop('disabled', true).addClass('opacity-50 cursor-not-allowed');
            } else {
                $('#picker-next-year').prop('disabled', false).removeClass('opacity-50 cursor-not-allowed');
            }
            const grid = $('#picker-months-grid');
            grid.empty();
            months.forEach((name, index) => {
                const monthNum = index + 1;
                // Hide future months if in current year
                if (pickerYear === realYear && monthNum > realMonth) {
                    return;
                }
                // Safety: Hide all if somehow in future year
                if (pickerYear > realYear) {
                    return;
                }
                // Check if this month is the currently selected one (in the view)
                // We compare based on the init data or updated selection
                // Logic: If pickerYear matches currently view year and monthNum matches view month
                // Construct date string for comparison
                const monthStr = monthNum.toString().padStart(2, '0');
                const itemDateStr = `${pickerYear}-${monthStr}`;
                // Check if active (matches current URL state roughly)
                const isActive = (pickerYear == activeMonthYear.year && monthNum == activeMonthYear.month);
                const btn = $('<button>')
                    .addClass('p-2 text-sm font-medium rounded-lg transition-colors duration-200 w-[30%] flex-grow text-center')
                    .text(name)
                    .attr('type', 'button')
                    .data('month', monthStr)
                    .data('year', pickerYear);
                if (isActive) {
                    btn.addClass('bg-blue-500 text-white shadow-md shadow-blue-200');
                } else {
                    btn.addClass('text-gray-600 hover:bg-gray-100');
                }
                btn.on('click', function() {
                    const selectedY = $(this).data('year');
                    const selectedM = $(this).data('month');
                    // Update Active State Tracking
                    activeMonthYear = { year: selectedY, month: parseInt(selectedM) };
                    // Close Picker
                    $('#custom-date-picker').addClass('hidden');
                    // Load Data
                    const newUrl = `?month=${selectedY}-${selectedM}`;
                    loadAttendanceData(newUrl);
                });
                grid.append(btn);
            });
        }
        // State to track the currently "Active" data shown on screen
        // Initialize with server provided data
        let activeMonthYear = {
            year: {{ $currentMonth->year }},
            month: {{ $currentMonth->month }}
        };
        // Initialize
        renderPicker();
        // Toggle Visibility
        $('#date-picker-trigger').on('click', function(e) {
            e.stopPropagation();
            $('#custom-date-picker').toggleClass('hidden');
            // If opening, reset picker year to active view year? 
            // Or keep last browsed? Keeping last browsed is often better, but resetting to active is safer.
            // Let's reset to active view year if opening
            if (!$('#custom-date-picker').hasClass('hidden')) {
                pickerYear = activeMonthYear.year;
                renderPicker();
            }
        });
        // Close when clicking outside
        $(document).on('click', function(e) {
            if (!$(e.target).closest('#date-picker-trigger, #custom-date-picker').length) {
                $('#custom-date-picker').addClass('hidden');
            }
        });
        // Year Navigation
        $('#picker-prev-year').on('click', function(e) {
            e.stopPropagation();
            pickerYear--;
            renderPicker();
        });
        $('#picker-next-year').on('click', function(e) {
            e.stopPropagation();
            pickerYear++;
            renderPicker();
        });
    });


/* ---- raw @section(scripts) remainder ---- */


