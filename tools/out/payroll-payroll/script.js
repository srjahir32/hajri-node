
    $(document).ready(function () {
        $('.mySelect_pagi').select2({
            minimumResultsForSearch: Infinity,
        }).on('select2:open', function (e) {
            $('.select2-container').addClass('attendance-down-data-paginat');
        })  
    });
    var table;
    $(document).ready(function () {
        // function datatable(searchValue = null,number_page_sorting = null) {
            table = $('#payroll_datas').DataTable({
                // "lengthMenu": [[5, 10, 20], [5, 10, 20]],
                searching: false,
                lengthChange: false,
                info: false,
                responsive: true,
                // pagingType: "full_numbers",
                order: [
                    // [1, "desc"]
                ],
                ajax: {
                    "url": "{{ route('payroll-list') }}",
                    "dataType": "json",
                    "type": "POST",
                    "data": {
                        _token: "{{csrf_token()}}",
                        // 'searchValue': searchValue,
                        // 'number_page_sorting':number_page_sorting
                    },
                    "dataSrc": "data"
                },
                columns: [
                    {
                        data: "name",
                        render: function (data, type, row) {
                            var routeUrl = "{{ route('staff-profile', ':id') }}";
                            var url = routeUrl.replace(':id', row.staff_id);
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
                    { "data": "in_time" },
                    { "data": "out_time" },
                    { "data": "break_time" },
                    { "data": "staff_time" },
                    { "data": "overtime" },
                    // {"data": "fine"},
                    { "data": "action" },
                ],
                // createdRow: function (row, data, dataIndex) {
                //     $(row).attr('id', 'storie_col_' + data['id']);
                // },
                columnDefs: [
                    // { "width": "40%", "targets": 3 },
                    // { 'targets': [5, 7], 'orderable': false }
                ]
            });
        // }
        // datatable();
        $('.number_page_sorting').change(function () {
            var searchValue = $('#staff_data_find').val();
            var number_page_sorting = $('.number_page_sorting').val();
            table.destroy();
            datatable(searchValue, number_page_sorting);

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
        $('#staff_data_find').on('input', function () {
            var searchValue = $('#staff_data_find').val();
            var number_page_sorting = $('.number_page_sorting').val();
            table.destroy();
            datatable(searchValue,number_page_sorting);
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
    });


/* ---- raw @section(scripts) remainder ---- */


