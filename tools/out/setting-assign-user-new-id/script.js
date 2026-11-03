

        var table;
        $(document).ready(function () {
            function datatable(searchValue = null) {
                var working_shift_id = <?= $working_shift_id ?>;
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
                    ajax: {
                        "url": "{{ route('all_assign_staff') }}",
                        "dataType": "json",
                        "type": "POST",
                        "data": {_token: "{{csrf_token()}}",working_shift_id:working_shift_id,searchValue:searchValue},
                        "dataSrc": "data"
                    },
                    initComplete: function (settings, json) {
                        var api = this.api();
                        if (table.rows().count() === 0) {
                            // Display image or advertisement
                            var adContent = '<tr><td colspan="7"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, assign staff</div></div></td></tr>';
                            $(api.table().body()).html(adContent);
                        }
                    },
                    columns: [
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
                        {"data": "staff_id"},
                        // { "data": "salary_amount" },
                        {"data": "phone_number"},
                        { "data": "action", "className": "action_btn"},
                    ],
                    // createdRow: function (row, data, dataIndex) {
                    //     $(row).attr('id', 'storie_col_' + data['id']);
                    // },
                    columnDefs: [
                        // {"width": "10px", "targets": 0},
                        { "width": "40%", "targets": 0 },
                        // {'targets': [0], 'orderable': false}
                    ]
                });
            }
            datatable();
            $('.dataTables_length').addClass('bs-select');
            $('#staff_data_find').on('input', function () {
                var searchValue = $(this).val();
                table.destroy();
                datatable(searchValue);
            });
        });
        function removeAssignStaff(id){
            var working_shift_id = <?= $working_shift_id ?>;
            const swalWithBootstrapButtons = Swal.mixin({
                customClass: {
                    confirmButton: "btn btn-success",
                    cancelButton: "btn btn-danger"
                },
                buttonsStyling: false
            });
            swalWithBootstrapButtons.fire({
                title: "Are you sure?",
                text: "Do you want to remove this staff",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, delete it!",
                cancelButtonText: "No, cancel!",
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        type: 'POST',
                        url: "{{ route('remove_staff_shift') }}",
                        data: {
                            staff_id:id,
                            working_shift_id:working_shift_id,
                        },
                        success: function (response) {
                            if (response['status'] == 1) {
                                $('#assign_staff_count').html('('+response.data+')');
                                swalWithBootstrapButtons.fire({
                                    title: "Remove!",
                                    text: "Staff has been removed",
                                    icon: "success"
                                });
                                table.ajax.reload(null, false);
                            } else {
                                toastr["error"](response.message)
                            }
                        }
                    });

                } else if (
                    /* Read more about handling dismissals below */
                    result.dismiss === Swal.DismissReason.cancel
                ) {

                }
            });
        }
    

/* ---- raw @section(scripts) remainder ---- */

    
    
