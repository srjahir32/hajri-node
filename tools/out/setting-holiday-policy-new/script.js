
        //  datatable
        $(document).ready(function () {
            var table;
            function datatable() {
                table = $('#busines-setting-manager').DataTable({
                    // "lengthMenu": [[5, 10, 20], [5, 10, 20]],
                    searching: false,
                    lengthChange: false,
                    info: false,
                    responsive: true,
                    // pagingType: "full_numbers",
                    bPaginate: false,
                    order: [
                        // [0, "desc"]
                    ],
                    ajax: {
                        "url": "{{ route('holiday_template_list') }}",
                        "dataType": "json",
                        "type": "POST",
                        "data": {_token: "{{csrf_token()}}"}
                    },
                    columns: [
                        { "data": "name",},
                        { "data": "number_of_holiday"},
                        { "data": "apply_to"},
                        { "data": "action"},
                    ],
                    // createdRow: function (row, data, dataIndex) {
                    //     $(row).attr('id', 'storie_col_' + data['id']);
                    // },
                    columnDefs: [
                        // { "width": "40%", "targets": 3 },
                        // {'targets': [1,2], 'orderable': false}
                    ]
                });
                $('.dataTables_length').addClass('bs-select');
            }
            datatable();
        })
    

/* ---- raw @section(scripts) remainder ---- */

    
