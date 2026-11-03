
    $('.input-group.date').datepicker({
        format: 'dd, M yyyy',
        autoclose: true,
    });
    $('.input-group.date').datepicker('setDate', new Date());
    //  datatable
    var selectedIds = [];
    var unselectedIds = [];
    $(document).ready(function () {
        // $('.mySelect2').select2({
        //     minimumResultsForSearch: Infinity,
        // }).on('select2:open', function (e) {
        //     $('.select2-container').addClass('staff-down-data');
        // });
        var table;
        function datatable(searchValue = null, calender_date = null, number_page_sorting = null) {
            table = $('#staff_datas').DataTable({
                // "lengthMenu": [[5, 10, 20], [5, 10, 20]],
                // lengthMenu: [ [10, 20, 50, -1], [10, 20, 50, "All"] ],
                // dom: '<"float-left"B><"float-right"f>rt<"row"<"col-sm-4"l><"col-sm-4"i><"col-sm-4"p>>',
                searching: false,
                lengthChange: false,
                info: false,
                responsive: true,
                // pagingType: "full_numbers",
                order: [
                    [0, "desc"]
                ],
                drawCallback: function () {
                    $('#selectAllCheckbox').on('change', function () {
                        var isChecked = $(this).prop('checked');
                        $('.selectCheckbox_model').prop('checked', isChecked);
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
                        // console.log('Selected IDs:', selectedIds);
                        // console.log('unSelected IDs:', unselectedIds);
                    });
                },
                ajax: {
                    "url": "{{ route('user_report_list') }}",
                    "dataType": "json",
                    "type": "POST",
                    "data": {
                        _token: "{{csrf_token()}}",
                        'searchValue': searchValue,
                        'calender_date': calender_date,
                        'number_page_sorting': number_page_sorting ,
                    },
                    "dataSrc": "data"
                },
                initComplete: function(settings, json) {
                    var api = this.api();
                    if (table.rows().count() === 0) {
                        // Display image or advertisement
                        var adContent = '<tr><td colspan="7"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/no_reports.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found</div></div></td></tr>';
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
                    { "data": "staff_id" },
                    // {"data": "salary_payment_type"},
                    // {
                    //     data: "salary_payment_type",
                    //     render: function (data, type, row) {
                    //         return `
                    //                 <div class="salary-payment-type">
                    //                     <div class="salary-payment-text section_sub_title">${row.salary_payment_type.charAt(0).toUpperCase()}
                    //                     <div class="tooltip-text">${row.salary_payment_type}</div></div>${row.salary_payment_type}
                    //                 </div>
                    //             `;
                    //     }
                    // },
                    {
                        data: "name",
                        render: function (data, type, row) {
                            // Check if salary_payment_type exists and is a string
                            if (row.salary_payment_type && typeof row.salary_payment_type === 'string') {
                                return `
                                        <div class="salary-payment-type">
                                            <div class="salary-payment-text section_sub_title">
                                                ${row.salary_payment_type.charAt(0).toUpperCase()}
                                                <div class="tooltip-text">${row.salary_payment_type}</div>
                                            </div>${row.salary_payment_type}
                                        </div>
                                    `;
                            } else {
                                return `-`;
                            }
                        }
                    },
                    { "data": "phone_number" },
                ],
                // createdRow: function (row, data, dataIndex) {
                //     $(row).attr('id', 'storie_col_' + data['id']);
                // },
                columnDefs: [
                    { "width": "10px", "targets": 0 }
                ]
            });
            $('.dataTables_length').addClass('bs-select');
        }
        datatable();
        $('#staff_data_find').on('click input', function () {
            $('#selectAllCheckbox').prop('checked', false);
            $('.selectCheckbox_model').prop('checked', false);
            selectedIds = [];
            unselectedIds = [];
        });
        $('#staff_data_find').on('input', function () {
            var searchValue = $('#staff_data_find').val();
            var calender_date = $('#calender_date').val();
            var number_page_sorting = $('.number_page_sorting').val();
            table.destroy();
            datatable(searchValue,calender_date,number_page_sorting);
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
            table.destroy();
            datatable(searchValue,calender_date,number_page_sorting);
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
            table.destroy();
            datatable(searchValue,calender_date,number_page_sorting);
            if (number_page_sorting === 'all') {
                $('.staff-down-data .select2-dropdown').addClass("pagination_all_data");
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
    });
    $('#user_export').on('click', function (e) {
        e.preventDefault();
        var url = '{{ route('user_export') }}';
        var queryParams = $.param({ selectedIds: selectedIds });
        var finalUrl = url + '?' + queryParams;
        window.location.href = finalUrl;
        $('.selectCheckbox_model').prop('checked', false);
        selectedIds = [];
        unselectedIds = [];
        if(finalUrl){
            toastr["success"]('Your files is being downloaded');
        }else {
            toastr["error"]('Something went wrong.');
        }
    });


/* ---- raw @section(scripts) remainder ---- */


