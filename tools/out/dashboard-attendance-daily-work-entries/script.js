
        $('.input-group.date').datepicker({
            format: 'dd, M yyyy',
            autoclose: true
        });
        $('.input-group.date').datepicker('setDate', new Date('2023-04-19'));

        $('.single-date-picker.date').datepicker({
            format: 'dd, M yyyy',
            autoclose: true
        });
        $('.single-date-picker.date').datepicker('setDate', new Date('2023-04-19'));

        $('.from-date-picker.date').datepicker({
            format: 'dd, M yyyy',
            autoclose: true
        });
        $('.from-date-picker.date').datepicker('setDate', new Date('2023-09-29'));

        $('.to-date-picker.date').datepicker({
            format: 'dd, M yyyy',
            autoclose: true
        });
        $('.to-date-picker.date').datepicker('setDate', new Date('2023-12-08'));

        //  datatable

        $(document).ready(function () {
            var table = $('#staff_datas').DataTable({
                searching: false,
                lengthChange: false,
                info: false,
                columnDefs: [
                    {
                        className: 'dtr-control',
                        orderable: false,
                        targets: 0,
                    }
                ],
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

            // Handle radio button changes
            $('#dateRangePicker').hide();
            $('input[name="dateType"]').change(function () {
                // console.log(this);
                if (this.value === "Date") {
                    $('#singleDatePicker').show();
                    $('#dateRangePicker').hide();
                } else if (this.value === "Range") {
                    $('#singleDatePicker').hide();
                    $('#dateRangePicker').show();
                }
            });

            // $('#custom-file-upload').on('change', function () {
            //     var files = this.files;
            //     var $uploadWorkImages = $('.upload-work-images');
            //     var $workImages = $('#work-images');

            //     // Clear the existing images in the container
            //     $workImages.empty();

            //     if (files && files.length > 0) {
            //         // Hide the "upload-work-images" container
            //         $uploadWorkImages.hide();

            //         // Show the "#work-images" container
            //         $workImages.show();

            //         for (var i = 0; i < files.length; i++) {
            //             var reader = new FileReader();
            //             (function (index) {
            //                 reader.onload = function (e) {
            //                     var image = $('<img class="uploaded-image">');
            //                     image.attr('src', e.target.result);
            //                     $workImages.append(image);

            //                     // Get and display the name of the uploaded image
            //                     var imageName = $('<p class="uploaded-image-name">');
            //                     imageName.text(files[index].name);
            //                     $workImages.append(imageName);
            //                 };
            //             })(i); // Immediately invoke the function with the current index
            //             reader.readAsDataURL(files[i]);
            //         }
            //     }
            // });




        });


    

/* ---- raw @section(scripts) remainder ---- */

    
