
    var selectedIds = [];
    var selected = {!! json_encode($checked) !!};
    $(selected).each(function(index, value) {
        selectedIds.push('' + value + '');
    });
    var exceldata = {!! json_encode($data) !!};
    $(document).ready(function () {
        var table = $('#staff_datas').DataTable({
            // "sScrollX": "100%",
            // "sScrollXInner": "200%",
            // "bScrollCollapse": false,
            searching: false,
            lengthChange: false,
            info: false,
            responsive: true,
            bPaginate: false,
            drawCallback: function () {
                $('#selectAllCheckbox').on('change', function () {
                    var isChecked = $(this).prop('checked');
                    $('.selectCheckbox_model').prop('checked', isChecked);
                    var checkedCount = $('.selectCheckbox_model:checked').length;
                    $('.selected_check_member').html(checkedCount);
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
                });
                $('.selectCheckbox_model').change(function () {
                    var id = $(this).val();
                    var checkedCount = $('.selectCheckbox_model:checked').length;
                    $('.selected_check_member').html(checkedCount);
                    if ($(this).is(':checked')) {
                        selectedIds.push(id);
                    } else {
                        const index = selectedIds.indexOf(id);
                        if (index !== -1) {
                            selectedIds.splice(index, 1);
                        }
                    }
                });
            }
        });
    });
    $('.onboard_btn_staff').on('click',function (){
        // console.log(selectedIds);
        if (selectedIds.length === 0) {
            toastr["error"]('Please at least one selected');
        } else {
            $('.onboard_btn_staff').prop('disabled', true);
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                type: 'POST',
                url: "{{ route('excel-add-staff') }}",
                data: {
                    "data":exceldata,
                    "selectedIds":selectedIds
                },
                // processData: false,
                // contentType: false,
                success: function (response) {
                    console.log(response.data);
                    if (response['status'] == 1) {
                        $('.loader').show();
                        toastr["success"](response.message);
                        setTimeout(function () {
                            // window.location.href = '/staff';
                            window.location.href = '/staff-new';
                        }, 3000);
                    }else{
                        toastr["error"](response.message)
                    }
                }
            });
        }

    });


/* ---- raw @section(scripts) remainder ---- */



