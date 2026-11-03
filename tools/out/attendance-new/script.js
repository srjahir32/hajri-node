






        // $(document).ready(function() {
        //     // Toggle dropdown
        //     $('.custom-select-trigger').click(function(e) {
        //         e.stopPropagation();
        //         const options = $(this).siblings('.custom-select-options');
        //         options.slideToggle(100);
        //     });
        //     // Select option
        //     $('.custom-select-options li').click(function() {
        //         const value = $(this).data('value');
        //         const text = $(this).text();
        //         // Update trigger text
        //         $(this).closest('.custom-select-wrapper').find('.custom-select-trigger').text(text);
        //         // Update hidden select value
        //         $(this).closest('.custom-select-wrapper').find('select').val(value);
        //         // Update selected state
        //         $(this).siblings().removeClass('selected');
        //         $(this).addClass('selected');
        //         // Hide dropdown
        //         $(this).parent().slideUp(100);
        //         // Trigger change event on original select
        //         $(this).closest('.custom-select-wrapper').find('select').trigger('change');
        //     });
        //     // Close dropdown when clicking outside
        //     $(document).click(function() {
        //         $('.custom-select-options').slideUp(100);
        //     });
        // });
        // jQuery Code
        // $(document).ready(function () {
        //     $('.mySelect_sort').select2({
        //         minimumResultsForSearch: Infinity,
        //     }).on('select2:open', function (e) {
        //         $('.select2-container').addClass('attendance-down-data');
        //         var staffSelectWidth = $('.staff-option_select').outerWidth();
        //         // console.log(staffSelectWidth);
        //         // Set the width of .attendance-down-data.select2-container--open .select2-dropdown when open
        //         $('.attendance-down-data.select2-container--open .select2-dropdown').css('width', staffSelectWidth + 'px');
        //     });
        //     $('.mySelect_pagi').select2({
        //         minimumResultsForSearch: Infinity,
        //     }).on('select2:open', function (e) {
        //         $('.select2-container').addClass('attendance-down-data-paginat');
        //     })
        // });
        // $(document).ready(function () {
        //     $('.mySelect_sort').select2({
        //         minimumResultsForSearch: Infinity,
        //     }).on('select2:open', function (e) {
        //         $('.select2-container').addClass('attendance-down-data');
        //         var staffSelectWidth = $('.staff-option_select').outerWidth();
        //         // Set the width of .attendance-down-data.select2-container--open .select2-dropdown when open
        //         $('.attendance-down-data.select2-container--open .select2-dropdown').css('width', staffSelectWidth + 'px');
        //     });
        //     $('.mySelect_pagi').select2({
        //         minimumResultsForSearch: Infinity,
        //     }).on('select2:open', function (e) {
        //         $('.select2-container').addClass('attendance-down-data-paginat');
        //     })
        // });
        let map; // Declare map globally to reuse it
        let mapObjectsGroup; // Group for all objects to reset easily
        let ui; // Declare UI globally to manage bubbles
        // var business_id = $('#business_id').val();
        var staff_id = null;
        function mapLocation(id) {
            staff_id = id;
            getLiveLocation();
        }
        function getLiveLocation() {
            var date = $('#calender_date').val();
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                type: 'POST',
                url: "{{ route('staff_live_location') }}",
                data: {
                    // business_id: business_id,
                    staff_id: staff_id,
                    date: date,
                },
                success: function (response) {
                    showMap(response.data);
                    // Get coordinates from the textarea and process them
                    let lineString = [];
                    response.data.location.forEach((location, index) => {
                        lineString.push({
                            lat: location.latitude,
                            lng: location.longitude,
                            timestamp: Date.now()  // Add timestamp
                        });
                    })
                    // if (lineString.length < 2) {
                    //     alert('Please enter at least two coordinates');
                    //     return;
                    // }
                    // Send the data to the Laravel backend
                    $.ajax({
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        url: "{{ route('match-gps-trace') }}",
                        type: 'POST',
                        data: JSON.stringify({ locations: lineString }),
                        contentType: 'application/json',
                        success: function (result) {
                            var platform = new H.service.Platform({
                                'apikey': "<?= env('HERE_MAPS_APIKEY') ?>" // Replace with your HERE API key
                            });
                            // Use HARP as the engine type
                            const engineType = H.Map.EngineType.HARP;
                            // Obtain the default map types using the engineType
                            const maptypes = platform.createDefaultLayers({ engineType });
                            // Create a map centered at the first waypoint
                            var map = new H.Map(
                                document.getElementById('mapdiv'),
                                maptypes.vector.normal.map,
                                {
                                    engineType, // Use the specified engine type
                                    zoom: 16,
                                    center: { lat: result.response.route[0]['waypoint'][0].mappedPosition.latitude, lng: result.response.route[0]['waypoint'][0].mappedPosition.longitude }
                                }
                            );
                            // Add route to the map (assuming response contains the route data)
                            // var routeLineString = new H.geo.LineString();
                            // // result.response.route[0]['waypoint'].forEach(function (point) {
                            // //     routeLineString.pushLatLngAlt(point.mappedPosition.latitude, point.mappedPosition.longitude);
                            // // });
                            // result.response.route[0].leg.forEach(function (leg) {
                            //     leg.link.forEach(function (link) {
                            //         link.shape.forEach(function (coord, index) {
                            //             if (index % 2 === 0) {
                            //                 var lat = parseFloat(coord);
                            //                 var lng = parseFloat(link.shape[index + 1]);
                            //                 routeLineString.pushLatLngAlt(lat, lng);
                            //             }
                            //         });
                            //     });
                            // });
                            // var routeLine = new H.map.Polyline(routeLineString, {
                            //     style: {
                            //         lineWidth: 4,
                            //         strokeColor: 'rgba(0, 128, 255, 0.7)',
                            //         lineJoin: 'round'
                            //     }
                            // });
                            // // Add the route to the map
                            // map.addObject(routeLine);
                            var routeLineString = new H.geo.LineString();
                            result.response.route[0].leg.forEach(function (leg, legIndex) {
                                leg.link.forEach(function (link, linkIndex) {
                                    link.shape.forEach(function (coord, index, shapeArray) {
                                        if (index % 2 === 0) {
                                            var lat = parseFloat(coord);
                                            var lng = parseFloat(link.shape[index + 1]);
                                            routeLineString.pushLatLngAlt(lat, lng);
                                            // Default marker icon and size
                                            let iconUrl = '{{ URL::asset('/assets/dot.png') }}';
                                            let iconSize = new H.math.Size(20, 20); // Default size
                                            // Check conditions for first and last marker
                                            if (index === 0 && linkIndex === 0 && legIndex === 0) {
                                                iconUrl = 'https://img.icons8.com/ios-filled/50/2db83d/marker.png'; // Green for first marker
                                                iconSize = new H.math.Size(35, 35); // Larger size for start marker
                                            } else if (index === shapeArray.length - 2 && linkIndex === leg.link.length - 1 && legIndex === result.response.route[0].leg.length - 1) {
                                                iconUrl = 'https://img.icons8.com/ios-filled/50/FF0000/marker.png'; // Red for last marker
                                                iconSize = new H.math.Size(35, 35); // Larger size for end marker
                                            }
                                            // Create a marker with the defined size
                                            var icon = new H.map.Icon(iconUrl, { size: iconSize });
                                            var marker = new H.map.Marker({ lat: lat, lng: lng }, { icon: icon });
                                            // Add the marker to the map
                                            map.addObject(marker);
                                        }
                                    });
                                });
                            });
                            // Add the route polyline to the map
                            var routeLine = new H.map.Polyline(routeLineString, {
                                style: {
                                    lineWidth: 4,
                                    strokeColor: '#2F8CFF',
                                    lineJoin: 'round'
                                }
                            });
                            map.addObject(routeLine);
                            // Enable map interaction
                            var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
                            // Add UI elements (e.g., zoom control)
                            var ui = H.ui.UI.createDefault(map, maptypes);
                        },
                        error: function (xhr) {
                            console.error(xhr.responseText);
                        }
                    });
                }
            });
        }
        function showMap(data) {
            const platform = new H.service.Platform({
                apikey: "<?= env('HERE_MAPS_APIKEY') ?>" // Replace with your actual API key
            });
            // Use HARP as the engine type
            const engineType = H.Map.EngineType.HARP;
            // Obtain the default map types using the engineType
            const maptypes = platform.createDefaultLayers({
                engineType: engineType,
                lg: "en",
            });
            if (!maptypes || !maptypes.vector || !maptypes.vector.normal) {
                console.error('Error: Unable to initialize map types with the specified engine type.');
                return;
            }
            if (!map) {
                // If map is not initialized, create it
                map = new H.Map(
                    document.getElementById('mapdiv'),
                    // maptypes.vector.normal.map, // Use the vector normal map type
                    maptypes.raster.satellite.map,
                    {
                        engineType, // Use the specified engine type
                        center: { lat: 21.1702, lng: 72.8311 }, // Default location
                        zoom: 13
                    }
                );
                // Add interaction behavior (zoom, pan, etc.)
                const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
                // Add UI components
                ui = H.ui.UI.createDefault(map, maptypes);
                // Handle window resize
                window.addEventListener('resize', () => map.getViewPort().resize());
                // Initialize a group for map objects
                mapObjectsGroup = new H.map.Group();
                map.addObject(mapObjectsGroup);
            }
            // Clear any existing objects on the map
            mapObjectsGroup.removeAll();
            if (data != null && data.location && data.location.length > 0) {
                // Create a LineString for the polyline
                const lineString = new H.geo.LineString();
                // Add markers and polyline points
                data.location.forEach((location, index) => {
                    lineString.pushPoint({ lat: location.latitude, lng: location.longitude });
                    let iconUrl = '{{ URL::asset('/assets/dot.png') }}';
                    // let iconUrl = 'https://img.icons8.com/ios-filled/50/0080ff/marker.png'; // Default blue marker
                    // let iconUrl = base_url('assets/dot.png'); // Default blue marker
                    if (index === 0) {
                        iconUrl = 'https://img.icons8.com/ios-filled/50/2db83d/marker.png'; // Green for first marker
                    } else if (index === data.location.length - 1) {
                        iconUrl = 'https://img.icons8.com/ios-filled/50/FF0000/marker.png'; // Red for last marker
                    }
                    let icon = new H.map.Icon(iconUrl, { size: { w: 20, h: 20 }, anchor: { x: 10, y: 10 } });
                    if (index === 0 || index === data.location.length - 1) {
                        icon = new H.map.Icon(iconUrl, { size: { w: 35, h: 35 }, anchor: { x: 17.5, y: 35 } });
                    }
                    const marker = new H.map.Marker(
                        { lat: location.latitude, lng: location.longitude },
                        { icon } // Assign the icon to the marker
                    );

                    // Add hover events for displaying a bubble
                    marker.addEventListener('pointerenter', (evt) => {
                        const content = `
                                <strong>Name:</strong> ${data.staff.name} ${data.staff.last_name}<br>
                                <strong>Battery:</strong> ${location.battery_percentage || 'N/A'}%<br>
                                <strong>Date:</strong> ${location.date || 'N/A'}<br>
                                <strong>Time:</strong> ${location.time || 'N/A'}
                            `;

                        let bubble = ui.getBubbles()[0];
                        if (!bubble) {
                            bubble = new H.ui.InfoBubble(evt.target.getGeometry(), { content: content });
                            ui.addBubble(bubble);
                        } else {
                            bubble.setContent(content);
                            bubble.setPosition(evt.target.getGeometry());
                            bubble.open();
                        }
                    });
                    // Close bubble when mouse leaves the marker
                    marker.addEventListener('pointerleave', () => {
                        ui.getBubbles().forEach(bubble => bubble.close());
                    });
                    // Add the marker to the group
                    mapObjectsGroup.addObject(marker);
                });
                if (data.location.length > 1) {
                    // Create a polyline and add it to the group
                    const polyline = new H.map.Polyline(lineString, {
                        style: { strokeColor: '#2F8CFF', lineWidth: 2 }
                    });
                    mapObjectsGroup.addObject(polyline);
                    // Adjust the map viewport to fit the polyline
                    map.getViewModel().setLookAtData({
                        bounds: polyline.getBoundingBox(),
                        zoom: 13
                    });
                } else {
                    // Center the map on the single point
                    const singleLocation = data.location[0];
                    map.getViewModel().setLookAtData({
                        position: { lat: singleLocation.latitude, lng: singleLocation.longitude },
                        zoom: 13
                    });
                }
            } else {
                // Reset to the default map center if no location data is provided
                map.getViewModel().setLookAtData({
                    position: { lat: 21.1702, lng: 72.8311 },
                    zoom: 13
                });
            }
        }
        var table;
        $(document).ready(function () {
            //  datatable
            if (!localStorage.getItem('attendanceStatus')) {
                $('.status_filter option[value="all"]').prop('selected', true);
            } else {
                $('.status_filter').val(localStorage.getItem('attendanceStatus')).prop('selected', true);
            }
            function datatable(searchValue = null, calender_date = null, number_page_sorting = null, status = null) {
                if (status == null) {
                    var status = localStorage.getItem('attendanceStatus');
                }
                table = $('#staff_datas').DataTable({
                    // "lengthMenu": [[5, 10, 20], [5, 10, 20]],
                    searching: false,
                    lengthChange: false,
                    info: false,
                    responsive: true,
                    // pagingType: "full_numbers",
                    order: [
                        // [1, "desc"]
                    ],
                    // drawCallback: function (settings) {
                    //     // If there is data, initialize Select2 and other functionalities
                    //     // $('.mySelect').select2({
                    //     //     templateResult: formatOption,
                    //     //     templateSelection: formatOption,
                    //     //     minimumResultsForSearch: Infinity,
                    //     // }).on('select2:open', function (e) {
                    //     //     $('.select2-container').addClass('atten_status_datas');
                    //     // });
                    //     initCustomSelect();
                    //
                    //     $('.mySelect').on('change', function (e) {
                    //         var selectedOption = $(this).find('option:selected');
                    //         var id = selectedOption.data('record-id');
                    //         var status = $(this).val();
                    //         var calender_date = $('#calender_date').val();
                    //         changeStatus(id, status, calender_date);
                    //     });
                    // },
                    ajax: {
                        "url": "{{ route('attendance_list') }}",
                        "dataType": "json",
                        "type": "POST",
                        "data": {
                            _token: "{{csrf_token()}}",
                            'searchValue': searchValue,
                            'calender_date': calender_date,
                            'number_page_sorting': number_page_sorting,
                            'status': status,
                        },
                        "dataSrc": "data"
                    },
                    initComplete: function (settings, json) {
                        var api = this.api();
                        if (table.rows().count() === 0) {
                            // Display image or advertisement
                            var adContent = '<tr><td colspan="9"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found</div></div></td></tr>';
                            $(api.table().body()).html(adContent);
                        }
                    },
                    columns: [
                        {
                            data: "name",
                            render: function (data, type, row) {
                                var routeUrl = "{{ route('staff-profile-new', ':id') }}";
                                var url = routeUrl.replace(':id', row.staff_id);
                                return `<a href="${url}" class="staff-edit">
                                                <div class="user-images">
                                                    <div><img src="${row.staff_photo}" class="approve-user-img" alt=""></div>
                                                    <div>${data}<p class="data-sub-field">${row.department_name}</p></div>
                                                </div>
                                            </a>
                                        `;
                            }
                        },
                        { "data": "in_time" },
                        { "data": "out_time" },
                        { "data": "break_time" },
                        { "data": "staff_time" },
                        { "data": "status" },
                        { "data": "behavior" },
                        { "data": "overtime" },
                        // {"data": "fine"},
                        { "data": "action" },
                    ],
                    // createdRow: function (row, data, dataIndex) {
                    //     $(row).attr('id', 'storie_col_' + data['id']);
                    // },
                    columnDefs: [
                        { "width": "95px", "targets": [1, 2] },
                        { 'targets': [5, 7], 'orderable': false }
                    ]
                });
                $('.dataTables_length').addClass('bs-select');
            }
            datatable();
            function initCustomSelect() {
                $('.mySelect').each(function () {
                    const $select = $(this);
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
                        const $item = $(`<div class="select-item" data-value="${value}">
                                            <img src="${imageUrl}" alt="${text}">
                                            <span>${text}</span>
                                        </div>`);
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
                var searchValue = $('#staff_data_find').val();
                var calender_date = $('#calender_date').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var status = localStorage.getItem('attendanceStatus');
                table.destroy();
                datatable(searchValue, calender_date, number_page_sorting, status);
                if (number_page_sorting === 'all') {
                    table.page.len(-1).draw(); // Show all records
                } else if (number_page_sorting === '10perpage') {
                    table.page.len(10).draw(); // Show 10 records per page
                } else if (number_page_sorting === '50perpage') {
                    table.page.len(50).draw(); // Show 50 records per page
                } else if (number_page_sorting === '100perpage') {
                    table.page.len(100).draw(); // Show 100 records per page
                } else {
                    table.page.len(parseInt(number_page_sorting)).draw(); // Show selected number of records per page
                }
            });
            $('#calender_date').on('change', function () {
                var searchValue = $('#staff_data_find').val();
                var calender_date = $('#calender_date').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var status = localStorage.getItem('attendanceStatus');
                table.destroy();
                datatable(searchValue, calender_date, number_page_sorting, status);
                if (number_page_sorting === 'all') {
                    table.page.len(-1).draw(); // Show all records
                } else if (number_page_sorting === '10perpage') {
                    table.page.len(10).draw(); // Show 10 records per page
                } else if (number_page_sorting === '50perpage') {
                    table.page.len(50).draw(); // Show 50 records per page
                } else if (number_page_sorting === '100perpage') {
                    table.page.len(100).draw(); // Show 100 records per page
                } else {
                    table.page.len(parseInt(number_page_sorting)).draw(); // Show selected number of records per page
                }
            });
            $('.number_page_sorting').change(function () {
                var searchValue = $('#staff_data_find').val();
                var calender_date = $('#calender_date').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var status = localStorage.getItem('attendanceStatus');
                table.destroy();
                datatable(searchValue, calender_date, number_page_sorting, status);
                var staffSelectWidth = $('.staff-option_select').outerWidth();
                if (number_page_sorting == 'all') {
                    $('.attendance-down-data-paginat .select2-dropdown').addClass("pagination_all_data");
                    table.page.len(-1).draw(); // Show all records
                } else if (number_page_sorting === '10perpage') {
                    $('.attendance-down-data-paginat .select2-dropdown').removeClass("pagination_all_data");
                    $('.attendance-down-data-paginat.select2-container--open .select2-dropdown').css('width', staffSelectWidth + 'px');
                    table.page.len(10).draw(); // Show 10 records per page
                } else if (number_page_sorting === '50perpage') {
                    $('.attendance-down-data-paginat .select2-dropdown').removeClass("pagination_all_data");
                    $('.attendance-down-data-paginat.select2-container--open .select2-dropdown').css('width', staffSelectWidth + 'px');
                    table.page.len(50).draw(); // Show 50 records per page
                } else if (number_page_sorting === '100perpage') {
                    $('.attendance-down-data-paginat .select2-dropdown').removeClass("pagination_all_data");
                    $('.attendance-down-data-paginat.select2-container--open .select2-dropdown').css('width', staffSelectWidth + 'px');
                    table.page.len(100).draw(); // Show 100 records per page
                } else {
                    $('.attendance-down-data-paginat .select2-dropdown').removeClass("pagination_all_data");
                    $('.attendance-down-data-paginat.select2-container--open .select2-dropdown').css('width', staffSelectWidth + 'px');
                    table.page.len(parseInt(number_page_sorting)).draw(); // Show selected number of records per page
                }
            })
            var selectedText = $('.status_filter').find('option:selected').text();
            $('.status_filter').siblings('.select2-container').find('.select2-selection__rendered').html('<span class="sort_by_text">Sort by </span>' + selectedText);
            $('.status_filter').change(function () {
                var searchValue = $('#staff_data_find').val();
                var calender_date = $('#calender_date').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var status = $('.status_filter').val();
                localStorage.setItem('attendanceStatus', status);
                var selectedText = $('.status_filter').find('option:selected').text();
                $('.status_filter').siblings('.select2-container').find('.select2-selection__rendered').html('<span class="sort_by_text">Sort by </span>' + selectedText);
                table.destroy();
                datatable(searchValue, calender_date, number_page_sorting, status);
                if (number_page_sorting === 'all') {
                    table.page.len(-1).draw(); // Show all records
                } else if (number_page_sorting === '10perpage') {
                    table.page.len(10).draw(); // Show 10 records per page
                } else if (number_page_sorting === '50perpage') {
                    table.page.len(50).draw(); // Show 50 records per page
                } else if (number_page_sorting === '100perpage') {
                    table.page.len(100).draw(); // Show 100 records per page
                } else {
                    table.page.len(parseInt(number_page_sorting)).draw(); // Show selected number of records per page
                }
                // if (status == 'all' || status == 'sortby') {
                //     window.location.href = "{{ route('attendance') }}"
                // } else {
                //     window.location.href = "{{ route('attendance') }}?status=" + status;
                // }
            })
        });
        function formatOption(option) {
            if (!option.id) {
                return option.text;
            }
            var optionImage = $(option.element).data('image');
            var optionText = option.text;
            var $option = $(
                '<span><img class="option-image" src="' + optionImage + '"/> ' + optionText + '</span>'
            );
            return $option;
        }
        var today = new Date();
        $('.calender-picker').datepicker({
            format: 'dd, M yyyy',
            autoclose: true,
            endDate: today,
        });
        $('#calender_date').on('change', function () {
            var calender_date = $('#calender_date').val();
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                url: "{{ route('attendance_on_date_change') }}",
                type: 'POST',
                data: {
                    calender_date: calender_date,
                },
                success: function (response) {
                    $('#staff_count').html(response.staff_count);
                    $('#present_count').html(response.present_count);
                    $('#absent_count').html(response.absent_count);
                    $('#half_day').html(response.half_day);
                    $('#paid_leave').html(response.paid_leave);
                },
            });
        });
        function fieldValidation() {
            var valid = true;
            $(".error").remove();
            if ($('#note_area').val() == "") {
                $("#note_area").after(
                    '<span class="error error_message proxima_nova_semibold">Please add note.</span>'
                );
                valid = false;
            }
            return valid;
        }
        $('#add_note_form').submit(function (event) {
            event.preventDefault();
            if (fieldValidation()) {
                var formData = new FormData($(this)[0]);
                var calender_date = $('#calender_date').val();
                formData.append('calender_date', calender_date);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('add_note') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        if (response['status'] == 1) {
                            toastr["success"](response.message);
                        } else {
                            toastr["error"](response.message)
                        }
                    }
                });
            }
        });
        var attendance_id;
        function displayNote(id) {
            $('.view-log-model-main').empty();
            var calender_date = $('#calender_date').val();
            attendance_id = id;
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                url: "{{ route('display_note_and_log_data') }}",
                type: "POST",
                data: {
                    "attendance_id": attendance_id,
                    "calender_date": calender_date,
                },
                success: function (response) {
                    if (response['status'] == 1) {
                        var staff_log = response['data'][0]['staff_log'];
                        var i = 0;
                        var hasLog = false;
                        if (staff_log && staff_log.length > 0) {
                            // $.each(staff_log, function (index, logItem) {
                            $.each(response.log_time, function (index, logItem) {
                                if (logItem && logItem.detail !== "Select") {
                                    var detailText = logItem.detail || '';
                                    var lowerDetail = detailText.toLowerCase();
                                    var statusClass = "status-default";
                                    if (lowerDetail.includes("present")) {
                                        statusClass = "status-present";
                                    } else if (lowerDetail.includes("absent")) {
                                        statusClass = "status-absent";
                                    } else if (lowerDetail.includes("half day") || lowerDetail.includes("halfday")) {
                                        statusClass = "status-halfday";
                                    } else if (lowerDetail.includes("leave")) {
                                        statusClass = "status-leave";
                                    }
                                    var userName = staff_log[i].user ? staff_log[i].user.name : 'System';
                                    var logTime = (response['log_time'] && response['log_time'][i]['log_time']) ? response['log_time'][i]['log_time'] : '';
                                    i++;
                                    var logHtml = `
                                        <div class="view-log-item">
                                            <div class="timeline-point ${statusClass}"></div>
                                            <div class="view-log-card ${statusClass}">
                                                <div class="view-log-card-header">

                                                    <h6 class="view-log-status status_log_value">${detailText}</h6>

                                                </div>
                                                <div class="view-log-card-body">
                                                    <p class="status_log_by">
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                            <circle cx="12" cy="7" r="4"></circle>
                                                        </svg>
                                                        <span>By <strong>${userName}</strong> on ${logTime}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                    $('.view-log-model-main').append(logHtml);
                                    hasLog = true;
                                }
                            });
                        }
                        if (!hasLog) {
                            $('.view-log-model-main').html(`
                                <div class="view-log-empty-state">
                                    <div class="empty-icon">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                    </div>
                                    <h4 class="empty-title">No Activity Logs</h4>
                                    <p class="empty-desc">No log history recorded for this date.</p>
                                </div>
                            `);
                        }
                        $('#attendance_id').val(response['data'][0]['id']);
                        $('#note_area').val(response['data'][0]['note']);
                        $('.note_name').html(response['data'][0]['staff_note']['name']+" "+response['data'][0]['staff_note']['last_name']);
                        $('.log_date').html(response['date']);
                    }
                }
            });
        }
        function changeStatus(id, status, calender_date) {
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                url: "{{ route('change_attendance_status') }}",
                type: "POST",
                data: {
                    "id": id,
                    "status": status,
                    "calender_date": calender_date
                },
                success: function (response) {
                    table.ajax.reload(null, false);
                    toastr["success"](response.message);
                    $('#staff_count').html(response.staff_count);
                    $('#present_count').html(response.present_count);
                    $('#absent_count').html(response.absent_count);
                    $('#half_day').html(response.half_day);
                    $('#paid_leave').html(response.paid_leave);
                },
            });
        }
    

/* ---- raw @section(scripts) remainder ---- */

    
    
    
    
    
    
    
    <link rel="stylesheet" href="https://js.api.here.com/v3/3.1/mapsjs-ui.css" />
    
