const axios = require('axios');

function decodeHerePolyline(encoded) {
  const TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let i = 0;
  function decodeUnsigned() {
    let r = 0, s = 0, c;
    do { c = TABLE.indexOf(encoded[i++]); r |= (c & 0x1f) << s; s += 5; } while (c >= 0x20);
    return r;
  }
  function decodeSigned() {
    const u = decodeUnsigned();
    return (u & 1) ? ~(u >>> 1) : (u >>> 1);
  }
  decodeUnsigned(); // version
  const hdr = decodeUnsigned();
  const precision = hdr & 0xf;
  const hasThird = ((hdr >> 4) & 0x7) > 0;
  const factor = Math.pow(10, precision);
  const coords = [];
  let lat = 0, lng = 0;
  while (i < encoded.length) {
    lat += decodeSigned();
    lng += decodeSigned();
    if (hasThird) decodeSigned();
    coords.push([lat / factor, lng / factor]);
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
  // GeoJSON coords are [lng, lat] — flip to [lat, lng] for Leaflet
  const routeCoords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return { driveMins, baseMins: driveMins, distanceKm, trafficLevel: 'clear', trafficExtra: 0, routeCoords };
}

async function getDriveRoute(originLat, originLng, destLat, destLng) {
  const key = process.env.HERE_API_KEY;
  const hasRealKey = key && !key.startsWith('your_') && key.length > 10;

  if (hasRealKey) {
    try {
      // HERE requires ISO 8601 without milliseconds for departureTime
      const depTime = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
      const { data } = await axios.get('https://router.hereapi.com/v8/routes', {
        params: {
          transportMode: 'car',
          origin: `${originLat},${originLng}`,
          destination: `${destLat},${destLng}`,
          return: 'summary,polyline',
          departureTime: depTime,
          apikey: key
        },
        timeout: 8000
      });

      if (!data.routes?.[0]) throw new Error('No HERE route found');

      const section = data.routes[0].sections[0];
      const summary = section.summary;
      console.log('[route] HERE summary:', JSON.stringify(summary));

      const driveSecs = summary.duration;
      // baseDuration = time without traffic; typicalDuration is an older alias
      const baseSecs  = summary.baseDuration ?? summary.typicalDuration ?? driveSecs;
      const driveMins  = Math.round(driveSecs / 60);
      const baseMins   = Math.round(baseSecs / 60);
      const distanceKm = Math.round(summary.length / 1000);
      const trafficRatio = baseMins > 0 ? driveMins / baseMins : 1;
      const trafficLevel = trafficRatio > 1.25 ? 'heavy' : trafficRatio > 1.08 ? 'moderate' : 'clear';
      const trafficExtra = Math.max(0, driveMins - baseMins);
      const routeCoords = decodeHerePolyline(section.polyline);
      console.log(`[route] ✅ HERE — ${driveMins}min (base ${baseMins}min) ratio=${trafficRatio.toFixed(2)} → ${trafficLevel}`);
      return { driveMins, baseMins, distanceKm, trafficLevel, trafficExtra, routeCoords, source: 'here' };
    } catch (e) {
      const status = e.response?.status;
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      console.error(`[route] ❌ HERE failed (HTTP ${status || 'N/A'}): ${detail} — falling back to OSRM`);
    }
  }

  // Free fallback — no API key or HERE failed
  const osrm = await fetchFromOSRM(originLat, originLng, destLat, destLng);
  return { ...osrm, source: 'osrm' };
}

module.exports = { getDriveRoute };
