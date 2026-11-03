
        var table;
        $(document).ready(function () {
            function datatable(searchValue = null, number_page_sorting = null) {
                table = $('#staff_datas').DataTable({
                    searching: false,
                    lengthChange: false,
                    info: false,
                    responsive: true,
                    order: [],
                    ajax: {
                        "url": "{{ route('admin_user_list') }}",
                        "dataType": "json",
                        "type": "POST",
                        "data": {
                            _token: "{{csrf_token()}}",
                            'searchValue': searchValue,
                            'number_page_sorting': number_page_sorting,
                        },
                        "dataSrc": "data"
                    },
                    drawCallback: function (settings) {
                        $('.dropdown-toggle').click(function () {
                            $('.dropdown-menu').toggle();
                        });
                    },
                    initComplete: function (settings, json) {
                        var api = this.api();
                        if (table.rows().count() === 0) {
                            var adContent = '<tr><td colspan="4"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, add role</div></div></td></tr>';
                            $(api.table().body()).html(adContent);
                        }
                    },
                    columns: [
                        { "data": "name" },
                        {
                            "data": "email",
                            "render": function (data) {
                                return data ? '<span style="text-transform: none !important;">' + data + '</span>' : '-';
                            }
                        },
                        { "data": "phone_number" },
                        @if(auth()->user()->can('edit_admin_user') || auth()->user()->can('delete_admin_user'))
                                        {
                                data: null,
                                render: function (data, type, row) {
                                    let actions = '';
                                    @if(auth()->user()->can('edit_admin_user'))
                                        actions += `<a class="dropdown-item proxima_nova_semibold" href="{{ url('admin_users/edit_admin_user') }}/${row.id}">Edit</a>`;
                                    @endif
                                    @if(auth()->user()->can('delete_admin_user'))
                                        actions += `<a class="dropdown-item proxima_nova_semibold" href="javascript:void(0);" data-bs-toggle="offcanvas" data-bs-target="#deleteModal" aria-controls="deleteModal" onclick="getDeleteRole(${row.id})">Delete</a>`;
                                    @endif
                                            return `
                                                <div class="btn-group upload-actions float-end">
                                                    <div class="dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                                                            <path d="M9.9 15.7508C9.9 15.9993 9.69853 16.2008 9.45 16.2008C9.20147 16.2008 9 15.9993 9 15.7508C9 15.5023 9.20147 15.3008 9.45 15.3008C9.69853 15.3008 9.9 15.5023 9.9 15.7508" stroke="#050E17" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                                            <path d="M9.9 3.14922C9.9 3.39775 9.69853 3.59922 9.45 3.59922C9.20147 3.59922 9 3.39775 9 3.14922C9 2.90069 9.20147 2.69922 9.45 2.69922C9.69853 2.69922 9.9 2.90069 9.9 3.14922" stroke="#050E17" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                                            <path d="M9.9 9.45C9.9 9.69853 9.69853 9.9 9.45 9.9C9.20147 9.9 9 9.69853 9 9.45C9 9.20147 9.20147 9 9.45 9C9.69853 9 9.9 9.20147 9.9 9.45" stroke="#050E17" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                                        </svg>
                                                    </div>
                                                    <div class="dropdown-menu">
                                                        ${actions}
                                                    </div>
                                                </div>`;
                                }
                            },
                        @endif
                            ],
                    columnDefs: []
                });
                $('.dataTables_length').addClass('bs-select');
            }
            datatable();

            $('#staff_data_find').on('input', function () {
                var searchValue = $('#staff_data_find').val();
                var number_page_sorting = $('.number_page_sorting').val();
                table.destroy();
                datatable(searchValue, number_page_sorting);
            });

            $('.number_page_sorting').change(function () {
                var searchValue = $('#staff_data_find').val();
                var number_page_sorting = $('.number_page_sorting').val();
                table.destroy();
                datatable(searchValue, number_page_sorting);
            });
        });

        var deleteId;
        function getDeleteRole(id) {
            $('.delete_admin_user_btn .loader').hide();
            $('.delete_admin_user_btn').prop('disabled', false);
            $('.cancel_modal .loader').hide();
            $('.cancel_modal').prop('disabled', false);
            deleteId = id;
        }

        function confirmDeleteRole() {
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                url: "{{ route('delete_admin_user') }}",
                type: "POST",
                data: { "delete_id": deleteId },
                success: function (response) {
                    if (response['status'] == 1) {
                        $('.cancel_modal .loader').show();
                        $('.cancel_modal').prop('disabled', true);
                        $('.delete_admin_user_btn .loader').show();
                        $('.delete_admin_user_btn').prop('disabled', true);
                        toastr["success"](response.message);

                        // Use the hide logic from department_new
                        $('#deleteModal').offcanvas('hide');
                        // If that doesn't work, ensure backdrop is removed
                        $('.offcanvas-backdrop').remove();
                        $('body').css('overflow', 'auto');

                        table.ajax.reload(null, false);
                    } else {
                        toastr["error"](response.message)
                    }
                }
            });
        }
    

/* ---- raw @section(scripts) remainder ---- */

    
