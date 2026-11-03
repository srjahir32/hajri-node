






        var table;
        $(document).ready(function () {
            $('.date').datepicker({
                format: "MM yyyy",
                startView: "months",
                minViewMode: "months",
                autoclose: true
            }).on('changeDate', function (e) {
                $('#calender_date').trigger('change');
            });

            //  datatable
            if (!localStorage.getItem('attendanceStatus')) {
                $('.status_filter option[value="all"]').prop('selected', true);
            } else {
                $('.status_filter').val(localStorage.getItem('attendanceStatus')).prop('selected', true);
            }
            
            table = $('#staff_datas').DataTable({
                serverSide: true,
                processing: true,
                searching: false,
                lengthChange: false,
                info: false,
                responsive: true,
                order: [],
                ajax: {
                    "url": "{{ route('user_attendance_list') }}",
                    "dataType": "json",
                    "type": "POST",
                    "data": function(d) {
                        d._token = "{{csrf_token()}}";
                        d.searchValue = $('#staff_data_find').val();
                        d.calender_date = $('#calender_date').val();
                        d.number_page_sorting = $('.number_page_sorting').val();
                        d.status = localStorage.getItem('attendanceStatus');
                    },
                    "dataSrc": "data"
                },
                language: {
                    zeroRecords: '<div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, add staff</div></div>',
                    emptyTable: '<div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, add staff</div></div>'
                },
                drawCallback: function (settings) {
                    initCustomSelect();

                    $('.mySelect').on('change', function (e) {
                        var selectedOption = $(this).find('option:selected');
                        var id = selectedOption.data('record-id');
                        var status = $(this).val();
                        var calender_date = $('#calender_date').val();
                        if(typeof changeStatus === 'function') {
                            changeStatus(id, status, calender_date);
                        }
                    });
                },
                columns: [
                    { "data": "date" },
                    { "data": "in_time" },
                    { "data": "out_time" },
                    { "data": "break_time" },
                    { "data": "staff_time" },
                    { "data": "status" },
                    { "data": "behavior" },
                    { "data": "overtime" },
                    { "data": "attendance_status" },
                ],
                columnDefs: [
                    { 'targets': [5], 'orderable': false }
                ]
            });
            $('.dataTables_length').addClass('bs-select');
            
            // Helper function to handle table updates (page length and reload)
            function updateTable() {
                var number_page_sorting = $('.number_page_sorting').val();
                
                // Handle Pagination Select Dropdown Width
                var staffSelectWidth = $('.staff-option_select').outerWidth();
                if (number_page_sorting == 'all') {
                    $('.attendance-down-data-paginat .select2-dropdown').addClass("pagination_all_data");
                } else if (number_page_sorting === '10perpage') {
                    $('.attendance-down-data-paginat .select2-dropdown').removeClass("pagination_all_data");
                    $('.attendance-down-data-paginat.select2-container--open .select2-dropdown').css('width', staffSelectWidth + 'px');
                } else if (number_page_sorting === '50perpage') {
                    $('.attendance-down-data-paginat .select2-dropdown').removeClass("pagination_all_data");
                    $('.attendance-down-data-paginat.select2-container--open .select2-dropdown').css('width', staffSelectWidth + 'px');
                } else if (number_page_sorting === '100perpage') {
                    $('.attendance-down-data-paginat .select2-dropdown').removeClass("pagination_all_data");
                    $('.attendance-down-data-paginat.select2-container--open .select2-dropdown').css('width', staffSelectWidth + 'px');
                } else {
                    $('.attendance-down-data-paginat .select2-dropdown').removeClass("pagination_all_data");
                    $('.attendance-down-data-paginat.select2-container--open .select2-dropdown').css('width', staffSelectWidth + 'px');
                }
                
                // Determine Page Length
                var len = 10;
                if(number_page_sorting === 'all') len = -1;
                else if(number_page_sorting === '10perpage') len = 10;
                else if(number_page_sorting === '50perpage') len = 50;
                else if(number_page_sorting === '100perpage') len = 100;
                else len = parseInt(number_page_sorting) || 10;

                // Update and Draw
                if(table.page.len() !== len) {
                    table.page.len(len).draw(); // draw() triggers a reload
                } else {
                    table.ajax.reload();
                }
            }


            function initCustomSelect() {
                $('.mySelect').each(function () {
                    const $select = $(this);
                    if ($select.next('.custom-select-container').length > 0) return; // Prevent double init

                    // Create custom select container
                    const $container = $('<div class="custom-select-container"></div>');
                    const $selected = $('<div class="select-selected"></div>');
                    const $items = $('<div class="select-items"></div>');

                    // Hide original select
                    $select.addClass('original-select');

                    // Add options to custom select
                    $select.find('option').each(function () {
                        const $option = $(this);
                        const imageUrl = $option.data('image');
                        const value = $option.val();
                        const text = $option.text();

                        const $item = $(`
                    <div class="select-item" data-value="${value}">
                        <img src="${imageUrl}" alt="${text}">
                        <span>${text}</span>
                    </div>
                `);

                        // Handle option click
                        $item.on('click', function () {
                            const selectedValue = $(this).data('value');
                            $select.val(selectedValue).trigger('change');

                            // Update selected display
                            const selectedHtml = $(this).html();
                            $selected.html(selectedHtml);

                            $items.hide();
                        });

                        $items.append($item);

                        // Set initial selected value
                        if ($option.is(':selected')) {
                            $selected.html($item.html());
                        }
                    });

                    // Toggle dropdown on click
                    $selected.on('click', function (e) {
                        e.stopPropagation();
                        $('.select-items').not($items).hide();
                        $items.toggle();
                    });

                    // Close all dropdowns when clicking outside
                    $(document).on('click', function () {
                        $('.select-items').hide();
                    });

                    // Insert custom select after the original select
                    $select.after($container);

                    // Move select into container and append custom elements
                    $container.append($select);
                    $container.append($selected);
                    $container.append($items);
                });
            }

            $('#staff_data_find').on('input', function () {
                updateTable();
            });

            $('#calender_date').on('change', function () {
                updateTable();
            });

            $('.number_page_sorting').change(function () {
                updateTable();
            });


            var selectedText = $('.status_filter').find('option:selected').text();
            $('.status_filter').siblings('.select2-container').find('.select2-selection__rendered').html('<span class="sort_by_text">Sort by </span>' + selectedText);
            $('.status_filter').change(function () {
                var status = $('.status_filter').val();
                localStorage.setItem('attendanceStatus', status);
                var selectedText = $('.status_filter').find('option:selected').text();
                $('.status_filter').siblings('.select2-container').find('.select2-selection__rendered').html('<span class="sort_by_text">Sort by </span>' + selectedText);
                updateTable();
            });

        });
    

/* ---- raw @section(scripts) remainder ---- */


    
    
    
    
    
    
    
    <link rel="stylesheet" href="https://js.api.here.com/v3/3.1/mapsjs-ui.css" />
    
