

    function showMap(data) {
        // Initialize the map
        const map = L.map('map').setView([21.1702, 72.8311], 5);

        // Add a tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Add markers for each GPS point
        data.location.forEach((point, index) => {
            const coords = [parseFloat(point.latitude), parseFloat(point.longitude)];
            L.marker(coords).addTo(map)
                .bindPopup(`Point ${index + 1}<br>Lat: ${point.latitude}, Lng: ${point.longitude}<br>Battery: ${point.battery_percentage}%`);
        });
        const gpsData = data.location.map(point => [parseFloat(point.latitude), parseFloat(point.longitude)]);
        // Draw a polyline for the route
        const route = L.polyline(gpsData, {color: 'blue', weight: 4}).addTo(map);

        // Adjust map view to fit the route
        map.fitBounds(route.getBounds());
    }

    // function showMap(data) {
    //     // Initialize the map
    //     const map = L.map('map').setView([21.1702, 72.8311], 13);
    //
    //     // Add a tile layer
    //     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //         attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    //     }).addTo(map);
    //
    //     // Add markers for each GPS point
    //     data.location.forEach((point, index) => {
    //         const coords = [parseFloat(point.latitude), parseFloat(point.longitude)];
    //         L.marker(coords).addTo(map)
    //             .bindPopup(`Point ${index + 1}<br>Lat: ${point.latitude}, Lng: ${point.longitude}<br>Battery: ${point.battery_percentage}%`);
    //     });
    //
    //     // Ensure there are at least two points for routing
    //     if (data.location.length >= 2) {
    //         const point1 = [parseFloat(data.location[0].latitude), parseFloat(data.location[0].longitude)];
    //         const point2 = [parseFloat(data.location[1].latitude), parseFloat(data.location[1].longitude)];
    //
    //         // Add route control using Leaflet Routing Machine
    //         L.Routing.control({
    //             waypoints: [
    //                 L.latLng(point1[0], point1[1]),
    //                 L.latLng(point2[0], point2[1])
    //             ],
    //             routeWhileDragging: true
    //         }).addTo(map);
    //     }
    // }

    // function showMap(data) {
    //     // Initialize the map
    //     const map = L.map('map').setView([21.1702, 72.8311], 5);
    //
    //     // Add a tile layer
    //     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //         attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    //     }).addTo(map);
    //
    //     // Add markers for each GPS point
    //     const waypoints = [];
    //     data.location.forEach((point, index) => {
    //         const coords = [parseFloat(point.latitude), parseFloat(point.longitude)];
    //         waypoints.push(L.latLng(coords[0], coords[1])); // Add each point to waypoints
    //
    //         L.marker(coords).addTo(map)
    //             .bindPopup(`Point ${index + 1}<br>Lat: ${point.latitude}, Lng: ${point.longitude}<br>Battery: ${point.battery_percentage}%`);
    //     });
    //
    //     // Ensure there are at least two points for routing
    //     if (waypoints.length >= 2) {
    //         // Add route control using Leaflet Routing Machine with all waypoints
    //         L.Routing.control({
    //             waypoints: waypoints,
    //             routeWhileDragging: false,
    //             lineOptions: {
    //                 styles: [{ color: 'black', weight: 3 }]
    //             }
    //         }).addTo(map);
    //     }
    // }


    function showMap(data) {
        // Initialize the map
        const map = L.map('map').setView([21.1702, 72.8311], 5);

        // Add a tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Add markers for each GPS point
        const waypoints = [];
        data.location.forEach((point, index) => {
            const coords = [parseFloat(point.latitude), parseFloat(point.longitude)];
            waypoints.push(L.latLng(coords[0], coords[1])); // Add each point to waypoints

            L.marker(coords).addTo(map)
                .bindPopup(`Name ${data.staff.name}<br>Lat: ${point.latitude}, Lng: ${point.longitude}<br>Battery: ${point.battery_percentage}%`);
        });

        // Ensure there are at least two points for routing
        if (waypoints.length >= 2) {
            // Add route control using Leaflet Routing Machine with OSRM engine
            L.Routing.control({
                waypoints: waypoints,
                routeWhileDragging: false,
                lineOptions: {
                    styles: [{ color: 'blue', weight: 5 }]
                },
                createMarker: function() { return null; } // Optional: To prevent showing individual markers on the route
            }).addTo(map);
        }
    }

    var business_id = "<?= $business[0]->id?>";
    var staff_id = null;
    function mapLocation(id) {
        staff_id = id;
        getLiveLocation();
    }
    mapLocation(61);
    function getLiveLocation() {
        $.ajax({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            type: 'POST',
            url: "{{ route('staff_live_location') }}",
            data: {
                business_id: business_id,
                staff_id: staff_id
            },
            success: function(response) {
                showMap(response.data);
            }
        });
    }


/* ---- raw @section(scripts) remainder ---- */
