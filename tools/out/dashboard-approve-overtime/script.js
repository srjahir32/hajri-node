
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

    $('select.select-salary-data').each(function () {

        var dropdown = $('<div />').addClass('select-salary-data selectDropdown');

        $(this).wrap(dropdown);

        var label = $('<span />').text($(this).attr('placeholder')).insertAfter($(this));
        var list = $('<ul />');

        $(this).find('option').each(function () {
            list.append($('<li />').append($('<a />').text($(this).text())));
        });

        list.insertAfter($(this));

        if ($(this).find('option:selected').length) {
            label.text($(this).find('option:selected').text());
            list.find('li:contains(' + $(this).find('option:selected').text() + ')').addClass('active');
            $(this).parent().addClass('filled');
        }

    });

    $(document).on('click touch', '.selectDropdown ul li a', function (e) {
        e.preventDefault();
        var dropdown = $(this).parent().parent().parent();
        var active = $(this).parent().hasClass('active');
        var label = active ? dropdown.find('select').attr('placeholder') : $(this).text();

        dropdown.find('option').prop('selected', false);
        dropdown.find('ul li').removeClass('active');

        dropdown.toggleClass('filled', !active);
        dropdown.children('span').text(label);

        if (!active) {
            dropdown.find('option:contains(' + $(this).text() + ')').prop('selected', true);
            $(this).parent().addClass('active');
        }

        dropdown.removeClass('open');
    });

    $('.select-salary-data > span').on('click touch', function (e) {
        var self = $(this).parent();
        self.toggleClass('open');
    });


/* ---- raw @section(scripts) remainder ---- */




