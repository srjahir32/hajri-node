





        // function getCurrentLocation() {
        //        if (!navigator.geolocation) {
        //            alert("Geolocation not supported");
        //            return;
        //        }
        //        navigator.geolocation.getCurrentPosition(
        //            (position) => {
        //                const lat = position.coords.latitude;
        //                const lng = position.coords.longitude;
        //                console.log(lat, lng);
        //            },
        //            (error) => {
        //                alert("Location permission denied");
        //            }
        //        );
        //    }
        //    getCurrentLocation()
        if (<?= Auth::guard('staff')->user()->is_remote ?> == 1) {
            $('#fullscreen-btn').click(function () {
                var mapDiv = $('#mapdiv')[0];
                // Special handling for iOS
                if (navigator.userAgent.match(/(iPod|iPhone|iPad|Macintosh)/)) {
                    if (!$(mapDiv).hasClass('ios-fullscreen')) {
                        // Enter fullscreen
                        $(mapDiv).addClass('ios-fullscreen');
                        $('body').addClass('no-scroll');
                        $(this).html('<i class="fa fa-compress" aria-hidden="true"></i>');
                        // Force layout recalculation for iOS
                        window.scrollTo(0, 0);
                        document.body.style.height = '100%';
                        document.body.style.width = '100%';
                        // Force map resize
                        setTimeout(function () {
                            window.dispatchEvent(new Event('resize'));
                            if (map) {
                                if (map.invalidateSize) map.invalidateSize();
                                if (google && google.maps) google.maps.event.trigger(map, 'resize');
                            }
                        }, 300);
                        // Add close button for iOS
                        if (!$('.ios-fullscreen-close').length) {
                            $('<button>').addClass('ios-fullscreen-close')
                                .html('<i class="fa fa-times"></i>')
                                .appendTo(mapDiv)
                                .click(function (e) {
                                    e.stopPropagation(); // Prevent event bubbling
                                    exitIOSFullscreen();
                                });
                        }
                    } else {
                        // Exit fullscreen
                        exitIOSFullscreen();
                    }
                    return;
                }
                // Function to handle iOS fullscreen exit
                function exitIOSFullscreen() {
                    $(mapDiv).removeClass('ios-fullscreen');
                    $('body').removeClass('no-scroll');
                    $('#fullscreen-btn').html('<i class="fa fa-expand" aria-hidden="true"></i>');
                    $('.ios-fullscreen-close').remove();
                    // Reset body styles
                    document.body.style.height = '';
                    document.body.style.width = '';
                    // Resize map on close
                    setTimeout(function () {
                        window.dispatchEvent(new Event('resize'));
                        if (map) {
                            if (map.invalidateSize) map.invalidateSize();
                            if (google && google.maps) google.maps.event.trigger(map, 'resize');
                        }
                    }, 300);
                }
                // Rest of your code for other devices remains the same
                var isFullscreen = document.fullscreenElement ||
                    document.webkitFullscreenElement ||
                    document.mozFullScreenElement ||
                    document.msFullscreenElement;
                if (!isFullscreen) {
                    if (mapDiv.requestFullscreen) {
                        mapDiv.requestFullscreen();
                    } else if (mapDiv.webkitRequestFullscreen) {
                        mapDiv.webkitRequestFullscreen();
                    } else if (mapDiv.mozRequestFullScreen) {
                        mapDiv.mozRequestFullScreen();
                    } else if (mapDiv.msRequestFullscreen) {
                        mapDiv.msRequestFullscreen();
                    }
                    $(this).html('<i class="fa fa-compress" aria-hidden="true"></i>');
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    }
                    $(this).html('<i class="fa fa-expand" aria-hidden="true"></i>');
                }
            });
            let map; // Declare map globally to reuse it
            let mapObjectsGroup; // Group for all objects to reset easily
            let ui; // Declare UI globally to manage bubbles
            // function mapLocation(id) {
            //     staff_id = id;
            //     getLiveLocation();
            // }
            function getLiveLocation() {
                var staff_id = "<?= $staff_id ?>";
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('staff-live-location') }}",
                    data: {
                        // business_id: business_id,
                        staff_id: staff_id
                    },
                    success: function (response) {
                        showMap(response.data);
                    }
                });
            }
            getLiveLocation();
            function showMap(data) {
                // console.log(data.location);
                const platform = new H.service.Platform({
                    apikey: "{{ env('HERE_MAPS_APIKEY') }}" // Replace with your actual API key
                });
                // Use HARP as the engine type
                const engineType = H.Map.EngineType.HARP;
                // Obtain the default map types using the engineType
                const maptypes = platform.createDefaultLayers({ engineType });
                if (!maptypes || !maptypes.vector || !maptypes.vector.normal) {
                    console.error('Error: Unable to initialize map types with the specified engine type.');
                    return;
                }
                if (!map) {
                    // If map is not initialized, create it
                    map = new H.Map(
                        document.getElementById('mapdiv'),
                        maptypes.vector.normal.map, // Use the vector normal map type
                        {
                            engineType, // Use the specified engine type
                            center: { lat: 21.1702, lng: 72.8311 }, // Default location
                            zoom: 13
                        }
                    );
                    // Add interaction behavior (zoom, pan, etc.)
                    const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
                    // Add UI components
                    ui = H.ui.UI.createDefault(map, maptypes);
                    // Handle window resize
                    window.addEventListener('resize', () => map.getViewPort().resize());
                    // Initialize a group for map objects
                    mapObjectsGroup = new H.map.Group();
                    map.addObject(mapObjectsGroup);
                }
                // Clear any existing objects on the map
                mapObjectsGroup.removeAll();
                if (data != null && data.location && data.location.length > 0) {
                    // Create a LineString for the polyline
                    const lineString = new H.geo.LineString();
                    // Add markers and polyline points
                    // Pre-initialize icons to avoid creating them in the loop
                    const dotIconUrl = '{{ URL::asset('/assets/dot.png') }}';
                    const startIconUrl = 'https://img.icons8.com/ios-filled/50/2db83d/marker.png';
                    const endIconUrl = 'https://img.icons8.com/ios-filled/50/FF0000/marker.png';

                    const normalIcon = new H.map.Icon(dotIconUrl, { size: { w: 20, h: 20 } });
                    const startIcon = new H.map.Icon(startIconUrl, { size: { w: 35, h: 35 } });
                    const endIcon = new H.map.Icon(endIconUrl, { size: { w: 35, h: 35 } });

                    const markers = [];
                    const lastIndex = data.location.length - 1;

                    data.location.forEach((location, index) => {
                        lineString.pushPoint({ lat: location.latitude, lng: location.longitude });
                        let icon = normalIcon;
                        if (index === 0) {
                            icon = startIcon;
                        } else if (index === lastIndex) {
                            icon = endIcon;
                        }
                        const marker = new H.map.Marker(
                            { lat: location.latitude, lng: location.longitude },
                            { icon: icon }
                        );
                        // Add hover events for displaying a bubble
                        // Note: Creating the InfoBubble on demand in the event listener is good for performance
                        marker.addEventListener('pointerenter', () => {
                            const bubble = new H.ui.InfoBubble(
                                { lat: location.latitude, lng: location.longitude },
                                { content: `<div>${data.staff.name} ${data.staff.last_name}<br>Battery: <strong>${location.battery_percentage}%</strong></div>` }
                            );
                            ui.addBubble(bubble);
                        });
                        // Close bubble when mouse leaves the marker
                        marker.addEventListener('pointerleave', () => {
                            ui.getBubbles().forEach(bubble => bubble.close());
                        });

                        markers.push(marker);
                    });

                    // Add all markers to the group in a single batch operation for performance
                    mapObjectsGroup.addObjects(markers);
                    if (data.location.length > 1) {
                        // Create a polyline and add it to the group
                        const polyline = new H.map.Polyline(lineString, {
                            style: { strokeColor: 'black', lineWidth: 2 }
                        });
                        mapObjectsGroup.addObject(polyline);
                        // Adjust the map viewport to fit the polyline
                        map.getViewModel().setLookAtData({
                            bounds: polyline.getBoundingBox(),
                            zoom: 15
                        });
                    } else {
                        // Center the map on the single point
                        const singleLocation = data.location[0];
                        map.getViewModel().setLookAtData({
                            position: { lat: singleLocation.latitude, lng: singleLocation.longitude },
                            zoom: 15
                        });
                    }
                } else {
                    // Reset to the default map center if no location data is provided
                    map.getViewModel().setLookAtData({
                        position: { lat: 21.1702, lng: 72.8311 },
                        zoom: 15
                    });
                }
            }
        }
        function punchInOut() {
            // alert('punchIn');
            $('.btn-punch-in').prop('disabled', true);
            $('.btn-punch-out').prop('disabled', true);
            // Helper to get strictly IPv4
            function getIPv4(callback) {
                $.ajax({
                    url: "https://api4.ipify.org?format=json",
                    dataType: 'json',
                    success: function (data) {
                        callback(data.ip);
                    },
                    error: function () {
                        console.warn("Checking IPv4 failed or not available.");
                        callback(null);
                    }
                });
            }
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    var lat = position.coords.latitude;
                    var long = position.coords.longitude;
                    var accuracy = position.coords.accuracy;
                    // Get Client IP (IPv4)
                    getIPv4(function (ip) {
                        performPunchIn(lat, long, ip, accuracy);
                    });
                }, function (error) {
                    // If location is denied or any other error, prevent punch in/out
                    toastr.error("Location permission is required to punch in and punch out. Please enable location services.", "Error");
                    $('.btn-punch-in').prop('disabled', false);
                    $('.btn-punch-out').prop('disabled', false);
                }, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            } else {
                // No Geo support - Prevent punch in/out
                toastr.error("Geolocation is not supported by your browser. Cannot punch in/out.", "Error");
                $('.btn-punch-in').prop('disabled', false);
                $('.btn-punch-out').prop('disabled', false);
            }
        }

        // function punchInOut() {
        //     $('.btn-punch-in').prop('disabled', true);
        //     $('.btn-punch-out').prop('disabled', true);
        //     // Get IPv4 Address
        //     function getIPv4(callback) {
        //         $.ajax({
        //             url: "https://api4.ipify.org?format=json",
        //             dataType: 'json',
        //             success: function(data) {
        //                 callback(data.ip);
        //             },
        //             error: function() {
        //                 console.warn("Unable to get IPv4.");
        //                 callback(null);
        //             }
        //         });
        //     }
        //     if (!navigator.geolocation) {
        //         toastr.error(
        //             "Geolocation is not supported by your browser.",
        //             "Error"
        //         );
        //         $('.btn-punch-in').prop('disabled', false);
        //         $('.btn-punch-out').prop('disabled', false);
        //         return;
        //     }
        //     toastr.info("Fetching accurate GPS location...");
        //     const watchId = navigator.geolocation.watchPosition(
        //         function(position) {
        //             let lat = position.coords.latitude;
        //             let long = position.coords.longitude;
        //             let accuracy = position.coords.accuracy;
        //             console.log("Latitude:", lat);
        //             console.log("Longitude:", long);
        //             console.log("Accuracy:", accuracy);
        //             // Reject poor accuracy
        //             if (accuracy > 100) {
        //                 console.log("Waiting for better GPS accuracy...");
        //                 return;
        //             }
        //             // Stop watching once good accuracy received
        //             navigator.geolocation.clearWatch(watchId);
        //             getIPv4(function(ip) {
        //                 performPunchIn(
        //                     lat,
        //                     long,
        //                     ip,
        //                     accuracy
        //                 );
        //             });
        //         },
        //         function(error) {
        //             navigator.geolocation.clearWatch(watchId);
        //             let message = "Unable to fetch location.";
        //             switch (error.code) {
        //                 case error.PERMISSION_DENIED:
        //                     message = "Location permission denied. Please allow location access.";
        //                     break;
        //                 case error.POSITION_UNAVAILABLE:
        //                     message = "Location information unavailable. Please enable GPS.";
        //                     break;
        //                 case error.TIMEOUT:
        //                     message = "Location request timed out. Please try again.";
        //                     break;
        //             }
        //             toastr.error(message, "Error");
        //             $('.btn-punch-in').prop('disabled', false);
        //             $('.btn-punch-out').prop('disabled', false);
        //         },
        //         {
        //             enableHighAccuracy: true,
        //             timeout: 30000,
        //             maximumAge: 0
        //         }
        //     );
        // }
        function performPunchIn(latitude, longitude, ip_address, accuracy) {
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('staff-punch-in-punch-out') }}",
                    data: {
                        latitude: latitude,
                        longitude: longitude,
                        chrom_ip_address: ip_address,
                        accuracy: accuracy
                    },
                    success: function (response) {
                        if (response.status == 1) {
                            toastr["success"](response.message);
                            setTimeout(function () {
                                window.location.href = '/employee/dashboard';
                            }, 2000);
                        }
                        if (response.status == 0) {
                            toastr["error"](response.message);
                            $('.btn-punch-in').prop('disabled', false);
                            $('.btn-punch-out').prop('disabled', false);
                        }
                    },
                    error: function (xhr) {
                        toastr["error"]("Something went wrong");
                        $('.btn-punch-in').prop('disabled', false);
                        $('.btn-punch-out').prop('disabled', false);
                    }
                });
            }
        // Dynamic Clock
        function updateClock() {
            var now = new Date();
            var timezone = "{{ $timezone ?? 'UTC' }}";
            if (!timezone) {
                timezone = 'UTC';
            }
            try {
                var formatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                var parts = formatter.formatToParts(now);
                var hours = parts.find(p => p.type === 'hour').value;
                var minutes = parts.find(p => p.type === 'minute').value;
                var ampm = parts.find(p => p.type === 'dayPeriod').value.toUpperCase();

                var timeString = hours + ':' + minutes + ' ' + ampm;
                var el = document.getElementById('dynamic-clock');
                if (el) el.textContent = timeString;

                // Update new dashboard clock
                var liveTime = document.getElementById('live-time');
                var livePeriod = document.getElementById('live-period');
                if (liveTime) liveTime.textContent = hours + ':' + minutes;
                if (livePeriod) livePeriod.textContent = ampm;
            } catch (e) {
                console.error("Clock update error:", e);
                // Fallback to UTC if timezone is invalid
                try {
                    var formatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: 'UTC',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                    var parts = formatter.formatToParts(now);
                    var hours = parts.find(p => p.type === 'hour').value;
                    var minutes = parts.find(p => p.type === 'minute').value;
                    var ampm = parts.find(p => p.type === 'dayPeriod').value.toUpperCase();

                    var liveTime = document.getElementById('live-time');
                    var livePeriod = document.getElementById('live-period');
                    if (liveTime) liveTime.textContent = hours + ':' + minutes;
                    if (livePeriod) livePeriod.textContent = ampm;
                } catch (err) {}
            }
        }
        // Update every second
        setInterval(updateClock, 1000);
        // Run immediately
        setTimeout(updateClock, 100);
        // --- Auto Update Worked & Balance Timer ---
        (function () {
            try {
                // 1. Initial "Stored" Worked Seconds (completed sessions) from PHP
                // $working_hour is "HH:MM" calculated in Controller
                var rawWorked = "{{ $working_hour ?? '00:00' }}";
                var rawWorkedParts = rawWorked.split(':');
                var storedSeconds = ((parseInt(rawWorkedParts[0]) || 0) * 3600) + ((parseInt(rawWorkedParts[1]) || 0) * 60);
                // 2. Scheduled Seconds
                var rawSchedule = "{{ $total_work_hour ?? '00:00' }}";
                var schedParts = rawSchedule.split(':');
                var scheduledSeconds = ((parseInt(schedParts[0]) || 0) * 3600) + ((parseInt(schedParts[1]) || 0) * 60);
                // 3. Active Session Status
                var isActive = false;
                var sessionStartTimestamp = 0; // UNIX timestamp in seconds
                @if($last_attendance && $last_attendance->in_time && $last_attendance->out_time == null)
                    isActive = true;
                    // Fix: Resolve correct UTC Timestamp dynamically using getUtcDateTime
                    sessionStartTimestamp = {{ \App\Helpers\TimezoneHelper::getUtcDateTime($last_attendance->getRawOriginal('in_time'), $last_attendance->date)?->timestamp ?? 0 }};
                @endif
                function updateTimers() {
                    var currentWorkedSeconds = storedSeconds;
                    if (isActive && sessionStartTimestamp > 0) {
                        // JS Date.now() is UTC (ms since Epoch). /1000 to get seconds.
                        var nowSeconds = Math.floor(Date.now() / 1000);
                        var sessionDuration = nowSeconds - sessionStartTimestamp;
                        // Prevent negative duration if client clock is slightly behind
                        if (sessionDuration < 0) {
                            sessionDuration = 0;
                        }
                        currentWorkedSeconds += sessionDuration;
                    }
                    // --- Update Worked Timer ---
                    var wH = Math.floor(currentWorkedSeconds / 3600);
                    var wM = Math.floor((currentWorkedSeconds % 3600) / 60);
                    // Use pad helper
                    var wStr = (wH < 10 ? '0' + wH : wH) + ':' + (wM < 10 ? '0' + wM : wM);
                    var workEl = document.getElementById('today_worked_timer');
                    if (workEl) {
                        workEl.innerText = wStr;
                    }
                    // --- Update Balance Timer ---
                    // Balance = Worked - Scheduled
                    var balanceSeconds = currentWorkedSeconds - scheduledSeconds;
                    var bSign = balanceSeconds < 0 ? '-' : '';
                    var bAbs = Math.abs(balanceSeconds);
                    var bH = Math.floor(bAbs / 3600);
                    var bM = Math.floor((bAbs % 3600) / 60);
                    var bStr = bSign + (bH < 10 ? '0' + bH : bH) + ':' + (bM < 10 ? '0' + bM : bM);
                    var balEl = document.getElementById('today_balance_timer');
                    if (balEl) {
                        balEl.innerText = bStr;
                    }
                }
                if (isActive) {
                    updateTimers();
                    setInterval(updateTimers, 1000);
                } else {
                    // Even if not active, run once to ensure formatting matches
                    updateTimers();
                }
            } catch (e) {
                console.error("Timer Error:", e);
            }
        })();
    

/* ---- raw @section(scripts) remainder ---- */

    
    
    
    
    
    
    <link rel="stylesheet" href="https://js.api.here.com/v3/3.1/mapsjs-ui.css" />
    
