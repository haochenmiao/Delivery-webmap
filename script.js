// Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1IjoiaGFvY2gwNDIzIiwiYSI6ImNtMmk1MGhzeDBpajAybXB5d3ZrMjJxa2oifQ.4aD8xH6BjwIb-HzlRNaSbQ';

// Coordinates for Parking Lot and Building Entrance
const parkingLotCoords = [ -123.2487763774755, 49.27106955540924 ]; // Lon, Lat
const entranceCoords = [ -123.25042484166043, 49.270382121434956 ];

// Initialize the Map with Monochrome Style
const map = new mapboxgl.Map({
    container: 'map', // Container ID
    style: 'mapbox://styles/mapbox/light-v10', // Monochrome map style (light)
    center: parkingLotCoords, // Initial map center on parking lot
    zoom: 16 // Zoom level
});

// Add Navigation Controls (optional)
map.addControl(new mapboxgl.NavigationControl());

// Add Markers with Popups for Parking Lot and Building Entrance
const parkingLotMarker = new mapboxgl.Marker({ color: 'blue' })
    .setLngLat(parkingLotCoords)
    .setPopup(
        new mapboxgl.Popup().setHTML(`
            <h4>Parking Lot</h4>
            <img src="./Images/parking_lot.png" alt="Parking Lot" style="width:100px;height:auto;">
        `)
    ) // Popup content with image
    .addTo(map);

const entranceMarker = new mapboxgl.Marker({ color: 'green' })
    .setLngLat(entranceCoords)
    .setPopup(
        new mapboxgl.Popup().setHTML(`
            <h4>Building Entrance</h4>
            <img src="./Images/building_entrance.png" alt="Building Entrance" style="width:100px;height:auto;">
        `)
    ) // Popup content with image
    .addTo(map);

// Initialize variables for bottom sheet drag functionality
let isDragging = false;
let startY = 0;
let currentHeight = 25; // Initial height percentage

const bottomSheet = document.getElementById('bottom-sheet');
const dragHandle = document.getElementById('drag-handle');

// Function to set bottom sheet height
function setBottomSheetHeight(percentage) {
    bottomSheet.style.height = `${percentage}%`;
}

// Mouse and touch event listeners for drag handle
dragHandle.addEventListener('mousedown', startDrag);
dragHandle.addEventListener('touchstart', startDrag);

document.addEventListener('mousemove', drag);
document.addEventListener('touchmove', drag);

document.addEventListener('mouseup', endDrag);
document.addEventListener('touchend', endDrag);

function startDrag(event) {
    isDragging = true;
    startY = event.touches ? event.touches[0].clientY : event.clientY;
}

function drag(event) {
    if (!isDragging) return;
    const currentY = event.touches ? event.touches[0].clientY : event.clientY;
    const deltaY = startY - currentY;
    const newHeight = currentHeight + (deltaY / window.innerHeight) * 100;

    // Constrain the height between 25% and 60%
    if (newHeight >= 25 && newHeight <= 60) {
        setBottomSheetHeight(newHeight);
    }
}

function endDrag() {
    if (isDragging) {
        isDragging = false;

        // Determine final position for snapping effect
        const finalHeight = parseFloat(bottomSheet.style.height);

        if (finalHeight > 42.5) {
            currentHeight = 60; // Expanded state
        } else {
            currentHeight = 25; // Collapsed state
        }
        setBottomSheetHeight(currentHeight); // Snap to either expanded or collapsed
    }
}


// Function to check if driver is near a specific point
function isCloseTo(targetCoords, driverCoords, threshold = 0.0001) {
    const [targetLon, targetLat] = targetCoords;
    const [driverLon, driverLat] = driverCoords;

    const distance = Math.sqrt((targetLon - driverLon) ** 2 + (targetLat - driverLat) ** 2);
    return distance < threshold;
}

// Update progress in the bottom sheet
function updateProgress(stepId, markerId, lineHeight) {
    document.getElementById(stepId).classList.add('completed');
    document.getElementById(markerId).classList.add('completed');
    document.getElementById("progress-line").style.height = `${lineHeight}%`;
}

// Geolocate API to get driver's current location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
        const driverCoords = [position.coords.longitude, position.coords.latitude];

        // Add Driver's Marker to the map
        const driverMarker = new mapboxgl.Marker({ color: 'red' })
            .setLngLat(driverCoords)
            .addTo(map);

        // Center map on driver's current location
        map.setCenter(driverCoords);

        // Get and display driving route from Driver to Parking Lot
        getRoute(driverCoords, parkingLotCoords, 'driving', 'route');
        
        // Get and display walking route from Parking Lot to Building Entrance
        getRoute(parkingLotCoords, entranceCoords, 'walking', 'walk-route');
    });
} else {
    alert("Geolocation is not supported by your browser.");
}

// Function to Get Route using Mapbox Directions API with specified profile
async function getRoute(start, end, profile, layerId) {
    const query = await fetch(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`);
    const data = await query.json();
    const route = data.routes[0].geometry;

    // Remove existing layer if it exists (for dynamic updates)
    if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
        map.removeSource(layerId);
    }

    // Display the route on the map
    map.addLayer({
        id: layerId,
        type: 'line',
        source: {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: route
            }
        },
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': profile === 'driving' ? '#3b9ddd' : '#ff7e5f', // Blue for driving, Orange for walking
            'line-width': 5,
            'line-dasharray': profile === 'walking' ? [2, 4] : [1, 0] // Dotted for walking
        }
    });
}
