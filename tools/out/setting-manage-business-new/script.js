


        $(document).ready(function () {
            $('.select2').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select Country',
                width: '100%'
            });
        });
    

        var c_t = "";

        function timepicker(el, S) {
            // e.preventDefault();

            var div = document.querySelector('.timepicker_wrapper')

            function pad(n) {
                var len = 2 - ('' + n).length;
                return (len > 0 ? new Array(++len).join('0') : '') + n
            }

            if (S == 'a') {
                html = "";
                for (i = 0; i <= 23; i++) {
                    html += '<option value="' + pad(i) + '">' + pad(i) + '</option>'
                }
                document.querySelector('.timepicker_hour').innerHTML = html

                html = "";
                for (i = 0; i <= 59; i++) {
                    html += '<option value="' + pad(i) + '">' + pad(i) + '</option>'
                }
                document.querySelector('.timepicker_minute').innerHTML = html

                c_t = "";
                c_t = el;
                document.querySelector('.timepicker_wrapper').style.display = "block";

            }
            if (S == 'c') {
                document.querySelector('.timepicker_hour').value = "";
                document.querySelector('.timepicker_minute').value = "";
                c_t.value = "";
            }
            if (S == 'x') {
                div.style.display = "block";
            }
            if (S == 's') {
                var hr = document.querySelector('.timepicker_hour').value;
                var min = document.querySelector('.timepicker_minute').value;
                if (hr != "" && min != "") {
                    c_t.value = hr + ":" + min;
                    div.style.display = "none";
                }
            }
        }

        function changeTimepickerheader(el, S) {
            var k = document.querySelectorAll('.timepicker_header b');

            if (S == '1') {
                k[0].innerHTML = el.value;
            }
            if (S == '2') {
                k[1].innerHTML = el.value;
            }
            var mergedValue = Array.from(k).map(function (bElement) {
                return bElement.innerHTML;
            }).join(':');

            var time = mergedValue;
            $('.hours_time').val(time);
            $('#shift_hour').val(time);

        }

        $(document).ready(function () {
            // Show timepicker_wrapper when hours_time or shift_hour is clicked
            $(".hours_time, #shift_hour").on("click", function () {
                $(".timepicker_wrapper").show();
            });

            // Hide timepicker_wrapper when anything other than timepicker_wrapper or input fields is clicked
            $(document).on("click", function (e) {
                var containers = $(".timepicker_wrapper, .hours_time, #shift_hour");
                if (!containers.is(e.target) && containers.has(e.target).length === 0) {
                    $(".timepicker_wrapper").hide();
                }
            });
        });
    


        var category_id = <?= $business_data[0]['category_id'] ? $business_data[0]['category_id'] : '0' ?>;

        function fieldvalidation() {
            var valid = true;
            $(".error").remove();
            var filter = /^[6-9][0-9]{9}$/;
            if ($('#business_address').val() == "") {
                $("#business_address").after(
                    '<span class="error error_message proxima_nova_semibold">Business address field is required</span>'
                );
                valid = false;
            }
            if ($('#business_bank_account').val() == "") {
                $("#business_bank_account").after(
                    '<span class="error error_message proxima_nova_semibold">Business bank account is required</span>'
                );
                valid = false;
            }
            if ($('#business_name').val() == "") {
                $("#business_name").after(
                    '<span class="error error_message proxima_nova_semibold">Business Name field is required</span>'
                );
                valid = false;
            }
            if ($('#street').val() == "") {
                $("#street").after(
                    '<span class="error error_message proxima_nova_semibold">Street field is required</span>'
                );
                valid = false;
            }
            if ($('#city').val() == "") {
                $("#city").after(
                    '<span class="error error_message proxima_nova_semibold">City field is required</span>'
                );
                valid = false;
            }
            if ($('#state').val() == "") {
                $("#state").after(
                    '<span class="error error_message proxima_nova_semibold">State field is required</span>'
                );
                valid = false;
            }
            if ($('#country_id').val() == "") {
                $("#country_id").next('.select2-container').after(
                    '<span class="error error_message proxima_nova_semibold">Country field is required</span>'
                );
                valid = false;
            }
            if ($('#business_salary_cal').val() == "") {
                $("#business_salary_cal").after(
                    '<span class="error error_message proxima_nova_semibold">Salary Structure field is required</span>'
                );
                valid = false;
            }
            if (category_id == 0) {
                $(".select_business_category_error").html(
                    '<span class="error error_message proxima_nova_semibold">Business Category field is required</span>'
                );
                valid = false;
            }
            /*
            if ($('#shift_hour').val() == "") {
                $("#shift_hour").after(
                    '<span class="error error_message proxima_nova_semibold">Work hour field is required</span>'
                );
                valid = false;
            }
            */
            // if (myDropzone.getQueuedFiles().length === 0) {
            //     $(".image-error").html(
            //         '<span class="error error_message proxima_nova_semibold">Business logo is required</span>'
            //     );
            //     valid = false;
            // }
            return valid;
        }

            /*
            $('.add-staff-dropzone').on('click', function () {
                $('#images-dropzone').click();
            })
            let uploadedDocumentMap = {};
            var url = "{{url('')}}";
        Dropzone.autoDiscover = false;
        let myDropzone = new Dropzone("div#images-dropzone", {
            url: '{{ route('uploadBusinessLogo') }}',
            autoProcessQueue: false,
            thumbnailWidth: '50',
            maxFilesize: 2,
            // maxFiles:1,
            thumbnailHeight: '50',
            // uploadMultiple: false,
            addRemoveLinks: true,
            parallelUploads: 10,
            acceptedFiles: 'image/jpeg, image/jpg, image/png',
            dictRemoveFile: `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M2.84154 2.83958C3.07296 2.60816 3.44817 2.60816 3.67959 2.83958L13.1611 12.3211C13.3925 12.5525 13.3925 12.9277 13.1611 13.1591C12.9296 13.3905 12.5544 13.3905 12.323 13.1591L2.84154 3.67763C2.61011 3.44621 2.61011 3.071 2.84154 2.83958Z" fill="#ffffff"/>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M13.1611 2.83958C13.3925 3.071 13.3925 3.44621 13.1611 3.67763L3.67959 13.1591C3.44817 13.3905 3.07296 13.3905 2.84154 13.1591C2.61011 12.9277 2.61011 12.5525 2.84154 12.3211L12.323 2.83958C12.5544 2.60816 12.9296 2.60816 13.1611 2.83958Z" fill="#ffffff"/>
                            </svg>`,
            headers: {
                'X-CSRF-TOKEN': "{{ csrf_token() }}"
            },
            init: function () {
                var myDropzone = this;
                var business_logo = <?php echo json_encode($business_data[0]['business_logo']); ?>;
                // console.log(business_logo);
                var thumbnailUrls = [];
                if (business_logo != '') {
                    $('#edit_business_form').append('<input type="hidden" name="photo" value="' + business_logo + '">');
                    thumbnailUrls.push(url + "/assets/admin/images/business_logo/" + business_logo);
                }
                if (thumbnailUrls) {
                    for (var i = 0; i < thumbnailUrls.length; i++) {
                        var imageUrl = thumbnailUrls[i];
                        $.ajax({
                            url: imageUrl,
                            type: 'HEAD',
                            async: false,
                            success: function (data, status, xhr) {
                                var sizeInBytes = xhr.getResponseHeader('Content-Length');
                                var sizeInKB = Math.round(sizeInBytes / 1024); // Convert to KB
                                var sizeInMB = (sizeInKB / 1024).toFixed(2); // Convert to MB with 2 decimal places
                                var mockFile = {
                                    name: "myimage.jpg",
                                    size: sizeInBytes,
                                    type: 'image/jpeg',
                                    status: Dropzone.ADDED,
                                    url: imageUrl,
                                    sizeInKB: sizeInKB,
                                    sizeInMB: sizeInMB
                                };
                                myDropzone.emit("addedfile", mockFile);
                                myDropzone.emit("thumbnail", mockFile, imageUrl);

                                myDropzone.files.push(mockFile);
                            }
                        });
                    }
                }

                this.on("addedfile", function (file, response) {
                    if (this.files.length > 1) {
                        // If more than one file is added, remove the previous file(s)
                        for (let i = 0; i < this.files.length - 1; i++) {
                            this.removeFile(this.files[i]);
                        }
                    }
                });

                this.on("success", function (data, response) {
                    $('#edit_business_form input[name="photo"]').remove();
                    $('#edit_business_form').append('<input type="hidden" name="photo" value="' + response['photo'] + '">');
                    uploadedDocumentMap[data] = response['photo'];
                    // var formData = new FormData($('#edit_business_form')[0]);
                    manageBusiness()
                });

                this.on("error", function (file, response) {
                    if (file.size > this.options.maxFilesize * 1024 * 1024) {
                        $(".image-error").html(
                            '<span class="error error_message proxima_nova_semibold">File size upload on ' + this.options.maxFilesize + ' MB</span>'
                        );
                    } else {
                        alert('An error occurred while uploading the file.');
                    }
                });
            },
        });
            */


            // Legacy dropdown logic commented out to prevent conflict with new custom dropdown implementation
            /*
            $('select.account_setting_data').each(function () {
                var category = <?= $business_category ?>;
        var i = 0;
        var business_cat = <?= $business_data[0]['category_id'] ? $business_data[0]['category_id'] : '0' ?>;
        // console.log(business_cat);

        var dropdown = $('<div />').addClass('account_setting_data selectDropdown');

        $(this).wrap(dropdown);

        var label = $('<span />').text($(this).attr('placeholder')).insertAfter($(this));
        var list = $('<ul />');

        $(this).find('option').each(function () {
            var optionValue = $(this).val();
            // console.log(optionValue);
            list.append($('<li />').append($('<a class="select_business_category" data-id="' + optionValue + '"/>').text($(this).text())));

            if (optionValue == business_cat) {
                $(this).prop('selected', true); // Set the option as selected
                list.addClass('selected'); // Optionally mark the list item as selected in the UI
            }

        });

        list.insertAfter($(this));

        if ($(this).find('option:selected').length) {
            label.text($(this).find('option:selected').text());
            list.find('li:contains(' + $(this).find('option:selected').text() + ')').addClass('active');
            $(this).parent().addClass('filled');
        }

            });

        // $(document).on('click touch', '.selectDropdown ul li a', function (e) {
        //     e.preventDefault();
        //     var dropdown = $(this).parent().parent().parent();
        //     var active = $(this).parent().hasClass('active');
        //     var label = active ? dropdown.find('select').attr('placeholder') : $(this).text();
        //
        //     dropdown.find('option').prop('selected', false);
        //     dropdown.find('ul li').removeClass('active');
        //
        //     dropdown.toggleClass('filled', !active);
        //     dropdown.children('span').text(label);
        //
        //     if (!active) {
        //         dropdown.find('option:contains(' + $(this).text() + ')').prop('selected', true);
        //         $(this).parent().addClass('active');
        //     }
        //
        //     dropdown.removeClass('open');
        // });

        $('.account_setting_data > span').on('click touch', function (e) {
            var self = $(this).parent();
            self.toggleClass('open');
        });


        $(document).on("click", function (e) {
            var container = $(".account_setting_data");

            // Check if the clicked element is the account_setting_data container or its children
            if (container.is(e.target) || container.has(e.target).length > 0) {
                container.find("ul").show();
            } else {
                container.find("ul").removeClass("open").hide();
            }
        });
            */

        $('select.add_new_business').each(function () {

            var dropdown = $('<div />').addClass('add_new_business selectDropdown');

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

        // $(document).on('click touch', '.selectDropdown ul li a', function (e) {
        //     e.preventDefault();
        //     var dropdown = $(this).parent().parent().parent();
        //     var active = $(this).parent().hasClass('active');
        //     var label = active ? dropdown.find('select').attr('placeholder') : $(this).text();
        //
        //     dropdown.find('option').prop('selected', false);
        //     dropdown.find('ul li').removeClass('active');
        //
        //     dropdown.toggleClass('filled', !active);
        //     dropdown.children('span').text(label);
        //
        //     if (!active) {
        //         dropdown.find('option:contains(' + $(this).text() + ')').prop('selected', true);
        //         $(this).parent().addClass('active');
        //     }
        //
        //     dropdown.removeClass('open');
        // });

        $('.add_new_business > span').on('click touch', function (e) {
            var self = $(this).parent();
            self.toggleClass('open');
        });
        // Close the download-data when clicking outside of it
        $(document).on("click", function (e) {
            if (!$(e.target).closest(".approve-data-download, .download-data").length) {
                $(".download-data").hide();
            }
        });

        /*
        $('.select_business_category').click(function () {
            category_id = $(this).data('id');
        })
        */

        $('#edit_business').click(function () {
            // alert('click');
            // event.preventDefault();
            /*
            if (myDropzone.getQueuedFiles().length == 0) {
                manageBusiness()
            } else {
                myDropzone.processQueue();
            }
            */
            manageBusiness();
            // if (fieldvalidation()) {
            //     myDropzone.processQueue(); // Trigger upload if files are in the queue
            // } else {
            //     myDropzone.options.autoProcessQueue = false; // Prevent auto upload if validation fails
            // }
        });

        function manageBusiness() {
            if (fieldvalidation()) {
                var formData = new FormData($('#edit_business_form')[0]);
                formData.append('select_business_category', category_id);
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('edit_business') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        if (response['status'] == 1) {
                            $('.loader').show();
                            $('#edit_business').prop('disabled', true);
                            toastr["success"](response.message)
                            setTimeout(function () {
                                var redirectUrl = "{{ url('setting-new') }}"
                                window.location.href = redirectUrl;
                            }, 3000);
                        } else {
                            toastr["error"](response.message)
                        }
                    }
                });
            }
        }
    

        $(document).ready(function () {
            // Business Category Dropdown Logic
            var $categoryBtn = $('#category');
            // Ensure we target the specific select for business category. 
            // Since it's right after the button in the HTML structure:
            var $categorySelect = $categoryBtn.next('select');
            var $parent = $categoryBtn.parent(); // This should be the .relative div

            // Build dropdown list container
            var $list = $('<ul class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto hidden custom-dropdown-list" style="margin-top: -8px!important; padding-left: 5px!important;"></ul>');

            // Populate list from select options
            $categorySelect.find('option').each(function () {
                var $opt = $(this);
                var val = $opt.val();
                var text = $opt.text();

                // Create list item with flex layout for text and checkmark
                var $li = $('<li class="text-sm text-gray-700 cursor-pointer select-none relative py-2.5 pl-3 pr-9 transition-colors flex items-center justify-between"></li>');

                // Add text span
                var $textSpan = $('<span class="block truncate"></span>').text(text);
                $li.append($textSpan);

                // Add checkmark icon (hidden by default)
                var $checkmark = $('<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-primary hidden"><svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg></span>');
                $li.append($checkmark);

                $li.data('value', val);
                $li.data('checkmark', $checkmark);

                $list.append($li);
            });

            $parent.append($list);

            // --- Initialization Logic ---
            // category_id is defined in the previous script block via PHP
            if (typeof category_id !== 'undefined' && category_id != '0' && category_id !== '') {
                // If we have a saved category_id, ensure UI matches it
                var $savedOpt = $categorySelect.find('option[value="' + category_id + '"]');
                if ($savedOpt.length > 0) {
                    $categorySelect.val(category_id);
                    $categoryBtn.find('span').first().text($savedOpt.text());
                }
            } else {
                // No saved category (or 0). 
                // If the Select has a default 'selected' option (like Logistics), sync category_id to it.
                // Otherwise default to first option.
                var val = $categorySelect.val(); // This gets the currently selected value (default or HTML selected)
                if (val) {
                    category_id = val;
                    // Update button text just in case HTML text didn't match value
                    var text = $categorySelect.find('option:selected').text();
                    $categoryBtn.find('span').first().text(text);
                }
            }

            // Mark the active item in the list
            $list.find('li').each(function () {
                var $li = $(this);
                var $checkmark = $li.data('checkmark');
                var $textSpan = $li.find('span').first();

                if ($li.data('value') == category_id) {
                    $li.addClass('active-item');
                    $checkmark.removeClass('hidden');
                } else {
                    $li.removeClass('active-item');
                    $checkmark.addClass('hidden');
                }
            });
            // -----------------------------

            // Toggle Dropdown
            $categoryBtn.on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                $('.custom-dropdown-list').not($list).addClass('hidden');
                $list.toggleClass('hidden');
            });

            // Handle Selection
            $list.on('click', 'li', function (e) {
                e.stopPropagation();
                var $li = $(this);
                var val = $li.data('value');
                var text = $li.find('span').first().text();

                // 1. Update Button Text
                $categoryBtn.find('span').first().text(text);

                // 2. Visual Feedback in List - Update all items
                $list.find('li').each(function () {
                    var $item = $(this);
                    var $itemCheckmark = $item.data('checkmark');
                    var $itemText = $item.find('span').first();

                    if ($item.data('value') == val) {
                        $item.addClass('active-item');
                        $itemCheckmark.removeClass('hidden');
                    } else {
                        $item.removeClass('active-item');
                        $itemCheckmark.addClass('hidden');
                    }
                });

                // 3. Close Dropdown
                $list.addClass('hidden');

                // 4. Update Hidden Select
                $categorySelect.val(val).trigger('change');

                // 5. Update Global Variable
                category_id = val;
            });

            // Close on Outside Click
            $(document).on('click', function (e) {
                if (!$parent.is(e.target) && $parent.has(e.target).length === 0) {
                    $list.addClass('hidden');
                }
            });

            // Salary Duration Dropdown Logic
            var $salaryBtn = $('#salaryDuration');
            var $salarySelect = $('#select_salary_duration');
            var $salaryParent = $salaryBtn.parent(); // This should be the .relative div

            // Build dropdown list container
            var $salaryList = $('<ul class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto hidden custom-dropdown-list" style="margin-top: -8px!important; padding-left: 5px!important;"></ul>');

            // Populate list from select options
            $salarySelect.find('option').each(function () {
                var $opt = $(this);
                var val = $opt.val();
                var text = $opt.text();

                // Create list item with flex layout for text and checkmark
                var $li = $('<li class="text-sm text-gray-700 cursor-pointer select-none relative py-2.5 pl-3 pr-9 transition-colors flex items-center justify-between"></li>');

                // Add text span
                var $textSpan = $('<span class="block truncate"></span>').text(text);
                $li.append($textSpan);

                // Add checkmark icon (hidden by default)
                var $checkmark = $('<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-primary hidden"><svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg></span>');
                $li.append($checkmark);

                $li.data('value', val);
                $li.data('checkmark', $checkmark);

                $salaryList.append($li);
            });

            $salaryParent.append($salaryList);

            // Initialize - get current value from select
            var currentSalaryDuration = $salarySelect.val();

            // Mark the active item in the list
            $salaryList.find('li').each(function () {
                var $li = $(this);
                var $checkmark = $li.data('checkmark');
                var $textSpan = $li.find('span').first();

                if ($li.data('value') == currentSalaryDuration) {
                    $li.addClass('active-item');
                    $checkmark.removeClass('hidden');
                } else {
                    $li.removeClass('active-item');
                    $checkmark.addClass('hidden');
                }
            });

            // Toggle Dropdown
            $salaryBtn.on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                $('.custom-dropdown-list').not($salaryList).addClass('hidden');
                $salaryList.toggleClass('hidden');
            });

            // Handle Selection
            $salaryList.on('click', 'li', function (e) {
                e.stopPropagation();
                var $li = $(this);
                var val = $li.data('value');
                var text = $li.find('span').first().text();

                // 1. Update Button Text
                $salaryBtn.find('span').first().text(text);

                // 2. Visual Feedback in List - Update all items
                $salaryList.find('li').each(function () {
                    var $item = $(this);
                    var $itemCheckmark = $item.data('checkmark');
                    var $itemText = $item.find('span').first();

                    if ($item.data('value') == val) {
                        $item.addClass('active-item');
                        $itemCheckmark.removeClass('hidden');
                    } else {
                        $item.removeClass('active-item');
                        $itemCheckmark.addClass('hidden');
                    }
                });

                // 3. Close Dropdown
                $salaryList.addClass('hidden');

                // 4. Update Hidden Select
                $salarySelect.val(val).trigger('change');
            });

            // Close on Outside Click
            $(document).on('click', function (e) {
                if (!$salaryParent.is(e.target) && $salaryParent.has(e.target).length === 0) {
                    $salaryList.addClass('hidden');
                }
            });
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
    
    
    
    
    
