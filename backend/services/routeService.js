const axios = require('axios');

// Standard Google Maps encoded polyline decoder
function decodeGooglePolyline(encoded) {
  const coords = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

async function fetchFromOSRM(originLat, originLng, destLat, destLng) {
  const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
  const { data } = await axios.get(url, { timeout: 8000 });
  if (!data.routes?.[0]) throw new Error('No OSRM route found');
  const route = data.routes[0];
  const driveMins  = Math.round(route.duration / 60);
  const distanceKm = Math.round(route.distance / 1000);
  const routeCoords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return { driveMins, baseMins: driveMins, distanceKm, trafficLevel: 'unknown', trafficExtra: 0, routeCoords };
}

async function getDriveRoute(originLat, originLng, destLat, destLng) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const hasRealKey = key && !key.startsWith('your_') && key.length > 10;

  if (hasRealKey) {
    try {
      const { data } = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
        params: {
          origin: `${originLat},${originLng}`,
          destination: `${destLat},${destLng}`,
          mode: 'driving',
          departure_time: 'now',
          traffic_model: 'best_guess',
          key
        },
        timeout: 8000
      });

      if (data.status !== 'OK' || !data.routes?.[0]) throw new Error(`Google Maps API: ${data.status}`);

      const leg = data.routes[0].legs[0];
      const baseSecs  = leg.duration.value;
      // duration_in_traffic is only present when departure_time=now is honoured by the API
      const driveSecs = leg.duration_in_traffic ? leg.duration_in_traffic.value : baseSecs;
      const driveMins  = Math.round(driveSecs / 60);
      const baseMins   = Math.round(baseSecs / 60);
      const distanceKm = Math.round(leg.distance.value / 1000);
      const trafficRatio = baseMins > 0 ? driveMins / baseMins : 1;
      const trafficLevel = trafficRatio > 1.25 ? 'heavy' : trafficRatio > 1.08 ? 'moderate' : 'clear';
      const trafficExtra = Math.max(0, driveMins - baseMins);
      const routeCoords = decodeGooglePolyline(data.routes[0].overview_polyline.points);
      console.log(`[route] ✅ Google — ${driveMins}min (base ${baseMins}min) ratio=${trafficRatio.toFixed(2)} → ${trafficLevel}`);
      return { driveMins, baseMins, distanceKm, trafficLevel, trafficExtra, routeCoords, source: 'google' };
    } catch (e) {
      const status = e.response?.status;
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      console.error(`[route] ❌ Google Maps failed (HTTP ${status || 'N/A'}): ${detail} — falling back to OSRM`);
    }
  }

  // Free fallback — no API key or Google failed
  const osrm = await fetchFromOSRM(originLat, originLng, destLat, destLng);
  return { ...osrm, source: 'osrm' };
}

module.exports = { getDriveRoute };
