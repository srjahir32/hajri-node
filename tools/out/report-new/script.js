
    //  header notification
    function toggleDropdown() {
        const dropdown = document.querySelector('.dropdown-content');
        dropdown.classList.toggle('active');
    }
    document.addEventListener('click', function (event) {
        const dropdown = document.querySelector('.dropdown-content');
        if (!event.target.closest('.profile-main-notification')) {
            dropdown.classList.remove('active');
        }
    });
    $('.input-group.date').datepicker({
        format: 'dd, M yyyy',
        autoclose: true
    });
    $('.input-group.date').datepicker('setDate', new Date('2023-01-01'));
    //  datatable
    $(document).ready(function () {
        var table = $('#business-setting-department').DataTable({
            searching: false,
            lengthChange: false,
            info: false,
            responsive: true,
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


