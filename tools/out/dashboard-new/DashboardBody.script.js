





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
        $(document).ready(function () {
            var business_id = '{{ Session::get("business_id") }}';
            function getLiveLocation() {
                $.ajax({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    type: 'POST',
                    url: "{{ route('get_live_location') }}",
                    data: {
                        current_day: "<?= $current_day?>",
                        business_id: business_id
                    },
                    success: function (response) {
                        // locations = response.locations;
                        console.log(response);
                        showMap(response.locations)
                    }
                });
            }
            function showMap(locations) {
                var HERE_MAPS_APIKEY = "{{ env('HERE_MAPS_APIKEY') }}";
                // Initialize the platform object with your API key
                const platform = new H.service.Platform({
                    // apikey: 'HAiYyvW0tHVZL64eAtHkn4GrjEDxMGiRIPkiiBu6d5Y', // Replace with your actual API key
                    apikey: HERE_MAPS_APIKEY, // Replace with your actual API key
                });
                // Obtain the default map types from the platform
                // const maptypes = platform.createDefaultLayers();
                // Initialize the engine type:
                const engineType = H.Map.EngineType['HARP'];
                // Obtain the default map types from the platform object:
                const maptypes = platform.createDefaultLayers({
                    engineType: engineType,
                    lg: "en",
                });
                // Instantiate and display a map (initial center is a default location)
                const map = new H.Map(
                    document.getElementById('mapdiv'),
                    // maptypes.vector.normal.map,{
                    maptypes.raster.satellite.map, {
                    engineType: engineType,
                    center: { lat: 21.1702, lng: 72.8311 }, // Default location (can be changed)
                    zoom: 16,
                }
                );
                // map.addLayer(maptypes.hybrid.day.vector);
                // Enable map events like panning and zooming
                const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
                // Add UI controls (zoom in/out, etc.)
                const ui = H.ui.UI.createDefault(map, maptypes);
                window.addEventListener('resize', () => map.getViewPort().resize());
                // Remove the map settings control
                // ui.getControl('mapsettings').setVisibility(false);
                // Add markers and store the first marker's coordinates
                let firstMarkerLat = null;
                let firstMarkerLng = null;
                locations.forEach(function (location) {
                    const lat = location.last_location ? location.last_location.latitude : null;
                    const lng = location.last_location ? location.last_location.longitude : null;
                    if (lat && lng) {
                        const staffImageUrl = location.last_location.staff_image || 'default-image.png'; // Fallback image
                        // Create a canvas for the marker
                        const canvas = document.createElement('canvas');
                        canvas.width = 50;  // Width for a more marker-like look
                        canvas.height = 60; // Height for a pointy bottom to create the map marker shape
                        const context = canvas.getContext('2d');
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.src = staffImageUrl;
                        img.onload = function () {
                            // Draw the circular background for the marker
                            context.fillStyle = '#ffffff';  // Marker background color
                            context.beginPath();
                            context.arc(25, 25, 20, 0, 2 * Math.PI);  // Circular part of the marker
                            context.fill();
                            // Tail triangle for the marker effect (pointy bottom)
                            context.beginPath();
                            context.moveTo(15, 42); // Adjust the tail starting point
                            context.lineTo(35, 42); // Tail width
                            context.lineTo(25, 52); // Tail point (bottom)
                            context.fill();
                            // Draw the image inside the marker circle
                            context.save();
                            context.beginPath();
                            context.arc(25, 25, 18, 0, 2 * Math.PI);  // Slightly smaller radius to fit the image inside
                            context.clip();
                            context.drawImage(img, 7, 7, 36, 36); // Image position and size inside the circle
                            context.restore();
                            // Create the custom icon from the canvas with correct anchor point
                            const markerIcon = new H.map.Icon(canvas, { anchor: { x: 25, y: 52 } });
                            const marker = new H.map.Marker({ lat: lat, lng: lng }, { icon: markerIcon });
                            map.addObject(marker);

                            // Add hover events to display name and battery percentage
                            marker.addEventListener('pointerenter', function (evt) {
                                map.getElement().style.cursor = 'pointer';
                                const tooltipContent = `
                                                <strong>Name:</strong> ${location.last_location.staff_name || 'Unknown'}<br>
                                                <strong>Battery:</strong> ${location.last_location.battery_percentage || 'N/A'}%<br>
                                                <strong>Date:</strong> ${location.last_location.date || 'N/A'}<br>
                                                <strong>Time:</strong> ${location.last_location.time || 'N/A'}
                                            `;

                                // Reuse an existing bubble or create a new one
                                let bubble = ui.getBubbles()[0];
                                if (!bubble) {
                                    bubble = new H.ui.InfoBubble(evt.target.getGeometry(), { content: tooltipContent });
                                    ui.addBubble(bubble);
                                } else {
                                    bubble.setContent(tooltipContent);
                                    bubble.setPosition(evt.target.getGeometry());
                                    bubble.open();
                                }
                            });
                            marker.addEventListener('pointerleave', function () {
                                map.getElement().style.cursor = 'default';
                                ui.getBubbles().forEach(bubble => bubble.close());
                            });
                        };
                        // Store the first valid marker's coordinates to center the map later
                        if (!firstMarkerLat && !firstMarkerLng) {
                            firstMarkerLat = lat;
                            firstMarkerLng = lng;
                        }
                    }
                });
                // If we have at least one valid marker, center the map on it
                if (firstMarkerLat && firstMarkerLng) {
                    map.setCenter({ lat: firstMarkerLat, lng: firstMarkerLng });
                    map.setZoom(15);  // Adjust zoom level as needed
                }
            }
            getLiveLocation();
            // })
            // input datepicker
            // $(document).ready(function() {
            // var startDatepicker = $("#datepicker");
            // var endDatepicker = $("#datepicker2");
            // // Initialize datepicker1
            // startDatepicker.datepicker({
            //     format: "M yyyy",
            //     autoclose: true,
            //     minViewMode: 1
            // });
            // // Initialize datepicker2
            // endDatepicker.datepicker({
            //     format: "M yyyy",
            //     autoclose: true,
            //     minViewMode: 1
            // });
            // // Set the start date to the first day and end date to the last day of the current month
            // var currentDate = new Date();
            // var firstDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            // var lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            // startDatepicker.datepicker('setDate', firstDayOfCurrentMonth);
            // endDatepicker.datepicker('setDate', lastDayOfCurrentMonth);
            // // When a month is selected in datepicker1, update available months in datepicker2
            // startDatepicker.on('changeDate', function (e) {
            //     var selectedDate = new Date(e.date);
            //     var firstDayOfSelectedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            //     endDatepicker.datepicker('setStartDate', firstDayOfSelectedMonth);
            //     // Check if the start date is after the end date, and update end date if necessary
            //     if (startDatepicker.datepicker('getDate') > endDatepicker.datepicker('getDate')) {
            //         endDatepicker.datepicker('setDate', firstDayOfSelectedMonth);
            //     }
            // });
            // // When a month is selected in datepicker2, update available months in datepicker1
            // endDatepicker.on('changeDate', function (e) {
            //     var selectedDate = new Date(e.date);
            //     var lastDayOfSelectedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
            //     startDatepicker.datepicker('setEndDate', lastDayOfSelectedMonth);
            //     // Check if the end date is before the start date, and update start date if necessary
            //     if (endDatepicker.datepicker('getDate') < startDatepicker.datepicker('getDate')) {
            //         startDatepicker.datepicker('setDate', lastDayOfSelectedMonth);
            //     }
            // });
            // Assuming $start_month is a PHP variable containing the start month in 'Y-m-d' format
            var startDate = new Date('<?php echo $start_month ?>');
            var endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
            $('#datepicker').datepicker({
                format: 'M yyyy',
                startView: 'months',
                minViewMode: 'months',
                endDate: endDate // Disable future months
            });
            // Set date using PHP formatted string 'M Y' to avoid JS timezone shifts
            <?php if (!empty($start_month)): ?>
            $('#datepicker').datepicker('setDate', '<?php echo date('M Y', strtotime($start_month)); ?>');
            <?php else: ?>
            $('#datepicker').datepicker('setDate', new Date());
            <?php endif; ?>
            
            // Set the initial date to the current month
            // $('#datepicker').datepicker('setDate', currentDate);
            // $('#datepicker').datepicker({
            //     format: 'M yyyy',
            //     startView: 'months',
            //     minViewMode: 'months',
            //     endDate: new Date()
            // });
            // $('#datepicker2').datepicker({
            //     format: 'M yyyy',
            //     startView: 'months',
            //     minViewMode: 'months'
            // });
            // $('#datepicker2').datepicker('setDate', new Date(''));
            $('#datepicker3').datepicker({
                format: 'M yyyy',
                startView: 'months',
                minViewMode: 'months'
            });
            $('#datepicker3').datepicker('setDate', new Date('2023-01-01'));
            $('#datepicker4').datepicker({
                format: 'M yyyy',
                startView: 'months',
                minViewMode: 'months'
            });
            $('#datepicker4').datepicker('setDate', new Date('2023-01-01'));
            $('#datepicker5').datepicker({
                format: 'M yyyy',
                startView: 'months',
                minViewMode: 'months'
            });
            $('#datepicker5').datepicker('setDate', new Date('2023-01-01'));
        });
        $('.see_employee_status').click(function () {
            var status = $(this).data('status');
            // console.log(status);
            localStorage.setItem('attendanceStatus', status);
            // Redirect to the attendance page
            // window.location.href = "{{ route('attendance') }}";
            window.location.href = "{{ route('attendance-new') }}";
        });
        // ************************************* Attendance Stats chart *************************************
        var chart;
        $('.attendance_status_month').on('change', function () {
            var start_month = $("input[name='start_month']").val();
            $.ajax({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                url: "{{ route('months_attendance_chart') }}",
                type: "POST",
                data: {
                    "start_month": start_month
                },
                success: function (response) {
                    if (response.status == 1) {
                        var presentCounts = Object.values(response['present_statusData']).map(function (item) {
                            return item.count;
                        });
                        var absentCounts = Object.values(response['absent_statusData']).map(function (item) {
                            return item.count;
                        });
                        var halfdayCounts = Object.values(response['halfday_statusData']).map(function (item) {
                            return item.count;
                        });
                        var months = Object.values(response['filteredMonths']);
                        var maxPresentCount = Math.max(...presentCounts);
                        var maxAbsentCount = Math.max(...absentCounts);
                        var maxHalfdayCount = Math.max(...halfdayCounts);
                        var maxCount = maxPresentCount + maxAbsentCount + maxHalfdayCount;
                        var count = maxCount !== 0 ? maxCount : 20;
                        var options = {
                            series: [
                                {
                                    name: 'On Time',
                                    data: presentCounts
                                },
                                {
                                    name: 'Absent / No Data',
                                    data: absentCounts
                                },
                                {
                                    name: 'Half Leave',
                                    data: halfdayCounts
                                }
                            ],
                            chart: {
                                type: 'bar',
                                height: 300,
                                stacked: true,
                                toolbar: { show: false },
                                zoom: { enabled: true }
                            },
                            responsive: [
                                {
                                    breakpoint: 1024, // Tablets
                                    options: {
                                        chart: { height: 250 },
                                        yaxis: {
                                            tickAmount: count < 5 ? count : 5,
                                            labels: { 
                                                style: { fontSize: '12px' },
                                                formatter: function (val) {
                                                    return val.toFixed(0);
                                                }
                                            }
                                        },
                                        legend: {
                                            position: 'bottom',
                                            fontSize: '12px',
                                            offsetX: -10
                                        }
                                    }
                                },
                                {
                                    breakpoint: 600, // Mobile
                                    options: {
                                        chart: { height: 200 },
                                        plotOptions: {
                                            bar: {
                                                borderRadius: 2,
                                                columnWidth: '70%'
                                            }
                                        },
                                        yaxis: {
                                            tickAmount: count < 3 ? count : 3,
                                            labels: {
                                                style: { fontSize: '10px' },
                                                formatter: function (value) {
                                                    return value > 0 ? value.toFixed(0) : '0';
                                                }
                                            }
                                        },
                                        xaxis: {
                                            labels: {
                                                rotate: -45,
                                                style: { fontSize: '8px' }
                                            }
                                        },
                                        legend: {
                                            position: 'bottom',
                                            fontSize: '10px',
                                            offsetX: 0
                                        }
                                    }
                                }
                            ],
                            plotOptions: {
                                bar: {
                                    horizontal: false,
                                    borderRadius: 5
                                }
                            },
                            xaxis: {
                                type: 'category',
                                categories: months
                            },
                            yaxis: {
                                min: 0,
                                max: count,
                                tickAmount: count < 6 ? count : 6,
                                labels: { 
                                    style: { fontSize: '14px' },
                                    formatter: function (val) {
                                        return val.toFixed(0);
                                    }
                                }
                            },
                            legend: {
                                position: 'bottom',
                                offsetX: -50
                            },
                            fill: { opacity: 1 },
                            dataLabels: { enabled: false },
                            colors: ['#3AC74B', '#FF6857', '#FEBD0B']
                        };
                        if (!chart) {
                            chart = new ApexCharts(document.querySelector("#chart"), options);
                            chart.render();
                        } else {
                            chart.updateSeries([
                                { name: 'On Time', data: presentCounts },
                                { name: 'Absent / No Data', data: absentCounts },
                                { name: 'Half Leave', data: halfdayCounts }
                            ]);
                            chart.updateOptions({
                                xaxis: { categories: months },
                                yaxis: { max: count }
                            });
                        }
                    }
                }
            });
        });
        // ************************************* Shift Info radial chart *************************************
        // var options1 = {
        //     chart: {
        //         height: 320,
        //         wight: 300,
        //         type: "radialBar",
        //         offsetX: -80,
        //         offsetY: 60,
        //     },
        //     series: [67, 84, 20],
        //     plotOptions: {
        //         radialBar: {
        //             dataLabels: {
        //                 name: {
        //                     fontSize: '13px',
        //                     fontWeight: '100',
        //                 },
        //                 value: {
        //                     fontSize: '22px',
        //                     fontWeight: 'bold',
        //                     formatter: function(val) {
        //                         return parseInt(val);
        //                     },
        //                 },
        //                 total: {
        //                     show: true,
        //                     label: 'Fixed Shift',
        //                     style: {
        //                         fontSize: '25px !important',
        //                         // fontWeight: '700',
        //                         color: '#050E17',
        //                     },
        //                 }
        //             }
        //         }
        //     },
        //     legend: {
        //         show: true,
        //         floating: true,
        //         fontSize: '15px',
        //         position: 'right',
        //         offsetX: -40,
        //         offsetY: 60,
        //         labels: {
        //             useSeriesColors: false,
        //             colors: ['#000', '#000', '#000'],
        //             style: {
        //                 fontSize: ['12px', '12px', '12px'],
        //                 fontWeight: ['600', '600', '600'],
        //             },
        //         },
        //         markers: {
        //             size: 0
        //         },
        //         //   formatter: function(seriesName, opts) {
        //         //     return seriesName + ":  " + opts.w.globals.series[opts.seriesIndex]
        //         //   },
        //         itemMargin: {
        //             vertical: 3
        //         }
        //     },
        //     labels: ['Fixed', 'Rotational', 'Open'],
        //     colors: ['#3AC73B', '#FEBD0B', '#FF6857']
        // };
        // new ApexCharts(document.querySelector("#chart1"), options1).render();
        // ************************************* Allowance time series chart *************************************
        // var series = [];
        // var options = {
        //     chart: {
        //         type: "area",
        //         height: 300,
        //         foreColor: "#050E17",
        //         stacked: true,
        //         dropShadow: {
        //             enabled: true,
        //             enabledSeries: [0],
        //             top: -2,
        //             left: 2,
        //             blur: 5,
        //             opacity: 0.06
        //         },
        //         toolbar: {
        //             show: false
        //         },
        //         offsetX: -5
        //     },
        //     colors: ['#3AC73B', '#FF6857', '#FEBD0B'],
        //     stroke: {
        //         curve: "smooth",
        //         width: 3
        //     },
        //     dataLabels: {
        //         enabled: false
        //     },
        //     series: [{
        //             name: 'Allowance',
        //             data: generateDayWiseTimeSeries(0, 7)
        //         },
        //         {
        //             name: 'Bonus',
        //             data: generateDayWiseTimeSeries(1, 7)
        //         },
        //         {
        //             name: 'Deduction',
        //             data: generateDayWiseTimeSeries(2, 7)
        //         }
        //     ],
        //     markers: {
        //         size: 0,
        //         strokeColor: "#fff",
        //         strokeWidth: 3,
        //         strokeOpacity: 1,
        //         fillOpacity: 1,
        //         hover: {
        //             // size: 6
        //         }
        //     },
        //     xaxis: {
        //         type: "datetime",
        //         labels: {
        //             datetimeFormatter: {
        //                 year: 'yyyy',
        //                 month: 'MMM',
        //             }
        //         },
        //         offsetX: -30,
        //         axisBorder: {
        //             show: false
        //         },
        //         axisTicks: {
        //             show: false
        //         }
        //     },
        //     yaxis: {
        //         labels: {
        //             offsetX: -5,
        //             offsetY: -5,
        //         },
        //         tooltip: {
        //             enabled: true
        //         }
        //     },
        //     grid: {
        //         padding: {
        //             left: -5,
        //             right: 5
        //         }
        //     },
        //     tooltip: {
        //         x: {
        //             format: "dd MMM yyyy"
        //         },
        //     },
        //     legend: {
        //         position: 'bottom',
        //         horizontalAlign: 'center'
        //     },
        //     fill: {
        //         type: "gradient",
        //         gradient: {
        //             shadeIntensity: 1,
        //             opacityFrom: 0.3,
        //             opacityTo: 0.3,
        //             stops: [0, 100],
        //         }
        //     }
        // };
        // var chart = new ApexCharts(document.querySelector("#timeline-chart"), options);
        // chart.render();
        // function generateDayWiseTimeSeries(s, count) {
        //     var values = [
        //         [4, 3, 10, 9, 29, 19, 25],
        //         [2, 3, 8, 7, 22, 16, 23],
        //         [2, 4, 7, 9, 22, 16, 28]
        //     ];
        //     var series = [];
        //     var x = new Date("04 feb 2012").getTime(); // Start date in March
        //     var i = 0;
        //     while (i < count) {
        //         series.push([x, values[s][i]]);
        //         // Add a month to the date
        //         x = new Date(x);
        //         x.setMonth(x.getMonth() + 1);
        //         i++;
        //     }
        //     return series;
        // }
        // ************************************* payment chart *************************************
        // var options = {
        //     chart: {
        //         width: 400,
        //         type: "donut",
        //         offsetX: 30,
        //         offsetY: 60,
        //     },
        //     plotOptions: {
        //         pie: {
        //             donut: {
        //                 labels: {
        //                     show: true,
        //                     name: {
        //                         show: true,
        //                         fontSize: '18px',
        //                         color: '#050E17',
        //                         fontWeight: '600',
        //                     },
        //                     value: {
        //                         show: true,
        //                         fontSize: '25px',
        //                         color: '#050E17',
        //                         fontWeight: '700',
        //                     },
        //                     total: {
        //                         show: true,
        //                         label: 'Jun 2023',
        //                         formatter: function(w) {
        //                             return 53536
        //                         }
        //                     }
        //                 },
        //             },
        //         },
        //     },
        //     dataLabels: {
        //         enabled: false
        //     },
        //     series: [44, 55],
        //     labels: ["Previous Month", "Current Month"],
        //     colors: ["#E7EDF6", "#BBC6D8"],
        //     legend: {
        //         position: "right",
        //         horizontalAlign: "center",
        //         offsetX: 30,
        //         offsetY: 60,
        //         markers: {
        //             fillColors: ["#E7EDF6", "#BBC6D8"],
        //         },
        //     },
        // };
        // var chart = new ApexCharts(document.querySelector("#payment-chart"), options);
        // chart.render();
    

/* ---- raw @section(scripts) remainder ---- */

    
    
    
    
    
    
    <link rel="stylesheet" href="https://js.api.here.com/v3/3.1/mapsjs-ui.css" />
    
