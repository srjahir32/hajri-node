






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
            var leaveStatus = localStorage.getItem('leaveStatus');
            if (leaveStatus) {
                $('.status_filter').val(leaveStatus);
                var text = $('.status_filter option:selected').text();
                var wrapper = $('.status_filter').closest('.custom-dropdown');
                wrapper.find('.selected-value').text(text);
                wrapper.find('.dropdown-options li').removeClass('selected');
                wrapper.find('.dropdown-options li[data-value="' + leaveStatus + '"]').addClass('selected');
            } else {
                $('.status_filter').val('all');
            }

            let columns = [
                { data: "leave_type" },
                { data: "shift_type" },
                { data: "is_paid" },
                { data: "start_date" },
                { data: "end_date" },
                { data: "requested_date" },
                { data: "apply_status" }
            ];

            // Only push action column if permission exists
            // if (canApprove || canReject) {
            //     columns.push({ data: "action" });
            // }
            table = $('#staff_datas').DataTable({
                serverSide: true,
                processing: true,
                searching: false,
                lengthChange: false,
                info: false,
                responsive: true,
                order: [],
                ajax: {
                    "url": "{{ route('user_leaves_list') }}",
                    "dataType": "json",
                    "type": "POST",
                    "data": function (d) {
                        d._token = "{{csrf_token()}}";
                        d.searchValue = $('#staff_data_find').val();
                        // d.calender_date = $('#calender_date').val();
                        d.number_page_sorting = $('.number_page_sorting').val();
                        d.status = localStorage.getItem('leaveStatus');
                    },
                    "dataSrc": "data"
                },
                language: {
                    zeroRecords: '<div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, add apply leave</div></div>',
                    emptyTable: '<div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, add apply leave</div></div>'
                },
                columns: columns,
                columnDefs: [
                    // { 'targets': [5], 'orderable': false }
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
                if (number_page_sorting === 'all') len = -1;
                else if (number_page_sorting === '10perpage') len = 10;
                else if (number_page_sorting === '50perpage') len = 50;
                else if (number_page_sorting === '100perpage') len = 100;
                else len = parseInt(number_page_sorting) || 10;

                // Update and Draw
                if (table.page.len() !== len) {
                    table.page.len(len).draw(); // draw() triggers a reload
                } else {
                    table.ajax.reload();
                }
            }


            $('#staff_data_find').on('input', function () {
                updateTable();
            });

            // $('#calender_date').on('change', function () {
            //     updateTable();
            // });

            $('.number_page_sorting').change(function () {
                updateTable();
            });
            var selectedText = $('.status_filter').find('option:selected').text();
            $('.status_filter').closest('.custom-dropdown').find('.selected-value').text(selectedText);

            $('.status_filter').change(function () {
                var status = $(this).val();
                localStorage.setItem('leaveStatus', status);
                var selectedText = $(this).find('option:selected').text();
                $(this).closest('.custom-dropdown').find('.selected-value').text(selectedText);
                updateTable();
            });
        });
    

/* ---- raw @section(scripts) remainder ---- */


    
    
    
    
    
    
    
    <link rel="stylesheet" href="https://js.api.here.com/v3/3.1/mapsjs-ui.css" />
    
