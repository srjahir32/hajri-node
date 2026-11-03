
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
        function deleteShift(id){
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                type: 'POST',
                url: "{{ route('delete_shift') }}",
                data: {
                    id:id
                },
                success: function (response) {
                    if (response['status'] == 1) {
                        $('.loader').show();
                        toastr["success"](response.message);
                        setTimeout(function () {
                           location.reload();
                        }, 3000);
                    } else {
                        toastr["error"](response.message)
                    }
                }
            });
        }
    

/* ---- raw @section(scripts) remainder ---- */

    
