





        var business_id = $('#business_id').val();
        var staff_id = null;
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        

        //     function showMap(data) {
        //         const platform = new H.service.Platform({
        //             apikey: "{{ env('HERE_MAPS_APIKEY') }}" // Replace with your actual API key
        //         });
        //         const engineType = H.Map.EngineType['HARP'];
        //
        // // Obtain the default map types from the platform object:
        //         const maptypes = platform.createDefaultLayers({
        //             engineType: engineType
        //         });
        //         if (!map) {
        //             // If map is not initialized, create it
        //             // const maptypes = platform.createDefaultLayers();
        //
        //             map = new H.Map(
        //                 document.getElementById('mapdiv'),
        //                 maptypes.vector.normal.map,
        //                 {
        //                     engineType: engineType,
        //                     center: { lat: 21.1702, lng: 72.8311 }, // Default location (can be changed)
        //                     zoom: 13
        //                 }
        //             );
        //             const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
        //             ui = H.ui.UI.createDefault(map, platform.createDefaultLayers());
        //             window.addEventListener('resize', () => map.getViewPort().resize());
        //             // ui.getControl('mapsettings').setVisibility(false);
        //             // Initialize the group for map objects
        //             mapObjectsGroup = new H.map.Group();
        //             map.addObject(mapObjectsGroup);
        //         }
        //         // Clear existing objects from the map
        //         mapObjectsGroup.removeAll();
        //         if (data != null && data.location.length > 0) {
        //             // Define coordinates for the polyline
        //             const lineString = new H.geo.LineString();
        //             // Loop through locations to add markers and polyline
        //             data.location.forEach((location, index) => {
        //                 lineString.pushPoint({ lat: location.latitude, lng: location.longitude });
        //                 let iconUrl = 'https://img.icons8.com/ios-filled/50/0080ff/marker.png'; // Default filled marker
        //                 if (index === 0) {
        //                     iconUrl = 'https://img.icons8.com/ios-filled/50/2db83d/marker.png'; // Green filled for first marker
        //                 } else if (index === data.location.length - 1) {
        //                     iconUrl = 'https://img.icons8.com/ios-filled/50/FF0000/marker.png'; // Red filled for last marker
        //                 }
        //                 const icon = new H.map.Icon(iconUrl, {
        //                     size: { w: 30, h: 30 } // Adjust size as necessary
        //                 });
        //                 // Create a marker with the custom icon
        //                 const marker = new H.map.Marker(
        //                     { lat: location.latitude, lng: location.longitude },
        //                     { icon: icon } // Assign the custom icon to the marker
        //                 );
        //                 // Add hover event to show bubble
        //                 marker.addEventListener('pointerenter', () => {
        //                     map.getElement().style.cursor = 'pointer';
        //                     const bubble = new H.ui.InfoBubble(
        //                         { lat: location.latitude, lng: location.longitude },
        //                         { content: `<div>${data.staff.name} ${data.staff.last_name}<br>Battery: <strong>${location.battery_percentage}%</strong></div>` }
        //                     );
        //                     ui.addBubble(bubble);
        //                 });
        //                 // Remove bubble when mouse leaves the marker
        //                 marker.addEventListener('pointerleave', () => {
        //                     ui.getBubbles().forEach(bubble => bubble.close());
        //                 });
        //                 // Add the marker to the group
        //                 mapObjectsGroup.addObject(marker);
        //             });
        //             if (data.location.length > 1) {
        //                 // Create the polyline and style it
        //                 const polyline = new H.map.Polyline(lineString, {
        //                     style: { strokeColor: 'black', lineWidth: 2 }
        //                 });
        //                 // Add the polyline to the group
        //                 mapObjectsGroup.addObject(polyline);
        //                 // Adjust the viewport to fit the polyline
        //                 map.getViewModel().setLookAtData({
        //                     bounds: polyline.getBoundingBox(),
        //                     zoom: 13 // Maintain zoom level 13
        //                 });
        //             } else {
        //                 // Center the map on the single point
        //                 const singleLocation = data.location[0];
        //                 map.getViewModel().setLookAtData({
        //                     position: { lat: singleLocation.latitude, lng: singleLocation.longitude },
        //                     zoom: 13
        //                 });
        //             }
        //         } else {
        //             // Reset to the default map center
        //             map.getViewModel().setLookAtData({
        //                 position: { lat: 21.1702, lng: 72.8311 },
        //                 zoom: 13
        //             });
        //         }
        //     }
        
        
        
        

        
        

        
        

        
        
        
        

        
        
        
        
        
        
        
        
        
        
        

        
        

        
        

        
        

        
        
        
        

        
        

        
        
        

        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        

        
        
        
        

        
        
        

        
        
        
        
        
        

        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        

        var table;
        var selectedIds = [];
        var select_department = [];
        var selecteddep = [];
        $('.input-group.date').datepicker({
            format: 'dd, M yyyy',
            autoclose: true
        });
        $('.input-group.date').datepicker('setDate', new Date('2023-01-01'));
        $('.cancel_selected_id').click(function () {
            $('#myModal').hide();
            selectedIds = [];
            // console.log(selectedIds);
            $('#selectAllCheckbox').prop('checked', false);
            $('.selectCheckbox_model').prop('checked', false);
        });
        $(document).ready(function () {
            // $('.mySelect2').select2({
            //     // templateResult: formatOption,
            //     // templateSelection: formatOption,
            //     minimumResultsForSearch: Infinity
            // }).on('select2:open', function (e) {
            //     $('.select2-container').addClass('staff-down-data');
            // });
            function datatable(searchValue = null, character_page_sorting = null, number_page_sorting = null, select_department = null) {
                if(character_page_sorting == null && number_page_sorting == null){
                    var character_page_sorting = $('.character_page_sorting').val();
                    var number_page_sorting = $('.number_page_sorting').val();
                }
                table = $('#staff_datas').DataTable({
                    // "lengthMenu": [[5, 10, 20], [5, 10, 20]],
                    // lengthMenu: [[10, 20, 50, -1], [10, 20, 50, "All"]],
                    // dom: '<"float-left"B><"float-right"f>rt<"row"<"col-sm-4"l><"col-sm-4"i><"col-sm-4"p>>',
                    searching: false,
                    lengthChange: false,
                    info: false,
                    responsive: true,
                    // pagingType: "full_numbers",
                    order: [
                        // [0, "desc"]
                    ],
                    drawCallback: function () {
                        $('#selectAllCheckbox').on('change', function () {
                            var isChecked = $(this).prop('checked');
                            $('.selectCheckbox_model').prop('checked', isChecked);
                            var checkedCount = $('.selectCheckbox_model:checked').length;
                            $('.selected_check_member').html(checkedCount);
                            if (checkedCount > 0) {
                                $('#myModal').show();
                            } else {
                                $('#myModal').hide();
                            }
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
                            // console.log('Selected IDs:', selectedIds);
                        });
                        $('.selectCheckbox_model').change(function () {
                            var id = $(this).val();
                            var checkedCount = $('.selectCheckbox_model:checked').length;
                            $('.selected_check_member').html(checkedCount);
                            if (checkedCount > 0) {
                                $('#myModal').show();
                            } else {
                                $('#myModal').hide();
                            }
                            if ($(this).is(':checked')) {
                                selectedIds.push(id);
                            } else {
                                const index = selectedIds.indexOf(id);
                                if (index !== -1) {
                                    selectedIds.splice(index, 1);
                                }
                            }
                        });
                    },
                    ajax: {
                        "url": "{{ route('all-staff') }}",
                        "dataType": "json",
                        "type": "POST",
                        "data": { _token: "{{csrf_token()}}", 'searchValue': searchValue,
                            'character_page_sorting':character_page_sorting,
                            'number_page_sorting': number_page_sorting ,
                            'select_department': select_department,
                        },
                        "dataSrc": "data"
                    },
                    initComplete: function (settings, json) {
                        var api = this.api();
                        if (table.rows().count() === 0) {
                            // Display image or advertisement
                            var adContent = '<tr><td colspan="5"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, add staff</div></div></td></tr>';
                            $(api.table().body()).html(adContent);
                        }
                    },
                    columns: [
                        {
                            data: 'id',
                            type: 'num',
                            render: function (data, type, row) {
                                return `<input type="checkbox" class="selectCheckbox_model" id="selectCheckbox_model" value="${row.id}">`;
                            }
                        },
                        {
                            data: "name",
                            render: function (data, type, row) {
                                var routeUrl = "{{ route('staff-profile-new', ':id') }}";
                                var url = routeUrl.replace(':id', row.id);
                                return `
                                    <a href="${url}" class="staff-edit">
                                        <div class="user-images">
                                            <div><img src="${row.staff_photo}" class="approve-user-img" alt=""></div>
                                            <div>${data}<p class="data-sub-field">${row.department_name}</p></div>
                                        </div>
                                    </a>
                                `;
                            }
                        },
                        { "data": "phone_number" },
                        { "data": "salary_amount" },
                        { "data": "shift_type" },
                        // { "data": "live_location" },
                        // { "data": "action", "className": "action_btn"},
                    ],
                    // createdRow: function (row, data, dataIndex) {
                    //     $(row).attr('id', 'storie_col_' + data['id']);
                    // },
                    columnDefs: [
                        // { "width": "10px", "targets": 0 },
                        // { "width": "40%", "targets": 3 },
                        {'targets': [0], 'orderable': false}
                    ]
                });
                $('.dataTables_length').addClass('bs-select');
            }
            datatable();
            $('#staff_data_find').on('click', function () {
                $('#myModal').hide();
                selectedIds = [];
                $('#selectAllCheckbox').prop('checked', false);
                $('.selectCheckbox_model').prop('checked', false);
            });
            $('#staff_data_find').on('input', function () {
                var searchValue = $(this).val();
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                table.destroy();
                datatable(searchValue,character_page_sorting,number_page_sorting,select_department);
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
            $('.select_department').on('click', function () {
                var id = $(this).val();
                var count = $('.select_department:checked').length;
                if(count > 0){
                    $('.clear_filter').prop('disabled',false);
                } else {
                    $('.clear_filter').prop('disabled',true);
                }
                if ($(this).is(':checked')) {
                    select_department.push(id);
                } else {
                    const index = select_department.indexOf(id);
                    if (index !== -1) {
                        select_department.splice(index, 1);
                    }
                }
                // console.log('Selected IDs:', select_department);
            });
            // $('.filter_icon').on('click', function () {
            //     console.log('Selected IDs:', select_department);
            //     $('.select_department').prop('checked', false);
            //     select_department.forEach(function(id) {
            //         $('.select_department[value="' + id + '"]').prop('checked', true);
            //     });
            // });
            $('.apply_staff_filter').on('click', function () {
                // var department_selected_id = $(this).data('id');
                // $('#department_selected_id').val(department_selected_id);
                var searchValue = $('#staff_data_find').val();
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var checkedCount = $('.select_department:checked').length;
                if (checkedCount > 0) {
                    selecteddep = select_department;
                    // console.log(selecteddep);
                    $('.select_department_count').html('('+checkedCount+')');
                    $('.dropdown.staff_department_dropdown').css('background-color','rgba(47, 140, 255, 0.1)');
                    $('.staff_department_dropdown span').css('color','#2F8CFF');
                    $('.staff_department_dropdown svg path').css('fill','#2F8CFF')
                } else {
                    selecteddep = [];
                    select_department = [];
                    $('.select_department_count').html('');
                    $('.dropdown.staff_department_dropdown').css('background-color','');
                    $('.staff_department_dropdown span').css('color','');
                    $('.staff_department_dropdown svg path').css('fill','')
                }
                table.destroy();
                datatable(searchValue,character_page_sorting,number_page_sorting, select_department);
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

            $('.filter_staff_data').click(function () {
                // selectedIds = [];
                // console.log(selecteddep);
                $('.select_department').each(function() {
                    var id = $(this).val();
                    if (selecteddep.includes(id)) {
                        $(this).prop('checked', true);
                    }
                });
                var count = $('.select_department:checked').length;
                if(count > 0){
                    $('.clear_filter').prop('disabled',false);
                } else {
                    $('.clear_filter').prop('disabled',true);
                }
                // $('#selectAllCheckbox').prop('checked', false);
                // $('.selectCheckbox_model').prop('checked', false);
            });

            $('.clear_filter').on('click', function () {
                $('.select_department').prop('checked', false);
                $('.clear_filter').prop('disabled',true);
                // console.log('Selected IDs:', select_department);
            });
            var character_page_sorting = $('.character_page_sorting').val();
            var selectedText = $('.character_page_sorting').find('option:selected').text();
            $('.character_page_sorting').siblings('.select2-container').find('.select2-selection__rendered').html('<span class="sort_by_text">Sort by </span>' + selectedText);
            $('.character_page_sorting').change(function () {
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                var searchValue = $('#staff_data_find').val();
                var selectedText = $(this).find('option:selected').text();
                if (character_page_sorting !== 'sortby') {
                    $(this).siblings('.select2-container').find('.select2-selection__rendered').html('<span class="sort_by_text">Sort by </span>' + selectedText);
                } else {
                    $(this).siblings('.select2-container').find('.select2-selection__rendered').html('<span class="sort_by_text">Sort by </span>');
                }
                table.destroy();
                datatable(searchValue,character_page_sorting,number_page_sorting,select_department);
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
            })
            $('.number_page_sorting').change(function () {
                var searchValue = $('#staff_data_find').val();
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
                // var selectedText = $(this).find('option:selected').text();
                // if (number_page_sorting !== 'sortby') {
                //     $(this).siblings('.select2-container').find('.select2-selection__rendered').html('<span class="sort_by_text">Sort by </span>' + selectedText);
                // } else {
                //     $(this).siblings('.select2-container').find('.select2-selection__rendered').html('<span class="sort_by_text">Sort by </span>');
                // }
                table.destroy();
                datatable(searchValue,character_page_sorting,number_page_sorting,select_department);
                var staffSelectWidth = $('.staff-option_select').outerWidth();
                if (number_page_sorting === 'all') {
                    $('.staff-down-data .select2-dropdown').addClass("pagination_all_data");
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
            $('.delete_staff_btn').on('click', function (event) {
                event.preventDefault();
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('delete_staff') }}",
                    data: {
                        'selectedIds': selectedIds
                    },
                    success: function (response) {
                        if (response['status'] == 1) {
                            toastr["success"](response.message);
                            $('#myModal').hide();
                            $('#selectAllCheckbox').prop('checked', false);
                            table.ajax.reload(null, false);
                            $('#staff_count').html('('+response.staff_count+')');
                        } else {
                            toastr["error"](response.message)
                        }
                    }
                });
            })
            $('.export_div').on('click', function (e) {
                e.preventDefault();
                var url = '{{ route('staff_info_export') }}';
                var queryParams = $.param({ selectedIds: selectedIds});

                var finalUrl = url + '?' + queryParams;

                window.location.href = finalUrl;
                $('.selectCheckbox_model').prop('checked', false);
                selectedIds = [];
                if(finalUrl){
                    $('#myModal').hide();
                    $('#selectAllCheckbox').prop('checked', false);
                    toastr["success"]('Your files is being downloaded');
                }else {
                    toastr["error"]('Somthing went wrong.');
                }
            });
        })
    

/* ---- raw @section(scripts) remainder ---- */

    
    
    
    
    
    <link rel="stylesheet" href="https://js.api.here.com/v3/3.1/mapsjs-ui.css" />
    
