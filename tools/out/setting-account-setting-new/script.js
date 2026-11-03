
        let mobiledigit = function (ele) {
            ele.value = ele.value.replace(/[^0-9]/g, '').slice(0, 10);
        }
        function fieldvalidation() {
            var valid = true;
            $(".error").remove();
            var filter = /^[6-9][0-9]{9}$/;
            var emailFilter = /^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            if ($('#phone_number').val() == "") {
                $("#phone_number").after(
                    '<span class="error error_message proxima_nova_semibold">Mobile number field is required</span>'
                );
                valid = false;
            } else if ($('#phone_number').val() != "") {
                if (!filter.test($('#phone_number').val())) {
                    $("#phone_number").after(
                        '<span class="error error_message proxima_nova_semibold">Please enter valid Mobile number</span>'
                    );
                    valid = false;
                }
            }

            if ($('#email').val() == "") {
                $("#email").after(
                    '<span class="error error_message proxima_nova_semibold">Email ID field is required</span>'
                );
                valid = false;
            } else if ($('#email').val() != "") {
                if (!emailFilter.test($('#email').val())) {
                    $("#email").after(
                        '<span class="error error_message proxima_nova_semibold">Please enter valid Email ID</span>'
                    );
                    valid = false;
                }
            }
            return valid;
        }

        var category_id;
        $('.select_business_category').click(function () {
            category_id = $(this).data('id');
        })
    


            // Load Google Maps API using dynamic inline loader for modern importLibrary support
            (g => { var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a) })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)) })({
                key: "AIzaSyBZQ1hcQElY-qKeSgPWiHZtJRcHDmTBxwY",
                v: "weekly"
            });

        $(document).ready(async function () {
            // Import the new Places API library components
            const { AutocompleteSessionToken, AutocompleteSuggestion, Place } = await google.maps.importLibrary("places");
            const { Map } = await google.maps.importLibrary("maps");
            const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

            let sessionToken = new AutocompleteSessionToken();
            var initialLat = parseFloat($('#latitude').val());
            var initialLng = parseFloat($('#longitude').val());

            if (isNaN(initialLat) || isNaN(initialLng)) {
                if (navigator.geolocation) {
                    try {
                        const position = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                                enableHighAccuracy: true,
                                timeout: 5000,
                                maximumAge: 0
                            });
                        });
                        initialLat = position.coords.latitude;
                        initialLng = position.coords.longitude;

                        $('#latitude').val(initialLat);
                        $('#longitude').val(initialLng);
                        $('#map_container').show();
                    } catch (error) {
                        initialLat = 20.5937; // Fallback
                        initialLng = 78.9629;
                    }
                } else {
                    initialLat = 20.5937; // Fallback
                    initialLng = 78.9629;
                }
            } else {
                $('#map_container').show();
            }

            const map = new Map(document.getElementById("map"), {
                center: { lat: initialLat, lng: initialLng },
                zoom: 15,
                mapId: "DEMO_MAP_ID",
                gestureHandling: "greedy"
            });

            let marker = new AdvancedMarkerElement({
                map: map,
                position: { lat: initialLat, lng: initialLng },
                gmpDraggable: false,
                title: "Location"
            });

            let isProgrammaticPan = false;

            // Keep marker in center of map during panning
            map.addListener("center_changed", () => {
                marker.position = map.getCenter();
            });

            // Update Lat/Lng and reverse geocode when map stops moving
            map.addListener("idle", async () => {
                const position = map.getCenter();
                $('#latitude').val(position.lat());
                $('#longitude').val(position.lng());

                if (isProgrammaticPan) {
                    isProgrammaticPan = false;
                    return;
                }

                const { Geocoder } = await google.maps.importLibrary("geocoding");
                const geocoder = new Geocoder();

                geocoder.geocode({ location: position }, (results, status) => {
                    if (status === "OK" && results[0]) {
                        $('#search_location').val(results[0].formatted_address);
                    }
                });
            });

            // Custom Autocomplete Logic using jQuery UI
            $("#search_location").autocomplete({
                source: async function (request, response) {
                    if (!request.term) {
                        response([]);
                        return;
                    }
                    const { AutocompleteSuggestion } = await google.maps.importLibrary("places");
                    try {
                        const requestObj = {
                            input: request.term,
                            sessionToken: sessionToken
                        };
                        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(requestObj);

                        const formattedSuggestions = suggestions.map(suggestion => {
                            return {
                                label: suggestion.placePrediction.text.text,
                                value: suggestion.placePrediction.text.text,
                                placeId: suggestion.placePrediction.placeId
                            };
                        });
                        response(formattedSuggestions);
                    } catch (e) {
                        console.error("Autocomplete error:", e);
                        response([]);
                    }
                },
                minLength: 3,
                select: async function (event, ui) {
                    const placeId = ui.item.placeId;
                    try {
                        const place = new Place({
                            id: placeId,
                            requestedLanguage: "en",
                        });
                        await place.fetchFields({
                            fields: ["location", "displayName", "formattedAddress"],
                        });

                        if (place.location) {
                            const newLat = place.location.lat();
                            const newLng = place.location.lng();

                            $('#latitude').val(newLat);
                            $('#longitude').val(newLng);

                            $('#map_container').show();

                            isProgrammaticPan = true;
                            map.setCenter({ lat: newLat, lng: newLng });
                            marker.position = { lat: newLat, lng: newLng };
                        }
                        sessionToken = new AutocompleteSessionToken();
                    } catch (e) {
                        console.error("Error fetching place details:", e);
                    }
                }
            });
        });
        $('#edit_profile').submit(function (event) {
            event.preventDefault();
            $('.loader').show();
            $('.profile-edit-submit-btn').prop('disabled', true);
            var formData = new FormData($(this)[0]);
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                type: 'POST',
                url: "{{route('edit-profile')}}",
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    if (response['status'] == 1) {
                        toastr["success"](response.message)
                        setTimeout(function () {
                            // window.location.href = '/dashboard';
                            var redirectUrl = "{{ url('setting-new') }}"
                            window.location.href = redirectUrl;
                        }, 3000);
                    } else {
                        toastr["error"](response.message)
                    }
                }
            });
        })
    

/* ---- raw @section(scripts) remainder ---- */

    
    
    <link rel="stylesheet" href="https://code.jquery.com/ui/1.13.2/themes/base/jquery-ui.css">
    

    
