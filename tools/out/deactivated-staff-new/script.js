
    var table;
    var selectedIds = [];
    var select_department = [];
    var selecteddep = [];

    $(document).ready(function () {
        function datatable(searchValue = null, character_page_sorting = null, number_page_sorting = null, select_department = null) {
            if(character_page_sorting == null && number_page_sorting == null){
                var character_page_sorting = $('.character_page_sorting').val();
                var number_page_sorting = $('.number_page_sorting').val();
            }
            table = $('#staff_datas').DataTable({
                searching: false,
                lengthChange: false,
                info: false,
                responsive: true,
                order: [],
                ajax: {
                    "url": "{{ route('all-staff') }}",
                    "dataType": "json",
                    "type": "POST",
                    "data": {
                        _token: "{{csrf_token()}}",
                        'searchValue': searchValue,
                        'character_page_sorting': character_page_sorting,
                        'number_page_sorting': number_page_sorting,
                        'select_department': select_department,
                        'is_deactivate': 1
                    },
                    "dataSrc": "data"
                },
                initComplete: function (settings, json) {
                    var api = this.api();
                    if (table.rows().count() === 0) {
                        var adContent = '<tr><td colspan="7"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="No Data"></div><div class="proxima_nova_semibold section_title">No deactivated staff found</div></div></td></tr>';
                        $(api.table().body()).html(adContent);
                    }
                },
                columns: [
                    {
                        data: 'id',
                        type: 'num',
                        render: function (data, type, row) {
                            return `<input type="checkbox" class="selectCheckbox_model" value="${row.id}">`;
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
                    { "data": "deactivate_date" },
                    {
                        data: null,
                        orderable: false,
                        render: function (data, type, row) {
                            return `<button type="button" class="activate_staff_action_btn" data-staff-id="${row.id}">Activate</button>`;
                        }
                    }
                ],
                columnDefs: [
                    {'targets': [0, 6], 'orderable': false}
                ]
            });
            $('.dataTables_length').addClass('bs-select');
        }

        datatable();

        $('#staff_data_find').on('input', function () {
            var searchValue = $(this).val();
            var character_page_sorting = $('.character_page_sorting').val();
            var number_page_sorting = $('.number_page_sorting').val();
            table.destroy();
            datatable(searchValue, character_page_sorting, number_page_sorting, select_department);
        });

        $('.select_department').on('click', function () {
            var id = $(this).val();
            var count = $('.select_department:checked').length;
            if(count > 0){
                $('.clear_filter').prop('disabled', false);
            } else {
                $('.clear_filter').prop('disabled', true);
            }
            if ($(this).is(':checked')) {
                select_department.push(id);
            } else {
                const index = select_department.indexOf(id);
                if (index !== -1) {
                    select_department.splice(index, 1);
                }
            }
        });

        $('.apply_staff_filter').on('click', function () {
            var searchValue = $('#staff_data_find').val();
            var character_page_sorting = $('.character_page_sorting').val();
            var number_page_sorting = $('.number_page_sorting').val();
            var checkedCount = $('.select_department:checked').length;
            if (checkedCount > 0) {
                selecteddep = select_department;
                $('.select_department_count').html('('+checkedCount+')');
            } else {
                selecteddep = [];
                select_department = [];
                $('.select_department_count').html('');
            }
            table.destroy();
            datatable(searchValue, character_page_sorting, number_page_sorting, select_department);
        });

        $('.clear_filter').on('click', function () {
            $('.select_department').prop('checked', false);
            $('.clear_filter').prop('disabled', true);
        });

        $('.character_page_sorting').change(function () {
            var character_page_sorting = $('.character_page_sorting').val();
            var number_page_sorting = $('.number_page_sorting').val();
            var searchValue = $('#staff_data_find').val();
            table.destroy();
            datatable(searchValue, character_page_sorting, number_page_sorting, select_department);
        });

        $('.number_page_sorting').change(function () {
            var searchValue = $('#staff_data_find').val();
            var character_page_sorting = $('.character_page_sorting').val();
            var number_page_sorting = $('.number_page_sorting').val();
            table.destroy();
            datatable(searchValue, character_page_sorting, number_page_sorting, select_department);
        });

        $(document).on('click', '.activate_staff_action_btn', function (event) {
            event.preventDefault();
            var staffId = $(this).data('staff-id');
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                url: "{{ route('activate_staff') }}",
                type: 'POST',
                data: {
                    staff_id: staffId
                },
                success: function (data) {
                    if (data.status == 1) {
                        toastr.success(data.message);
                        table.ajax.reload(null, false);
                        if (data.deactive_count !== undefined) {
                            $('#deactivated_staff_count').html('(' + data.deactive_count + ')');
                        }
                    } else {
                        if (typeof Swal !== 'undefined') {
                            Swal.fire({
                                title: 'Seat Limit Reached',
                                text: data.message,
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: 'Increase Seats',
                                cancelButtonText: 'Cancel'
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    window.location.href = "{{ route('subscriptions') }}";
                                }
                            });
                        } else {
                            toastr.error(data.message);
                        }
                    }
                },
                error: function() {
                    toastr.error('Something went wrong. Please try again.');
                }
            });
        });
    });


/* ---- raw @section(scripts) remainder ---- */


