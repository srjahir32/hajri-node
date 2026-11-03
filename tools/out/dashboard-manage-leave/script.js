

        $('.input-group.date').datepicker({
            format: 'dd, M yyyy',
            autoclose: true
        });
        $('.input-group.date').datepicker('setDate', new Date('2023-01-01'));

        //  datatable

        $(document).ready(function () {
            var table = $('#staff_datas').DataTable({
                searching: false,
                lengthChange: false,
                info: false,
                columnDefs: [
                { "width": "10px", "targets": 0 }
            ]
            });

            // muklti checkbox
            $('#selectAllCheckbox').on('change', function () {
                var isChecked = $(this).prop('checked');
                $('.selectCheckbox_model').prop('checked', isChecked);
            });

            // search data
            $('#staff_data_find').on('input', function () {
                var searchValue = $(this).val();
                table.search(searchValue).draw();
            });
            $('.selectCheckbox_model').change(function () {
                var checkedCount = $('.selectCheckbox_model:checked').length;
                $('.selected_check_member').html(checkedCount);
                if (checkedCount > 0) {
                    $('#myModal').show();
                } else {
                    $('#myModal').hide();
                }
            });
            $('#closeModal').click(function () {
                $('#myModal').hide();
            });
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
