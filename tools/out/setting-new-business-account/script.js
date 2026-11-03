

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

}

$(document).ready(function () {
    // Show timepicker_wrapper when hours_time is clicked
    $(".hours_time").on("click", function () {
        $(".timepicker_wrapper").show();
    });

    // Hide timepicker_wrapper when anything other than timepicker_wrapper or hours_time is clicked
    $(document).on("click", function (e) {
        var containers = $(".timepicker_wrapper, .hours_time");
        if (!containers.is(e.target) && containers.has(e.target).length === 0) {
            $(".timepicker_wrapper").hide();
        }
    });
});
    

        var business_salary_cal;

        function fieldvalidation(){
            var valid = true;
            $(".error").remove();
            var filter = /^[6-9][0-9]{9}$/;
            if ($('#business_address').val() == "") {
                $("#business_address").after(
                    '<span class="error error_message proxima_nova_semibold">Business address field is required</span>'
                );
                valid = false;
            }             
            if ($('#business_bank_detail').val() == "") {
                $("#business_bank_detail").after(
                    '<span class="error error_message proxima_nova_semibold">Business bank account is required</span>'
                );
                valid = false;
            }
            var emailFilter = /^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            if ($('#business_email').val() == "") {
                $("#business_email").after(
                    '<span class="error error_message proxima_nova_semibold">Business Email field is required</span>'
                );
                valid = false;
            } else if (!emailFilter.test($('#business_email').val())) {
                $("#business_email").after(
                    '<span class="error error_message proxima_nova_semibold">Please enter valid Business Email</span>'
                );
                valid = false;
            }
            if ($('#business_name').val() == "") {
                $("#business_name").after(
                    '<span class="error error_message proxima_nova_semibold">Business Name field is required</span>'
                );
                valid = false;
            }
            if (!business_salary_cal) {
                $(".business_salary_cal_error").after(
                    '<span class="error error_message proxima_nova_semibold">Salary Structure field is required</span>'
                );
                valid = false;
            }
            if ($('#shift_hour').val() == "") {
                $("#shift_hour").after(
                    '<span class="error error_message proxima_nova_semibold">Work hour field is required</span>'
                );
                valid = false;
            }
            if (myDropzone.getQueuedFiles().length === 0) {
                $(".image-error").html(
                    '<span class="error error_message proxima_nova_semibold">Business logo is required</span>'
                );
                valid = false;
            }
            return valid;
        }
        $('.add-staff-dropzone').on('click',function (){
            $('#images-dropzone').click();
        }) 
       

        $('select.add_new_business').each(function () {

            var dropdown = $('<div />').addClass('add_new_business selectDropdown');

            $(this).wrap(dropdown);

            var label = $('<span />').text($(this).attr('placeholder')).insertAfter($(this));
            var list = $('<ul />');

            $(this).find('option').each(function () {
                var optionValue = $(this).val();
                // console.log(optionValue);
                list.append($('<li />').append($('<a class="business_salary_cal" data-value="'+optionValue+'"/>').text($(this).text())));
            });

            list.insertAfter($(this));

            if ($(this).find('option:selected').length) {
                label.text($(this).find('option:selected').text());
                list.find('li:contains(' + $(this).find('option:selected').text() + ')').addClass('active');
                $(this).parent().addClass('filled');
            }

        });
        
        $('.business_salary_cal').click(function () {
            business_salary_cal = $(this).data('value');
            // console.log(business_salary_cal);
        })

        $('#add_business_btn').click(function() {
            if (fieldvalidation()) {
                $('.loader').show();
                $('#add_business_btn').prop('disabled', true);
                myDropzone.processQueue();
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

        $('.add_new_business > span').on('click touch', function (e) {
            var self = $(this).parent();
            self.toggleClass('open');
        });
        let uploadedDocumentMap = {};
        var url = "{{url('')}}";
        Dropzone.autoDiscover = false;
        let myDropzone = new Dropzone("div#images-dropzone",{
            url: '{{ route('addBusinessLogo') }}',
            autoProcessQueue: false,
            thumbnailWidth:'50',
            maxFilesize: 2,
            // maxFiles:1,
            thumbnailHeight:'50',
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
                
                this.on("addedfile", function(file, response) {
                    let businessNameInput = document.getElementById('business_name');
                    
                    this.on("sending", function (file, xhr, formData) {
                        let business_name = businessNameInput.value;
                        formData.append('business_name', business_name);
                    });
                    if (this.files.length > 1) {
                        for (let i = 0; i < this.files.length - 1; i++) {
                            this.removeFile(this.files[i]);
                        }
                    }
                });
            },
            success: function(data, response) {
                $('#add_business input[name="photo"]').remove();
                $('#add_business').append('<input type="hidden" name="photo" value="' + response['photo'] + '">');
                uploadedDocumentMap[data] = response['photo'];
                var formData = new FormData($('#add_business')[0]);
                formData.append('business_salary_cal', business_salary_cal);                
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('add_business') }}",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function(response) {
                        if (response['status'] == 1) {
                            toastr["success"](response.message);
                            setTimeout(function () {
                                var redirectUrl = "{{ url('setting') }}"
                                window.location.href = redirectUrl;
                            }, 3000);
                        }else{
                            toastr["error"](response.message)
                        }
                    }
                });
            },
            // removedfile: function (file) {
            //     $(".error").remove();
            //     file.previewElement.remove()
            //     let name = '';
            //     if (typeof file.file_name !== 'undefined') {
            //         name = file.file_name;
            //     } else {
            //         name = uploadedDocumentMap[file.name];
            //     }
            //     $('form').find('input[name="photos[]"][value="' + name + '"]').remove();
            // },
            error: function(file, response) {
                if (file.size > this.options.maxFilesize * 1024 * 1024) {
                    $(".image-error").html(
                        '<span class="error error_message proxima_nova_semibold">File size upload on ' + this.options.maxFilesize + ' MB</span>'
                    );
                } else {
                    alert('An error occurred while uploading the file.');
                }
            }
        });

    

/* ---- raw @section(scripts) remainder ---- */

    
    
    
