





        // $('#fullscreen-btn').click(function () {
        //     var mapDiv = $('#mapdiv')[0];
        //     // Special handling for iOS
        //     if (navigator.userAgent.match(/(iPod|iPhone|iPad|Macintosh)/)) {
        //         if (!$(mapDiv).hasClass('ios-fullscreen')) {
        //             // Enter fullscreen
        //             $(mapDiv).addClass('ios-fullscreen');
        //             $('body').addClass('no-scroll');
        //             $(this).html('<i class="fa fa-compress" aria-hidden="true"></i>');
        //             // Force layout recalculation for iOS
        //             window.scrollTo(0, 0);
        //             document.body.style.height = '100%';
        //             document.body.style.width = '100%';
        //             // Force map resize
        //             setTimeout(function () {
        //                 window.dispatchEvent(new Event('resize'));
        //                 if (typeof map !== 'undefined') {
        //                     if (map.invalidateSize) map.invalidateSize();
        //                 }
        //             }, 300);
        //         } else {
        //             // Exit fullscreen
        //             exitIOSFullscreen();
        //         }
        //         return;
        //     }
        //     function exitIOSFullscreen() {
        //         $(mapDiv).removeClass('ios-fullscreen');
        //         $('body').removeClass('no-scroll');
        //         $('#fullscreen-btn').html('<i class="fa fa-expand" aria-hidden="true"></i>');
        //         document.body.style.height = '';
        //         document.body.style.width = '';
        //         setTimeout(function () {
        //             window.dispatchEvent(new Event('resize'));
        //             if (typeof map !== 'undefined') {
        //                 if (map.invalidateSize) map.invalidateSize();
        //             }
        //         }, 300);
        //     }
        //     var isFullscreen = document.fullscreenElement ||
        //         document.webkitFullscreenElement ||
        //         document.mozFullScreenElement ||
        //         document.msFullscreenElement;
        //     if (!isFullscreen) {
        //         if (mapDiv.requestFullscreen) {
        //             mapDiv.requestFullscreen();
        //         } else if (mapDiv.webkitRequestFullscreen) {
        //             mapDiv.webkitRequestFullscreen();
        //         } else if (mapDiv.mozRequestFullScreen) {
        //             mapDiv.mozRequestFullScreen();
        //         } else if (mapDiv.msRequestFullscreen) {
        //             mapDiv.msRequestFullscreen();
        //         }
        //         $(this).html('<i class="fa fa-compress" aria-hidden="true"></i>');
        //     } else {
        //         if (document.exitFullscreen) {
        //             document.exitFullscreen();
        //         } else if (document.webkitExitFullscreen) {
        //             document.webkitExitFullscreen();
        //         } else if (document.mozCancelFullScreen) {
        //             document.mozCancelFullScreen();
        //         } else if (document.msExitFullscreen) {
        //             document.msExitFullscreen();
        //         }
        //         $(this).html('<i class="fa fa-expand" aria-hidden="true"></i>');
        //     }
        // });
        $(document).ready(function () {
            var systemTimezone = "{{ \App\Helpers\TimezoneHelper::getCurrentTimezone() }}";

            function formatTimeInTimezone(rawTime, timezone) {
                if (!rawTime) return "N/A";
                let targetTz = (timezone && String(timezone).trim() !== '') ? String(timezone).trim() : 'UTC';

                let dateObj = null;
                if (rawTime instanceof Date) {
                    dateObj = rawTime;
                } else if (typeof rawTime === 'number') {
                    dateObj = new Date(rawTime);
                } else if (typeof rawTime === 'string') {
                    let str = rawTime.trim();
                    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
                        let filterDate = $('#date_filter').val() || new Date().toISOString().split('T')[0];
                        str = `${filterDate}T${str.length <= 5 ? str + ':00' : str}Z`;
                    } else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(str)) {
                        str = str.replace(' ', 'T') + 'Z';
                    } else if (!str.includes('T') && !str.includes('Z') && !str.includes('+') && str.includes(' ')) {
                        str = str.replace(' ', 'T') + 'Z';
                    }
                    dateObj = new Date(str);
                }

                if (!dateObj || isNaN(dateObj.getTime())) {
                    let match = String(rawTime).match(/(\d{2}):(\d{2})/);
                    if (match) {
                        let h = parseInt(match[1], 10);
                        let m = match[2];
                        let ampm = h >= 12 ? 'PM' : 'AM';
                        h = h % 12 || 12;
                        let hStr = h < 10 ? '0' + h : h;
                        return `${hStr}:${m} ${ampm}`;
                    }
                    return rawTime;
                }

                try {
                    let options = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: targetTz };
                    return new Intl.DateTimeFormat('en-US', options).format(dateObj);
                } catch (e) {
                    return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                }
            }
            // Override global dropdown toggle for this page (avoids double-toggle / clipped menu)
            $('.locations-staff-select .selectDropdown > span').off('click touch').on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var $dd = $(this).closest('.selectDropdown');
                $('.selectDropdown').not($dd).removeClass('open');
                $dd.toggleClass('open');
            });
            var HERE_MAPS_APIKEY = "{{ env('HERE_MAPS_APIKEY') }}";
            const platform = new H.service.Platform({
                apikey: HERE_MAPS_APIKEY,
            });
            const engineType = H.Map.EngineType['HARP'];
            const maptypes = platform.createDefaultLayers({
                engineType: engineType,
                lg: "en",
            });
            const map = new H.Map(
                document.getElementById('mapdiv'),
                maptypes.raster.satellite.map, {
                    engineType: engineType,
                    center: { lat: 21.1702, lng: 72.8311 },
                    zoom: 16,
                }
            );
            const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
            const ui = H.ui.UI.createDefault(map, maptypes);
            window.addEventListener('resize', () => map.getViewPort().resize());
            window.addEventListener('orientationchange', () => {
                setTimeout(() => map.getViewPort().resize(), 300);
            });
            function getLiveLocation() {
                var staff_id = $('#staff_filter').val();
                var selected_date = $('#date_filter').val();
                if (!staff_id) {
                    $('#sidebar_header_container').addClass('hidden');
                    $('#timeline_sidebar').html('<div class="h-full flex flex-col items-center justify-center text-gray-400 space-y-3"><i class="fa fa-info-circle text-3xl"></i><p class="text-sm text-center px-4">Please select a staff member and click Apply to view their timeline.</p></div>');
                    map.removeObjects(map.getObjects());
                    ui.getBubbles().forEach(bubble => bubble.close());
                    if (window.currentRouteGroup) {
                        window.currentRouteGroup = null;
                    }
                    return;
                }
                $('#sidebar_header_container').addClass('hidden');
                $('#timeline_sidebar').html('<div class="h-full flex items-center justify-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>');
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('locations_get_live_location') }}",
                    data: {
                        current_day: selected_date,
                        business_id: "{{ session('business_id') }}",
                        staff_id: staff_id
                    },
                    success: function (response) {
                        // console.log(response.locations);
                        // Clear existing objects
                        map.removeObjects(map.getObjects());
                        ui.getBubbles().forEach(bubble => bubble.close());
                        if (window.currentRouteGroup) {
                            window.currentRouteGroup = null;
                        }
                        $('#timeline_sidebar').html('<div class="h-full flex flex-col items-center justify-center text-gray-400 space-y-3"><i class="fa fa-map-signs text-3xl"></i><p class="text-sm text-center px-4">Select a staff member and tap their marker to view timeline.</p></div>');
                        if (response && response.locations && response.locations.length > 0) {
                            showMapMarkers(response.locations, map, ui);
                            if (staff_id && response.locations.length === 1 && response.locations[0].all_locations) {
                                if (response.locations[0].all_locations.length > 1) {
                                    showTimeline(response.locations[0].all_locations, map, ui, response.locations[0]);
                                }
                                renderTimelineSidebar(response.locations[0].all_locations, response.locations[0]);
                            }
                        } else {
                            $('#timeline_sidebar').html('<div class="h-full flex flex-col items-center justify-center text-gray-400 space-y-3"><i class="fa fa-info-circle text-3xl"></i><p class="text-sm text-center px-4">No locations found for selected criteria.</p></div>');
                        }
                    },
                    error: function () {
                        console.error("Failed to fetch live locations");
                        $('#timeline_sidebar').html('<div class="h-full flex flex-col items-center justify-center text-red-400 space-y-3"><i class="fa fa-exclamation-triangle text-3xl"></i><p class="text-sm text-center px-4">Error fetching locations.</p></div>');
                    }
                });
            }
            $('#apply_filter').click(function () {
                getLiveLocation();
            });
            $('#prev_day').click(function () {
                var dateInput = $('#date_filter')[0];
                if (!dateInput.value) return;
                var parts = dateInput.value.split('-');
                var d = new Date(parts[0], parts[1] - 1, parts[2]);
                d.setDate(d.getDate() - 1);
                var year = d.getFullYear();
                var month = String(d.getMonth() + 1).padStart(2, '0');
                var day = String(d.getDate()).padStart(2, '0');
                dateInput.value = year + '-' + month + '-' + day;
                getLiveLocation();
            });
            $('#next_day').click(function () {
                var dateInput = $('#date_filter')[0];
                if (!dateInput.value) return;
                var maxDate = dateInput.getAttribute('max') || new Date().toISOString().split('T')[0];
                var parts = dateInput.value.split('-');
                var d = new Date(parts[0], parts[1] - 1, parts[2]);
                d.setDate(d.getDate() + 1);
                var year = d.getFullYear();
                var month = String(d.getMonth() + 1).padStart(2, '0');
                var day = String(d.getDate()).padStart(2, '0');
                var nextDateStr = year + '-' + month + '-' + day;
                if (nextDateStr > maxDate) {
                    return;
                }
                dateInput.value = nextDateStr;
                getLiveLocation();
            });
            $('#date_filter').on('change input', function () {
                var maxDate = this.getAttribute('max') || new Date().toISOString().split('T')[0];
                if (this.value && this.value > maxDate) {
                    this.value = maxDate;
                }
            });
            function renderTimelineSidebar(allLocations, locationData) {
                if (!locationData) {
                    $('#sidebar_header_container').addClass('hidden');
                    $('#timeline_sidebar').html('<div class="h-full flex flex-col items-center justify-center text-gray-400 space-y-3"><i class="fa fa-info-circle text-3xl"></i><p class="text-sm text-center px-4">No timeline data available.</p></div>');
                    return;
                }
                let staffName = locationData.last_location.staff_name || 'Staff';
                let dateVal = $('#date_filter').val();
                let attendances = locationData.attendances || [];
                const formatDuration = (timeStr) => {
                    if (!timeStr) return '--:--';
                    const parts = timeStr.split(':');
                    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
                    return timeStr;
                };
                const formatTimeAMPM = (timeStr) => {
                    if (!timeStr) return '--:--';
                    const parts = timeStr.split(':');
                    if (parts.length >= 2) {
                        let h = parseInt(parts[0], 10);
                        let m = parts[1];
                        let ampm = h >= 12 ? 'PM' : 'AM';
                        h = h % 12;
                        h = h ? h : 12; // '0' should be '12'
                        let hStr = h < 10 ? '0' + h : h;
                        return `${hStr}:${m} ${ampm}`;
                    }
                    return timeStr;
                };
                let totalHours = '--:--';
                let breakTime = '--:--';
                let overTime = '--:--';
                let punchesHtml = '';
                if (attendances.length > 0) {
                    // Get totals from the last attendance record (or the first depending on how backend aggregates)
                    let lastAtt = attendances[attendances.length - 1];
                    let firstAtt = attendances[0];
                    // console.log(locationData.total_time);
                    // totalHours = formatDuration(lastAtt.working_hours) !== '--:--' ? formatDuration(lastAtt.working_hours) : (lastAtt.total_time ? formatDuration(lastAtt.total_time) : '--:--');
                    totalHours = formatDuration(locationData.total_time) !== '--:--' ? formatDuration(locationData.total_time) : (locationData.total_time ? formatDuration(locationData.total_time) : '--:--');
                    breakTime = formatDuration(lastAtt.break_time);
                    overTime = formatDuration(lastAtt.overtime);
                    attendances.forEach((att) => {
                        punchesHtml += `<div class="flex justify-between items-center pb-2 border-b border-gray-100 last:border-0 last:pb-0">
                                            <div class="flex items-center gap-2">
                                                <div class="w-7 h-7 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><i class="fa fa-sign-in"></i></div>
                                                <div>
                                                    <p class="text-gray-400 text-[10px] uppercase font-bold mb-1">Punch In</p>
                                                    <p class="font-bold text-gray-800 text-sm mb-0">${formatTimeAMPM(att.in_time)}</p>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-2 text-right">
                                                <div class="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center"><i class="fa fa-sign-out"></i></div>
                                                <div>
                                                    <p class="text-gray-400 text-[10px] uppercase font-bold mb-1">Punch Out</p>
                                                    <p class="font-bold text-gray-800 text-sm mb-0">${formatTimeAMPM(att.out_time)}</p>
                                                </div>
                                            </div>
                                        </div>`;
                    });
                } else {
                    punchesHtml = `<div class="flex justify-between items-center">
                                        <div class="flex items-center gap-2">
                                            <div class="w-7 h-7 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><i class="fa fa-sign-in"></i></div>
                                            <div>
                                                <p class="text-gray-400 text-[10px] uppercase font-bold mb-1">Punch In</p>
                                                <p class="font-bold text-gray-800 text-sm mb-0">--:--</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2 text-right">
                                            <div class="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center"><i class="fa fa-sign-out"></i></div>
                                            <div>
                                                <p class="text-gray-400 text-[10px] uppercase font-bold mb-1">Punch Out</p>
                                                <p class="font-bold text-gray-800 text-sm mb-0">--:--</p>
                                            </div>
                                        </div>
                                    </div>`;
                }

                let headerHtml = `<div class="flex items-center gap-3 mb-4">
                                    <img src="${locationData.last_location.staff_image}" class="w-12 h-12 rounded-full border border-gray-300 shadow-sm object-cover">
                                    <div>
                                        <h3 class="font-bold text-gray-800 text-sm mb-0">${staffName}</h3>
                                        <p class="text-[11px] text-gray-500 font-medium mt-0.5 mb-0"><i class="fa fa-calendar mr-1"></i> ${dateVal}</p>
                                    </div>
                                </div>
                                <div class="bg-white border rounded-lg shadow-sm p-3 space-y-3 text-xs max-h-48 overflow-y-auto custom-scrollbar " style="max-height: 80%;
    overflow-x: auto;">
                                    <div class="space-y-2 border-gray-100 pb-2">
                                        ${punchesHtml}
                                    </div>
                                    <div class="flex justify-between text-center pt-1">
                                        <div class="flex-1 border-r border-gray-100">
                                            <p class="text-gray-400 text-[10px] uppercase font-bold mb-1">Total</p>
                                            <p class="font-bold text-gray-700 mb-0">${totalHours}</p>
                                        </div>
                                        <div class="flex-1 border-r border-gray-100">
                                            <p class="text-gray-400 text-[10px] uppercase font-bold mb-1">Break</p>
                                            <p class="font-bold text-gray-700 mb-0">${breakTime}</p>
                                        </div>
                                        <div class="flex-1">
                                            <p class="text-gray-400 text-[10px] uppercase font-bold mb-1">Overtime</p>
                                            <p class="font-bold text-gray-700 mb-0">${overTime}</p>
                                        </div>
                                    </div>
                                </div> `;
                $('#sidebar_header_container').html(headerHtml).removeClass('hidden');
                if (!allLocations || allLocations.length === 0) {
                    $('#timeline_sidebar').html('<div class="h-full flex flex-col items-center justify-center text-gray-400 space-y-3"><i class="fa fa-info-circle text-3xl"></i><p class="text-sm text-center px-4">No locations found for this date.</p></div>');
                    return;
                }
                let html = `<div class="px-1 pt-2">
                                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1 border-b border-gray-100 pb-2 mb-2"><i class="fa fa-map-marker mr-1"></i> Location Timeline</h4>
                            </div>
                            <div class="pt-0 locations-timeline-list custom-scrollbar" style="min-height: 200px;max-height: 90%;overflow: auto;">`;
                allLocations.forEach((loc, idx) => {
                    // console.log(loc.formatted_time)
                    // let rawTimeVal = loc.timestamp || (loc.date && loc.time ? `${loc.date} ${loc.time}` : loc.time) || loc.created_at || loc.date;
                    // let timeStr = formatTimeInTimezone(rawTimeVal, systemTimezone);
                    // let minStr = "";
                    let timeStr = loc.formatted_time || "";
                    let minStr = "";

                    let batteryColor = 'text-green-600';
                    let batteryIcon = 'fa-battery-full';
                    if (loc.battery_percentage) {
                        let bat = parseInt(loc.battery_percentage);
                        if (bat <= 20) { batteryColor = 'text-red-600'; batteryIcon = 'fa-battery-empty'; }
                        else if (bat <= 50) { batteryColor = 'text-yellow-600'; batteryIcon = 'fa-battery-half'; }
                    }
                    let batteryHtml = loc.battery_percentage ? `<div class="${batteryColor} text-xs font-bold flex items-center gap-1 shrink-0"><i class="fa ${batteryIcon}"></i> ${loc.battery_percentage}%</div>` : '';
                    let markerNum = idx + 1;
                    html += `<div class="flex items-start mb-0 relative">
                                <div class="w-20 shrink-0 flex flex-col items-end pr-2 pt-2">
                                    <span class="text-xs font-bold text-gray-800 whitespace-nowrap">${timeStr}</span>
                                    <span class="text-[10px] text-gray-400 mt-0.5">${minStr}</span>
                                </div>
                                <div class="relative flex flex-col items-center shrink-0">
                                    ${idx !== allLocations.length - 1 ? '<div class="absolute top-6 bottom-[-32px] w-0.5 bg-gray-200"></div>' : ''}
                                    <div class="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold z-10 shadow-sm border-2 border-white mt-1" style="font-size: 10px!important;">
                                        ${markerNum}
                                    </div>
                                </div>
                                
                                <div class="flex-1 min-w-0 pl-3 pb-2">
                                    <div class="border border-gray-200 rounded-lg shadow-sm p-3 mb-2 bg-white w-full">
                                        <div class="flex justify-between items-center mb-1 gap-2">
                                            <h4 class="text-sm font-bold text-gray-800 mb-0 truncate">Location Point</h4>
                                            ${batteryHtml}
                                        </div>
                                        <p class="text-xs text-gray-500 mt-1 leading-tight mb-0" style="word-break: break-all;">
                                            Lat: ${parseFloat(loc.latitude)}<br>
                                            Lng: ${parseFloat(loc.longitude)}
                                            ${loc.accuracy ? `<br><span class="text-blue-500 mt-1 inline-block"><i class="fa fa-crosshairs"></i> Accuracy: ${loc.accuracy}m</span>` : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>`;
                });
                html += '</div>';
                $('#timeline_sidebar').html(html);
            }
            function showTimeline(allLocations, map, ui, locationData) {
                if (window.currentRouteGroup) {
                    map.removeObject(window.currentRouteGroup);
                }
                const routeGroup = new H.map.Group();
                const lineString = new H.geo.LineString();
                allLocations.forEach(loc => {
                    if (loc.latitude && loc.longitude) {
                        lineString.pushPoint({ lat: parseFloat(loc.latitude), lng: parseFloat(loc.longitude) });
                    }
                });
                if (lineString.getPointCount() >= 2) {
                    const polyline = new H.map.Polyline(lineString, {
                        style: { lineWidth: 4, strokeColor: 'rgba(34, 197, 94, 0.8)' } // green color
                    });
                    routeGroup.addObject(polyline);
                }
                allLocations.forEach((loc, index) => {
                    if (loc.latitude && loc.longitude) {
                        const isLastLocation = (index === allLocations.length - 1);
                        if (isLastLocation) {
                            // Render staff image pin marker for the last location point
                            const staffImageUrl = (locationData && locationData.last_location && locationData.last_location.staff_image)
                                ? locationData.last_location.staff_image
                                : (loc.staff_image || 'default-image.png');
                            const canvas = document.createElement('canvas');
                            canvas.width = 50;
                            canvas.height = 60;
                            const context = canvas.getContext('2d');
                            const img = new Image();
                            img.crossOrigin = "anonymous";
                            img.src = staffImageUrl;
                            img.onload = function () {
                                context.fillStyle = '#ffffff';
                                context.beginPath();
                                context.arc(25, 25, 20, 0, 2 * Math.PI);
                                context.fill();
                                context.beginPath();
                                context.moveTo(15, 42);
                                context.lineTo(35, 42);
                                context.lineTo(25, 52);
                                context.fill();
                                context.save();
                                context.beginPath();
                                context.arc(25, 25, 18, 0, 2 * Math.PI);
                                context.clip();
                                context.drawImage(img, 7, 7, 36, 36);
                                context.restore();
                                const markerIcon = new H.map.Icon(canvas);
                                const avatarMarker = new H.map.Marker({ lat: parseFloat(loc.latitude), lng: parseFloat(loc.longitude) }, { icon: markerIcon });
                                avatarMarker.addEventListener('pointerenter', function () {
                                    map.getElement().style.cursor = 'pointer';
                                    ui.getBubbles().forEach(bubble => bubble.close());
                                    const batStr = loc.battery_percentage ? `${loc.battery_percentage}%` : 'N/A';
                                    const accStr = loc.accuracy ? `${loc.accuracy}m` : 'N/A';
                                    const staffName = (locationData && locationData.last_location && locationData.last_location.staff_name) ? locationData.last_location.staff_name : 'Staff';
                                    const latVal = loc.latitude;
                                    const lngVal = loc.longitude;
                                    const rawTime = loc.timestamp || (loc.date && loc.time ? `${loc.date} ${loc.time}` : loc.time) || loc.created_at || loc.date;
                                    const timeStr = loc.formatted_time || formatTimeInTimezone(rawTime, systemTimezone);
                                    const content = `
                                        <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.5; color: #1e293b; min-width: 180px; padding: 2px;">
                                            <div style="font-weight: 700; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; white-space: nowrap;">
                                                ${staffName} <span style="font-size: 10px; color: #16a34a; font-weight: 600;">(Last Point)</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
                                                <span style="color: #64748b; font-weight: 600;">Time:</span>
                                                <span style="font-weight: 600; color: #0f172a;">${timeStr}</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
                                                <span style="color: #64748b; font-weight: 600;">Lat:</span>
                                                <span style="font-weight: 600; color: #0f172a; font-family: monospace;">${latVal}</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
                                                <span style="color: #64748b; font-weight: 600;">Lng:</span>
                                                <span style="font-weight: 600; color: #0f172a; font-family: monospace;">${lngVal}</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
                                                <span style="color: #64748b; font-weight: 600;">Battery:</span>
                                                <span style="font-weight: 600; color: #0f172a;">${batStr}</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; gap: 12px;">
                                                <span style="color: #64748b; font-weight: 600;">Accuracy:</span>
                                                <span style="font-weight: 600; color: #2563eb;">${accStr}</span>
                                            </div>
                                        </div>`;
                                    const bubble = new H.ui.InfoBubble({ lat: parseFloat(loc.latitude), lng: parseFloat(loc.longitude) }, { content: content });
                                    ui.addBubble(bubble);
                                    if (bubble.getElement()) {
                                        bubble.getElement().style.marginTop = '-55px';
                                    }
                                });
                                avatarMarker.addEventListener('pointerleave', function () {
                                    ui.getBubbles().forEach(bubble => bubble.close());
                                });
                                routeGroup.addObject(avatarMarker);
                            };
                        } else {
                            // Render green numbered dot marker for intermediate points
                            const markerNum = index + 1;
                            const svgMarkup = `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="12" cy="12" r="10" fill="#22c55e" stroke="white" stroke-width="2" />
                                                    <text x="12" y="16" font-size="10" font-family="Arial" font-weight="bold" fill="white" text-anchor="middle">${markerNum}</text>
                                                </svg>`;
                            const dotIcon = new H.map.Icon(svgMarkup);
                            const dot = new H.map.Marker(
                                { lat: parseFloat(loc.latitude), lng: parseFloat(loc.longitude) },
                                { icon: dotIcon }
                            );
                            dot.addEventListener('pointerenter', function () {
                                map.getElement().style.cursor = 'pointer';
                                ui.getBubbles().forEach(bubble => bubble.close());
                                const batStr = loc.battery_percentage ? `${loc.battery_percentage}%` : 'N/A';
                                const accStr = loc.accuracy ? `${loc.accuracy}m` : 'N/A';
                                const latVal = loc.latitude;
                                const lngVal = loc.longitude;
                                const rawTime = loc.timestamp || (loc.date && loc.time ? `${loc.date} ${loc.time}` : loc.time) || loc.created_at || loc.date;
                                const timeStr = loc.formatted_time || formatTimeInTimezone(rawTime, systemTimezone);
                                const content = `
                                    <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.5; color: #1e293b; min-width: 180px; padding: 2px;">
                                        <div style="font-weight: 700; font-size: 12px; color: #16a34a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
                                            Point #${index + 1}
                                        </div>
                                        <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
                                            <span style="color: #64748b; font-weight: 600;">Time:</span>
                                            <span style="font-weight: 600; color: #0f172a;">${timeStr}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
                                            <span style="color: #64748b; font-weight: 600;">Lat:</span>
                                            <span style="font-weight: 600; color: #0f172a; font-family: monospace;">${latVal}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
                                            <span style="color: #64748b; font-weight: 600;">Lng:</span>
                                            <span style="font-weight: 600; color: #0f172a; font-family: monospace;">${lngVal}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
                                            <span style="color: #64748b; font-weight: 600;">Battery:</span>
                                            <span style="font-weight: 600; color: #0f172a;">${batStr}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; gap: 12px;">
                                            <span style="color: #64748b; font-weight: 600;">Accuracy:</span>
                                            <span style="font-weight: 600; color: #2563eb;">${accStr}</span>
                                        </div>
                                    </div>`;
                                const bubble = new H.ui.InfoBubble({ lat: parseFloat(loc.latitude), lng: parseFloat(loc.longitude) }, { content: content });
                                ui.addBubble(bubble);
                                if (bubble.getElement()) {
                                    bubble.getElement().style.marginTop = '-15px';
                                }
                            });
                            dot.addEventListener('pointerleave', function () {
                                ui.getBubbles().forEach(bubble => bubble.close());
                            });
                            routeGroup.addObject(dot);
                        }
                    }
                });
                map.addObject(routeGroup);
                window.currentRouteGroup = routeGroup;
                // Center map on the timeline safely if bounding box is valid
                const bbox = routeGroup.getBoundingBox();
                if (bbox) {
                    map.setCenter(bbox.getCenter());
                    map.setZoom(16);
                } else if (allLocations && allLocations.length > 0 && allLocations[0].latitude && allLocations[0].longitude) {
                    map.setCenter({ lat: parseFloat(allLocations[0].latitude), lng: parseFloat(allLocations[0].longitude) });
                    map.setZoom(16);
                }
            }
            function showMapMarkers(locations, map, ui) {
                let firstMarkerLat = null;
                let firstMarkerLng = null;
                locations.forEach(function (location) {
                    const lat = location.last_location ? location.last_location.latitude : null;
                    const lng = location.last_location ? location.last_location.longitude : null;
                    if (lat && lng) {
                        const staffImageUrl = location.last_location.staff_image || 'default-image.png';
                        const canvas = document.createElement('canvas');
                        canvas.width = 50;
                        canvas.height = 60;
                        const context = canvas.getContext('2d');
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.src = staffImageUrl;
                        img.onload = function () {
                            context.fillStyle = '#ffffff';
                            context.beginPath();
                            context.arc(25, 25, 20, 0, 2 * Math.PI);
                            context.fill();
                            context.beginPath();
                            context.moveTo(15, 42);
                            context.lineTo(35, 42);
                            context.lineTo(25, 52);
                            context.fill();
                            context.save();
                            context.beginPath();
                            context.arc(25, 25, 18, 0, 2 * Math.PI);
                            context.clip();
                            context.drawImage(img, 7, 7, 36, 36);
                            context.restore();
                            const markerIcon = new H.map.Icon(canvas);
                            const marker = new H.map.Marker({ lat: parseFloat(lat), lng: parseFloat(lng) }, { icon: markerIcon });
                            map.addObject(marker);
                            marker.addEventListener('pointerenter', function () {
                                map.getElement().style.cursor = 'pointer';
                                ui.getBubbles().forEach(bubble => bubble.close());
                                const batStr = location.last_location.battery_percentage ? `${location.last_location.battery_percentage}%` : 'N/A';
                                const latVal = lat;
                                const lngVal = lng;
                                const staffName = location.last_location.staff_name || 'Unknown';
                                const rawTime = location.last_location ? (location.last_location.timestamp || (location.last_location.date && location.last_location.time ? `${location.last_location.date} ${location.last_location.time}` : location.last_location.time) || location.last_location.created_at || location.last_location.date) : null;
                                const timeStr = (location.last_location && location.last_location.formatted_time) ? location.last_location.formatted_time : (rawTime ? formatTimeInTimezone(rawTime, systemTimezone) : 'N/A');
                                const tooltipContent = `
                                    <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.5; color: #1e293b; min-width: 180px; padding: 2px;">
                                        <div style="font-weight: 700; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; white-space: nowrap;">
                                            ${staffName}
                                        </div>
                                        <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
                                            <span style="color: #64748b; font-weight: 600;">Time:</span>
                                            <span style="font-weight: 600; color: #0f172a;">${timeStr}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
                                            <span style="color: #64748b; font-weight: 600;">Lat:</span>
                                            <span style="font-weight: 600; color: #0f172a; font-family: monospace;">${latVal}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
                                            <span style="color: #64748b; font-weight: 600;">Lng:</span>
                                            <span style="font-weight: 600; color: #0f172a; font-family: monospace;">${lngVal}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; gap: 12px;">
                                            <span style="color: #64748b; font-weight: 600;">Battery:</span>
                                            <span style="font-weight: 600; color: #0f172a;">${batStr}</span>
                                        </div>
                                    </div>`;
                                const tooltip = new H.ui.InfoBubble({ lat: parseFloat(lat), lng: parseFloat(lng) }, { content: tooltipContent });
                                ui.addBubble(tooltip);
                                if (tooltip.getElement()) {
                                    tooltip.getElement().style.marginTop = '-55px';
                                }
                            });
                            marker.addEventListener('pointerleave', function () {
                                ui.getBubbles().forEach(bubble => bubble.close());
                            });
                            // Add tap listener for the timeline
                            marker.addEventListener('tap', function () {
                                if (location.all_locations) {
                                    if (location.all_locations.length > 1) {
                                        showTimeline(location.all_locations, map, ui, location);
                                    }
                                    renderTimelineSidebar(location.all_locations, location);
                                }
                            });
                        };
                        if (!firstMarkerLat && !firstMarkerLng) {
                            firstMarkerLat = lat;
                            firstMarkerLng = lng;
                        }
                    }
                });
                if (firstMarkerLat && firstMarkerLng) {
                    map.setCenter({ lat: parseFloat(firstMarkerLat), lng: parseFloat(firstMarkerLng) });
                    map.setZoom(16);
                }
                setTimeout(() => {
                    map.getViewPort().resize();
                }, 100);
            }
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
    
    
    
    
    <link rel="stylesheet" href="https://js.api.here.com/v3/3.1/mapsjs-ui.css" />
    
