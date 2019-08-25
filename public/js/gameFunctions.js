function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km

  // Round it up and return
  return " " + (Math.round(d * 100) / 100) + " ";
  }

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

function removeLineFromMap(m) {
  for(i in m._layers) {
      if(m._layers[i]._path != undefined) {
          try {
              m.removeLayer(m._layers[i]);
          }
          catch(e) {
              console.log("problem with " + e + m._layers[i]);
          }
      }
  }
}