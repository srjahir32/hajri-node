

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

    $('.input-group.date').datepicker({
        format: 'dd, M yyyy',
        autoclose: true,
    });
    $('.input-group.date').datepicker('setDate', new Date('2023-01-01'));

    //  datatable 

    var table;
    var selectedIds = [];
    var unselectedIds = [];
    $(document).ready(function () {
        // $('.mySelect_pagi').select2({
        //     minimumResultsForSearch: Infinity,
        // }).on('select2:open', function (e) {
        //     $('.select2-container').addClass('staff-down-data');
        // });
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
                        // console.log('Selected IDs:', selectedIds);
                    });

                    $('.selectCheckbox_model').change(function () {
                        var id = $(this).val();
                        var checkedCount = $('.selectCheckbox_model:checked').length;
                        $('.save_count').html(checkedCount);
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
                    "url": "{{ route('holiday_staff_list') }}",
                    "dataType": "json",
                    "type": "POST",
                    "data": { _token: "{{csrf_token()}}", 'searchValue': searchValue, 'id': <?php echo $holiday_template['id']?>}
                },
                columns: [
                    {
                        data: 'id',
                        type: 'num',
                        render: function (data, type, row) {
                            var isChecked = (row.apply_id) ? 'checked' : '';
                            // return `<input type="checkbox" class="selectCheckbox_model" id="selectCheckbox_model" value="${row.id}">`;
                            return `<input type="checkbox" class="selectCheckbox_model" id="selectCheckbox_model" value="${row.id}" ${isChecked}>`;
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
            var number_page_sorting = $('.number_page_sorting').val();
            table.destroy();
            datatable(searchValue, number_page_sorting);
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
            var number_page_sorting = $('.number_page_sorting').val();
            table.destroy();
            datatable(searchValue, number_page_sorting);
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

    })

    $('#apply_staff').on('click', function () {
        var id = <?php echo $holiday_template['id']?>;
        $.ajax({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            type: 'POST',
            url: "{{ route('holiday_to_staff') }}",
            data: {
                'selectedIds': selectedIds,
                'unselectedIds': unselectedIds,
                'id': id
            },
            success: function (response) {
                if (response['status'] == 1) {
                    $('.loader').show();
                    $('#apply_staff').prop('disabled', true);
                    selectedIds = [];
                    unselectedIds = [];
                    toastr["success"](response.message)
                    setTimeout(function () {
                        
                        var redirectUrl = "{{ url('setting/holiday_policy_new') }}"
                        window.location.href = redirectUrl;
                    }, 3000);
                } else {
                    toastr["error"](response.message)
                }
            }
        });
    })




/* ---- raw @section(scripts) remainder ---- */


