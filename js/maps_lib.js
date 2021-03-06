/*!
 * Searchable Map Template with Google Fusion Tables
 * http://derekeder.com/searchable_map_template/
 *
 * Copyright 2012, Derek Eder
 * Licensed under the MIT license.
 * https://github.com/derekeder/FusionTable-Map-Template/wiki/License
 *
 * Date: 12/10/2012
 *
 */

// Enable the visual refresh
google.maps.visualRefresh = true;

var MapsLib = MapsLib || {};
var MapsLib = {

  //Setup section - put your Fusion Table details here
  //Using the v1 Fusion Tables API. See https://developers.google.com/fusiontables/docs/v1/migration_guide for more info

  //the encrypted Table ID of your Fusion Table (found under File => About)
  //NOTE: numeric IDs will be depricated soon

  desertTableId:      "18xIbO9F8ptOrrKHN7K_9bWyesi7DdGLPF6jfJytd",
  fusionTableId:      "19OsySnT4O4p3jq4IGBDcE0l9GmT3ocWEareGrpIT",
  incomeTableId:      "1vLRGAVSgrarGtN7NB_IqJ_wBkgmRAzAOYakx5rcF",
  raceTableId:        "1GiCIYpJe8Pd8PI8q4YQhreHoudVrR8gyTBJmOj9T",

  //*New Fusion Tables Requirement* API key. found at https://code.google.com/apis/console/
  //*Important* this key is for demonstration purposes. please register your own.
  googleApiKey:       "AIzaSyCVas6PKdV-7KmRXxBTlBTLI6sB3N6uBII",

  //name of the location column in your Fusion Table.
  //NOTE: if your location column name has spaces in it, surround it with single quotes
  //example: locationColumn:     "'my location'",
  locationColumn:     "Address",

  map_centroid:       new google.maps.LatLng(43.0500, -87.9500), //center that your map defaults to
  locationScope:      "milwaukee",      //geographical area appended to all address searches
  recordName:         "clinic",       //for showing number of results
  recordNamePlural:   "clinics",

  searchRadius:       805,            //in meters ~ 1/2 mile
  defaultZoom:        11,             //zoom level when map is loaded (bigger is more zoomed in)
  addrMarkerImage:    'images/blue-pushpin.png',
  currentPinpoint:    null,

  initialize: function() {
    $( "#result_count" ).html("");

    geocoder = new google.maps.Geocoder();
    var myOptions = {
      zoom: MapsLib.defaultZoom,
      center: MapsLib.map_centroid,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map($("#map_canvas")[0],myOptions);

    // maintains map centerpoint for responsive design
    google.maps.event.addDomListener(map, 'idle', function() {
        MapsLib.calculateCenter();
    });

    google.maps.event.addDomListener(window, 'resize', function() {
        map.setCenter(MapsLib.map_centroid);
    });

    MapsLib.searchrecords = null;

    //reset filters
    $("#search_address").val(MapsLib.convertToPlainString($.address.parameter('address')));
    var loadRadius = MapsLib.convertToPlainString($.address.parameter('radius'));
    if (loadRadius != "") $("#search_radius").val(loadRadius);
    else $("#search_radius").val(MapsLib.searchRadius);
    $(":checkbox").prop("checked", "checked");
    $("#result_box").hide();

    //-----custom initializers-------

    MapsLib.desert = new google.maps.FusionTablesLayer({
      query: {from:   MapsLib.desertTableId, select: "geometry"},
	     styles: [{
		     polygonOptions: {
			     fillColor: "#F7EDF1",
	    fillOpacity: 0.5
		     }
	     }, {
		     where: "LILATracts_halfAnd10 > 0 ",
	    polygonOptions: {
		    fillColor: "#E7CAD9"
	    }
	     },
	     {
		     where: "LILATracts_1And10 > 0",
	    polygonOptions: {
		    fillColor: "#C7A4B5"
	    }
	     }/*,
	     {
		     where: "LowerIncomeTracts == 1",
	    polygonOptions: {
		    fillColor: "#99FFFF"
	    }
	     }*/]
    });

    MapsLib.income = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.incomeTableId,
      select: "geometry",
        where: "col4 \x3d 79" },

      options: {
        styleId: 2,
        templateId: 2
      } /*,
	     styles: [{
		     polygonOptions: {
			     //fillColor: "#fef0d9",
	    fillOpacity: 0.3
		     }
	     }/*, {
		     where: "MedianHouseholdIncome >= 10000 AND MedianHouseholdIncome < 20000 ",
	    polygonOptions: {
		    fillColor: "#fdcc8a"
	    }
	     },
	     {
		     where: "MedianHouseholdIncome >= 20000 AND MedianHouseholdIncome < 30000 ",
	    polygonOptions: {
		    fillColor: "#fc8d59"
	    }
	     },
	     {
		     where: "MedianHouseholdIncome >= 30000",
	    polygonOptions: {
		    fillColor: "#d7301f"
	    }
	     }]*/

    });

   MapsLib.race = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.raceTableId,
      select: "geometry",
        where: "col4 \x3d 79"  },
	     styles: [{
		     polygonOptions: {
			     /*fillColor: "#fef0d9",*/
	    fillOpacity: 0.3
		     }
	     }, {
		     where: "FractionWhite > 0.5",
	    polygonOptions: {
		    fillColor: "#7fc97f"
	    }
	     },
	     {
		     where: "FractionBlack > 0.5",
	    polygonOptions: {
		    fillColor: "#beaed4"
	    }
	     },
	     {
		     where: "FractionHispanic > 0.5",
	    polygonOptions: {
		    fillColor: "#fdc086"
	     }}]

    });

    MapsLib.desert.setMap(map);


    //-----end of custom initializers-------

    //run the default search
    MapsLib.doSearch();
  },

  doSearch: function(location) {
    MapsLib.clearSearch();
    var address = $("#search_address").val();
    MapsLib.searchRadius = $("#search_radius").val();

    var whereClause = MapsLib.locationColumn + " not equal to ''";

    //-----custom filters-------

    /*
    var type_column = "'VIODESCRIPTION'";
var tempWhereClause = [];
if ( $("#cbType1").is(':checked')) tempWhereClause.push("METER PARKING VIOLATION");
if ( $("#cbType2").is(':checked')) tempWhereClause.push("IMPROPERLY DISPLAYED VEHICLE REGISTRATION");
if ( $("#cbType3").is(':checked')) tempWhereClause.push("Public");
if ( $("#cbType4").is(':checked')) tempWhereClause.push("Other");
whereClause += " AND " + type_column + " IN ('" + tempWhereClause.join("','") + "')";
*/

    //-------end of custom filters--------

    if (address != "") {
      if (address.toLowerCase().indexOf(MapsLib.locationScope) == -1)
        address = address + " " + MapsLib.locationScope;

      geocoder.geocode( { 'address': address}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          MapsLib.currentPinpoint = results[0].geometry.location;

          $.address.parameter('address', encodeURIComponent(address));
          $.address.parameter('radius', encodeURIComponent(MapsLib.searchRadius));
          map.setCenter(MapsLib.currentPinpoint);
          map.setZoom(14);

          MapsLib.addrMarker = new google.maps.Marker({
            position: MapsLib.currentPinpoint,
            map: map,
            icon: MapsLib.addrMarkerImage,
            animation: google.maps.Animation.DROP,
            title:address
          });

          whereClause += " AND ST_INTERSECTS(" + MapsLib.locationColumn + ", CIRCLE(LATLNG" + MapsLib.currentPinpoint.toString() + "," + MapsLib.searchRadius + "))";

          MapsLib.drawSearchRadiusCircle(MapsLib.currentPinpoint);
          MapsLib.submitSearch(whereClause, map, MapsLib.currentPinpoint);
        }
        else {
          alert("We could not find your address: " + status);
        }
      });
    }
    else { //search without geocoding callback
      MapsLib.submitSearch(whereClause, map);
    }
  },

  submitSearch: function(whereClause, map, location) {
    //get using all filters
    //NOTE:  and templateId are recently added attributes to load custom marker styles and info windows
    //you can find your Ids inside the link generated by the 'Publish' option in Fusion Tables
    //for more details, see https://developers.google.com/fusiontables/docs/v1/using#WorkingStyles

    MapsLib.searchrecords = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.fusionTableId,
        select: MapsLib.locationColumn,
        where:  whereClause
      },
      styleId : 2,
      templateId: 2
    });
    MapsLib.searchrecords.setMap(map);
    MapsLib.getCount(whereClause);
  },

  clearSearch: function() {
    if (MapsLib.searchrecords != null)
      MapsLib.searchrecords.setMap(null);
    if (MapsLib.addrMarker != null)
      MapsLib.addrMarker.setMap(null);
    if (MapsLib.searchRadiusCircle != null)
      MapsLib.searchRadiusCircle.setMap(null);
  },

  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation;

    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        MapsLib.addrFromLatLng(foundLocation);
      }, null);
    }
    else {
      alert("Sorry, we could not find your location.");
    }
  },

  addrFromLatLng: function(latLngPoint) {
    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#search_address').val(results[1].formatted_address);
          $('.hint').focus();
          MapsLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },

  drawSearchRadiusCircle: function(point) {
      var circleOptions = {
        strokeColor: "#4b58a6",
        strokeOpacity: 0.3,
        strokeWeight: 1,
        fillColor: "#4b58a6",
        fillOpacity: 0.05,
        map: map,
        center: point,
        clickable: false,
        zIndex: -1,
        radius: parseInt(MapsLib.searchRadius)
      };
      MapsLib.searchRadiusCircle = new google.maps.Circle(circleOptions);
  },

  query: function(selectColumns, whereClause, callback) {
    var queryStr = [];
    queryStr.push("SELECT " + selectColumns);
    queryStr.push(" FROM " + MapsLib.fusionTableId);
    queryStr.push(" WHERE " + whereClause);

    var sql = encodeURIComponent(queryStr.join(" "));
    $.ajax({url: "https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&callback="+callback+"&key="+MapsLib.googleApiKey, dataType: "jsonp"});
  },

  handleError: function(json) {
    if (json["error"] != undefined) {
      var error = json["error"]["errors"]
      console.log("Error in Fusion Table call!");
      for (var row in error) {
        console.log(" Domain: " + error[row]["domain"]);
        console.log(" Reason: " + error[row]["reason"]);
        console.log(" Message: " + error[row]["message"]);
      }
    }
  },

  getCount: function(whereClause) {
    var selectColumns = "Count()";
    MapsLib.query(selectColumns, whereClause,"MapsLib.displaySearchCount");
  },

  displaySearchCount: function(json) {
    MapsLib.handleError(json);
    var numRows = 0;
    if (json["rows"] != null)
      numRows = json["rows"][0];

    var name = MapsLib.recordNamePlural;
    if (numRows == 1)
    name = MapsLib.recordName;
    $( "#result_box" ).fadeOut(function() {
        $( "#result_count" ).html(MapsLib.addCommas(numRows) + " " + name + " found");
      });
    $( "#result_box" ).fadeIn();
  },

  addCommas: function(nStr) {
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
  },

  // maintains map centerpoint for responsive design
  calculateCenter: function() {
    center = map.getCenter();
  },

  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
  	return decodeURIComponent(text);
  },

  //-----custom functions-------
  // NOTE: if you add custom functions, make sure to append each one with a comma, except for the last one.
  // This also applies to the convertToPlainString function above
  toggleOverlay: function() {
    MapsLib.desert.setMap(null);
    MapsLib.income.setMap(null);
    MapsLib.race.setMap(null);
    /*MapsLib.population.setMap(null);
    MapsLib.medianIncome.setMap(null);*/

    if ($("#overlayType1").is(':checked')) {
      MapsLib.desert.setMap(map);
      //MapsLib.setDemographicsLabels("0&ndash;20%", "20&ndash;40%", "40&ndash;62%");
    }
    if ($("#overlayType2").is(':checked')) {
      MapsLib.income.setMap(map);
      //MapsLib.setDemographicsLabels("0&ndash;7%", "7&ndash;14%", "14&ndash;22%");
    }
    if ($("#rbCensus3").is(':checked')) { }

    if ($("#overlayType4").is(':checked')) {
      MapsLib.race.setMap(map);
      //MapsLib.setDemographicsLabels("0&ndash;7%", "7&ndash;14%", "14&ndash;22%");
    }
    /*
    if ($("#rbCensus4").is(':checked')) {
      MapsLib.medianIncome.setMap(map);
      //MapsLib.setDemographicsLabels("$10k&ndash;40k", "$40k&ndash;70k", "$70k&ndash;100k");
    }
    if ($("#rbCensus7").is(':checked')) {
      //MapsLib.setDemographicsLabels("&ndash;", "&ndash;", "&ndash;");
    }*/

  }

  //-----end of custom functions-------
}
