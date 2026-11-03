
        $(document).ready(function () {
            $('#mySelect').select2({
                templateResult: formatOption,
                templateSelection: formatOption,
                minimumResultsForSearch: Infinity, //search disable hide
            });
            $('#mySelect2').select2({
                templateResult: formatOption,
                templateSelection: formatOption,
                minimumResultsForSearch: Infinity,
            });
            $('#mySelect3').select2({
                templateResult: formatOption,
                templateSelection: formatOption,
                minimumResultsForSearch: Infinity,
            });
            $('#mySelect4').select2({
                templateResult: formatOption,
                templateSelection: formatOption,
                minimumResultsForSearch: Infinity,
            });
            $('#mySelect5').select2({
                templateResult: formatOption,
                templateSelection: formatOption,
                minimumResultsForSearch: Infinity,
            });
        });

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

        $(document).ready(function () {
            var table = $('#staff_datas').DataTable({
                searching: false,
                lengthChange: false,
                info: false,
                // bPaginate: false,
                responsive: true,
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
                // console.log(table);
            });


            $('.selectCheckbox_model').change(function () {
                if ($(this).is(':checked')) {
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

    
