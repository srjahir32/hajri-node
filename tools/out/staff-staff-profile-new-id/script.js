

        $(document).ready(function () {
            var startDatepicker = $('.start_date');
            var endDatepicker = $('.end_date');
            var today = new Date();
            var lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            startDatepicker.datepicker({
                format: 'dd M yyyy',
                autoclose: true,
                todayHighlight: false,
                endDate: today
            });

            endDatepicker.datepicker({
                format: 'dd M yyyy',
                autoclose: true,
                todayHighlight: false,
                endDate: today
            });

            // Set initial min/max constraints based on current values
            var initialStartDate = startDatepicker.datepicker('getDate');
            var initialEndDate = endDatepicker.datepicker('getDate');

            if (initialStartDate) {
                endDatepicker.datepicker('setStartDate', initialStartDate);
            }
            if (initialEndDate) {
                startDatepicker.datepicker('setEndDate', initialEndDate);
            }

            startDatepicker.on('changeDate', function (selected) {
                if (selected.date) {
                    endDatepicker.datepicker('setStartDate', selected.date);
                    if (endDatepicker.datepicker('getDate') < selected.date) {
                        endDatepicker.datepicker('setDate', selected.date);
                    }
                }
            });

            endDatepicker.on('changeDate', function (selected) {
                if (selected.date) {
                    startDatepicker.datepicker('setEndDate', selected.date);
                    if (startDatepicker.datepicker('getDate') > selected.date) {
                        startDatepicker.datepicker('setDate', selected.date);
                    }
                }
            });
        });
        // status select box
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
        //  datepicker
        // $('.start_date').datepicker({
        //     format: 'dd M yyyy',
        //     autoclose: true,
        //     // startView: 'months',
        //     // minViewMode: 'months'
        // });
        // $('.end_date').datepicker({
        //     format: 'dd M yyyy',
        //     autoclose: true,
        //     // startView: 'months',
        //     // minViewMode: 'months'
        // });
        $('.input-group.date').datepicker({
            format: 'dd M yyyy',
            autoclose: true,
            // startView: 'months',
            // minViewMode: 'months'
        });
        $('.input-group.date-leave').datepicker({
            format: 'M yyyy',
            autoclose: true,
        });
        $('.input-group.date-leave').datepicker('setDate', new Date('2023-01-01'));

        $('.input-group.over_time.date').datepicker({
            format: 'dd M yyyy',
            autoclose: true,
        });
        // $('.input-group.date').datepicker('setDate', new Date('2023-01-01'));

        $('.allow-date-picker.date').datepicker({
            format: 'dd, M yyyy',
            autoclose: true
        });
        $('.allow-date-picker.date').datepicker('setDate', new Date('2023-04-19'));

        $('.single-picker').datepicker({
            format: 'dd, M yyyy',
            autoclose: true
        });
        $('.single-picker').datepicker('setDate', new Date('2023-04-19'));

        //  datatable
        $(document).ready(function () {
            var table = $('#leaves_data').DataTable({
                searching: false,
                responsive: true,
                lengthChange: false,
                info: false,
                bPaginate: false,
            });
            var table = $('#overtime_data').DataTable({
                searching: false,
                responsive: true,
                lengthChange: false,
                info: false,
                bPaginate: false,
            });
            var table = $('#allowances_data').DataTable({
                searching: false,
                responsive: true,
                lengthChange: false,
                info: false,
                bPaginate: false,
            });
            var table = $('#deduction_data').DataTable({
                searching: false,
                responsive: true,
                lengthChange: false,
                info: false,
                bPaginate: false,
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
            $('.add-overtime-btn').click(function () {
                $('.overtime-add-form').show();
                $('.overtime-tab-list').hide();
            });

            $('.apply-overtime-btn').click(function () {
                $('.overtime-add-form').hide();
                $('.overtime-tab-list').show();
            });
        });
    

        //  datatable
        $(document).ready(function () {
            var table;

            function datatable(start_date = null, end_date = null) {
                if (start_date == null && end_date == null) {
                    var start_date = $('.start_date').val()
                    var end_date = $('.end_date').val()
                }
                table = $('#staff_attendance_data').DataTable({
                    // "lengthMenu": [[5, 10, 20], [5, 10, 20]],
                    searching: false,
                    lengthChange: false,
                    info: false,
                    responsive: true,
                    bPaginate: false,
                    // pagingType: "full_numbers",
                    order: [
                        // [0, "desc"]
                    ],
                    ajax: {
                        "url": "{{ route('staff_attendance_list') }}",
                        "dataType": "json",
                        "type": "POST",
                        "data": {
                            _token: "{{csrf_token()}}",
                            'staff_id': <?=$staff[0]->id?>,
                            'start_date': start_date,
                            'end_date': end_date,
                        }
                    },
                    initComplete: function (settings, json) {
                        var api = this.api();
                        if (table.rows().count() === 0) {
                            // Display image or advertisement
                            var adContent = '<tr><td colspan="7"><div class="no_data_found"><div class=""><img src="{{asset('assets/admin/images/staff_manage/no_data.svg')}}" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, staff profile</div></div></td></tr>';
                            $(api.table().body()).html(adContent);
                        }
                    },
                    columns: [
                        { "data": "date", },
                        { "data": "staff_time" },
                        { "data": "note" },
                        { "data": "status" },

                        { "data": "overtime" },
                        { "data": "fine" },
                        { "data": "action" },
                    ],
                    drawCallback: function () {
                        // $('.mySelect').select2({
                        //     templateResult: formatOption,
                        //     templateSelection: formatOption,
                        //     minimumResultsForSearch: Infinity, //search disable hide
                        // }).on('select2:open', function (e) {
                        //     $('.select2-container').addClass('atten_status_datas');
                        // });
                        initCustomSelect();
                    },
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
            function initCustomSelect() {
                $('.mySelect').not('.original-select').each(function () {
                    const $select = $(this);

                    // Create custom select container
                    const $container = $('<div class="custom-select-container"></div>');
                    const $selected = $('<div class="select-selected"></div>');
                    const $items = $('<div class="select-items"></div>');

                    // Hide original select
                    $select.addClass('original-select');

                    // Add options to custom select
                    $select.find('option').each(function () {
                        const $option = $(this);
                        const imageUrl = $option.data('image');
                        const value = $option.val();
                        const text = $option.text();

                        const $item = $(`
                                                                                        <div class="select-item" data-value="${value}">
                                                                                            <img src="${imageUrl}" alt="${text}">
                                                                                            <span>${text}</span>
                                                                                        </div>
                                                                                    `);

                        // Handle option click
                        $item.on('click', function () {
                            const selectedValue = $(this).data('value');
                            $select.val(selectedValue).trigger('change');

                            // Update selected display
                            const selectedHtml = $(this).html();
                            $selected.html(selectedHtml);

                            $items.hide();
                        });

                        $items.append($item);

                        // Set initial selected value
                        if ($option.is(':selected')) {
                            $selected.html($item.html());
                        }
                    });

                    // Toggle dropdown on click
                    $selected.on('click', function (e) {
                        e.stopPropagation();
                        $('.select-items').not($items).hide();
                        $items.toggle();
                    });

                    // Close all dropdowns when clicking outside
                    $(document).on('click', function () {
                        $('.select-items').hide();
                    });

                    // Insert custom select after the original select
                    $select.after($container);

                    // Move select into container and append custom elements
                    $container.append($select);
                    $container.append($selected);
                    $container.append($items);
                });
            }

            // Move change event listener here using delegation
            $(document).on('change', '.mySelect', function (e) {
                var selectedOption = $(this).find('option:selected');
                var id = selectedOption.data('record-id');
                var status = $(this).val();
                var calender_date = $('#calender_date').val();
                changeStatus(id, status, calender_date);
            });



            $('.start_date, .end_date').on('change', function () {
                table.destroy();

                // var calender_date = $('#attendance_datepicker').val();
                var start_date = $('.start_date').val();
                // console.log(start_date)
                var end_date = $('.end_date').val();
                datatable(start_date, end_date);
            });
            $('#staff_add_note').submit(function (event) {
                event.preventDefault();
                if (fieldValidation()) {
                    var formData = new FormData($(this)[0]);
                    // var calender_date = $('#calender_date').val();
                    // formData.append('calender_date', calender_date);
                    $.ajax({
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        type: 'POST',
                        url: "{{ route('add_staff_note') }}",
                        data: formData,
                        processData: false,
                        contentType: false,
                        success: function (response) {
                            if (response['status'] == 1) {
                                toastr["success"](response.message);
                                $('#create-toggle-right').offcanvas('toggle');
                                table.ajax.reload(null, false);
                            } else {
                                toastr["error"](response.message)
                            }
                        }
                    });
                }
            });
            function changeStatus(id, status, calender_date) {
                // console.log(id);
                var start_date = $('.start_date').val();
                var end_date = $('.end_date').val();
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    url: "{{ route('staff_attendance_change_status') }}",
                    type: "POST",
                    data: {
                        "attendance_id": id,
                        "staff_id": <?=$staff[0]->id?>,
                        "status": status,
                        "start_date": start_date,
                        "end_date": end_date,
                    },
                    success: function (response) {
                        toastr["success"](response.message);
                        $('#staff_count').html(response.staff_count);
                        $('#present_count').html(response.present_count);
                        $('#absent_count').html(response.absent_count);
                        $('#half_day').html(response.halfday_count);
                        $('#paid_leave').html(response.paidleave_count);
                        table.ajax.reload(null, false);
                    },
                });
            }
        });

        function deletePreviewProfile(deleteId) {
            $('#' + deleteId).remove();
            $('#staff_attendance_profile').append('<input type="hidden" name="deletedPreviewProfile[]" value="' + deleteId +
                '">');
        }
        $('#profile').on('change', function (e) {
            // console.log(e);
            var files = e.target.files;
            var imagePreviewContainer = $('#append-preview');
            for (var i = 0; i < files.length; i++) {
                (function (file) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var preview = '<div class="addes-img-sub" id="' + file.name + '"><img src="' + e.target
                            .result + '" alt="" class="added-images">' +
                            '<button type="button" class="decline-images" data-image-name="' + file.name +
                            '"></button>' +
                            '</div>';
                        imagePreviewContainer.append(preview);
                    };
                    reader.readAsDataURL(file);
                })(files[i]);
            }
        });
        $('#append-preview').on('click', '.decline-images', function (e) {
            var removeFile = $(this).data('image-name');
            $(this).parent().remove();
            var newInputElement = $('#profile').clone(true);
            $('#profile').val('');
            var newFiles = [];
            // Loop through the files of the cloned input element
            for (var i = 0; i < newInputElement[0].files.length; i++) {
                if (newInputElement[0].files[i].name !== removeFile) {
                    newFiles.push(newInputElement[0].files[i]);
                }
            }
            // Create a new FileList object and set it to the cloned input element
            var newFileList = new DataTransfer();
            for (var i = 0; i < newFiles.length; i++) {
                newFileList.items.add(newFiles[i]);
            }
            newInputElement[0].files = newFileList.files;
            $('#profile').replaceWith(newInputElement);
        });
        $('#staff_attendance_profile').submit(function (event) {
            event.preventDefault();
            var formData = new FormData($('#staff_attendance_profile')[0]);
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                type: 'POST',
                url: "{{ route('update_staff_profile') }}",
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    // console.log(response);
                    if (response['status'] == 1) {
                        toastr["success"](response.message);
                        // $('#add_staff')[0].reset();
                        setTimeout(function () {
                            location.reload(true)
                        }, 1500);
                    } else {
                        toastr["error"](response.message)
                    }
                }
            });
        });

        function fieldValidation() {
            var valid = true;
            $(".error").remove();
            if ($.trim($('#note_area').val()) == "") {
                $("#note_area").after(
                    '<span class="error error_message proxima_nova_semibold">Please add note.</span>'
                );
                valid = false;
            }
            return valid;
        }
        $('.start_date, .end_date').on('change', function () {
            var start_date = $('.start_date').val();
            var end_date = $('.end_date').val();
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                url: "{{ route('attendance_staff_on_date_change') }}",
                type: 'POST',
                data: {
                    start_date: start_date,
                    end_date: end_date,
                    staff_id: <?=$staff[0]->id?>
                },
                success: function (response) {
                    $('#month_count').html(response.month_count);
                    $('#present_count').html(response.present_count);
                    $('#absent_count').html(response.absent_count);
                    $('#half_day').html(response.halfday_count);
                    $('#paid_leave').html(response.paidleave_count);
                },
            });
        });

        function displayNote(date, staff_id) {
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                url: "{{ route('staff_display_note_data') }}",
                type: "POST",
                data: {
                    "date": date,
                    "staff_id": staff_id,
                },
                success: function (response) {
                    if (response['status'] == 1) {
                        $('#staff_id').val(response['staff_name'][0]['id']);
                        $('.note_name').html(response['staff_name'][0]['name']);
                        $('#attendance_date').val(response['staff_note']['date']);
                        $('#note_area').val(response['staff_note']['note']);
                    }
                }
            });
        }
        var attendance_id;
        function viewLog(id) {
            $('.view-log-model-main').empty();
            var calender_date = $('#attendance_datepicker').val();
            attendance_id = id;
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                url: "{{ route('display_note_and_log_data') }}",
                type: "POST",
                data: {
                    "attendance_id": attendance_id,
                    "calender_date": calender_date,
                },
                success: function (response) {
                    if (response['status'] == 1) {
                        var staff_log = response['data'][0]['staff_log'];
                        var i = 0;
                        $.each(staff_log, function (index, logItem) {
                            if (logItem.detail === "Select" || logItem === null) {
                                $('.view-log-model-main').empty();
                            } else {
                                $('.view-log-model-main').append(
                                    '<ul class="view-log-content"><li class="view-log-status proxima_nova_semibold section_title status_log_value"> Marked ' +
                                    logItem.detail + '</li><p class="status_log_by">By ' + logItem.user
                                        .name + ' on ' + response['log_time'][i++] + '</p></ul>');
                            }

                        });

                        $('#attendance_id').val(response['data'][0]['id']);
                        $('#note_area').val(response['data'][0]['note']);
                        $('.note_name').html(response['data'][0]['staff_note']['name']);
                        $('.log_date').html(response['date']);
                    }
                }
            });

        }
        $('#export_excel').on('click', function (e) {
            e.preventDefault();
            var url = '{{ route('staff_attendance_excel') }}';
            var calender_date = $('#attendance_datepicker').val();
            var start_date = $('.start_date').val();
            var end_date = $('.end_date').val();
            var staffId = {!! json_encode($staff[0]->id) !!}; // Pass PHP variable to JavaScript

            var queryParams = $.param({ staff_id: staffId, calender_date: calender_date, start_date: start_date, end_date: end_date });

            var finalUrl = url + '?' + queryParams;

            window.location.href = finalUrl;
            if (finalUrl) {
                toastr["success"]('Your files is being downloaded');
            } else {
                toastr["error"]('Somthing went wrong.');
            }
        });
        $('.delete_staff_btn').on('click', function (event) {
            event.preventDefault();
            var staff_id = [<?=$staff[0]->id?>];

            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                type: 'POST',
                url: "{{ route('delete_staff') }}",
                data: {
                    selectedIds: staff_id
                },
                success: function (response) {
                    // console.log(response);
                    if (response['status'] == 1) {
                        $('.delete_staff_btn .loader').show();
                        $('.delete_staff_btn').prop('disabled', true);
                        $('.cancel_modal .loader').show();
                        $('.cancel_modal').prop('disabled', true);
                        toastr["success"](response.message);
                        setTimeout(function () {
                            // window.location.href = '/staff';
                            window.location.href = '/staff-new';
                        }, 2000);
                    } else {
                        toastr["error"](response.message)
                    }
                }
            });
        })

        $('.deactivate_staff_btn').on('click', function (event) {
            event.preventDefault();
            var staff_id = '<?=$staff[0]->id?>';

            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                type: 'POST',
                url: "{{ route('deactivate_staff') }}",
                data: {
                    staff_id: staff_id
                },
                success: function (response) {
                    // console.log(response);
                    if (response['status'] == 1) {
                        toastr["success"](response.message);
                        setTimeout(function () {
                            // window.location.href = '/staff';
                            window.location.href = '/staff-new';
                        }, 2000);
                    } else {
                        toastr["error"](response.message)
                    }
                }
            });
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
                        setTimeout(function () {
                            location.reload();
                        }, 1000);
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
                            alert(data.message);
                            window.location.href = "{{ route('subscriptions') }}";
                        }
                    }
                },
                error: function (error) {
                    toastr.error('Something went wrong.');
                }
            });
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
    
