function init() {

    // set bounding box for map + create it
    var southWest = L.latLng(-90, -179),
        northEast = L.latLng(90, 179),
        worldBounds = L.latLngBounds(southWest, northEast);

    var map = L.map('map', {
        noWrap: true,
        minZoom: 3,
        maxZoom: 16,
        maxBounds: worldBounds
    }).setView([0, 15], 3);

    // initialize the Leaflet hash plugin to add zoom/lat/lon hash to our url
    var hash = new L.Hash(map);

    // add the OSM basemap
    var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    map.addLayer(osm);

    var glad = L.tileLayer('http://staging-api.globalforestwatch.org/v1/true-color-tiles/glad/{z}/{x}/{y}', {
	       maxZoom:19
	   })
     map.addLayer(glad);

    // create an empty feature group for our user-drawn AOIs + add to map
    var editableLayers = new L.FeatureGroup();
    map.addLayer(editableLayers);

    // leaflet draw plugin options
    var options = {
        position: 'topleft',
        draw: {
            polygon: {
                allowIntersection: false, // Restricts shapes to simple polygons
                drawError: {
                    color: '#e1e100',
                    message: '<strong>Oh snap!<strong> you can\'t draw that!'
                },
                shapeOptions: {
                    color: '#bada55'
                }
            },
            circle: false,
            rectangle: false,
            marker: false,
            polyline: false
        },
        edit: false
    };

    // create + add leaflet draw plugin to map
    var drawControl = new L.Control.Draw(options);
    map.addControl(drawControl);

    // fired when a user completes a new polygon
    map.on(L.Draw.Event.CREATED, function(e) {

        // clear old features
        editableLayers.clearLayers();

        // grab layer + add new popup
        var layer = e.layer;
        layer.bindPopup(buildPopupHTML());

        // build popup dynamically when clicked
        layer.on('click', function() {
            layer.bindPopup(buildPopupHTML());
        })

        // add layer to map
        editableLayers.addLayer(layer);

    });

    // function to count download glad points
    window.downloadPoints = function() {
        console.log('calling GFW API')

        // grab the polygon as GeoJSON from the map
        var geojson = editableLayers.toGeoJSON()
        console.log(geojson)

            // call the GLAD API to get a count of alerts based on
            // our AOI, min/max date, and confidence filter
	    var url = 'http://localhost:5000/glad-alerts/download'
            callAPI(url, geojson)
    }

    // function to count the GLAD alerts for a user-drawn polygon
    window.countFiresInAOI = function() {
        console.log('calling GFW API')

        // grab the polygon as GeoJSON from the map
        var geojson = editableLayers.toGeoJSON()
        console.log(geojson)

            // call the GLAD API to get a count of alerts based on
            // our AOI, min/max date, and confidence filter
	    var url = 'http://localhost:5000/glad-alerts'
            callAPI(url, geojson, function(fireResp) {
                //var fireResults = fireResp.data.attributes.value
		console.log(fireResp)
		alert(JSON.stringify(fireResp))
            })
    }

    // build the popup for the polygon
    var buildPopupHTML = function() {
        var html = 'GLAD Alerts by AOI<br><hr>'
        html += '<button name="button" onclick="countFiresInAOI()" >Run analysis</button><br>'
        html += '<button name="button" onclick="downloadPoints()" >Download points</button>'

        return html
    }

}


// send the GeoJSON of our polygon to the GFW Geostore
// we'll use the Geostore ID that's returned to pass
// our AOI directly to the GLAD API
function callAPI(url, geojson, callback) {

    var http = new XMLHttpRequest();
    var params = JSON.stringify({
        "geojson": geojson
    });
    http.open("POST", url, true);

    //Send the proper header information along with the request
    http.setRequestHeader("Content-type", "application/json");

    http.onreadystatechange = function() { //Call a function when the state changes.
        if (http.readyState == 4 && http.status == 200) {
		console.log("IN READY STATE")
		console.log(http)

          if (http.responseURL.indexOf('download') !== -1) {

                // http://www.alexhadik.com/blog/2016/7/7/l8ztp8kr5lbctf5qns4l8t3646npqh
                var blob = new Blob([http.response], {type: 'text/csv'});
		var a = document.createElement("a");
		a.style = "display: none";
		document.body.appendChild(a);
		var url = window.URL.createObjectURL(blob);
		a.href = url;
		a.download = 'data.csv';
		a.click();
		window.URL.revokeObjectURL(url);

	} else {
            callback(JSON.parse(http.responseText));
   	  }

        }
    }
    http.send(params);
}
