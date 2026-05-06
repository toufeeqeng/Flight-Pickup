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

async function getDriveRoute(originLat, originLng, destLat, destLng) {
  const key = process.env.HERE_API_KEY;
  if (!key) throw new Error('HERE_API_KEY not configured');

  const { data } = await axios.get('https://router.hereapi.com/v8/routes', {
    params: {
      transportMode: 'car',
      origin: `${originLat},${originLng}`,
      destination: `${destLat},${destLng}`,
      return: 'summary,polyline',
      departureTime: 'now',
      apikey: key
    },
    timeout: 8000
  });

  if (!data.routes?.[0]) throw new Error('No route found');

  const section = data.routes[0].sections[0];
  const summary = section.summary;

  const driveMins  = Math.round(summary.duration / 60);
  const baseMins   = Math.round((summary.baseDuration ?? summary.duration) / 60);
  const distanceKm = Math.round(summary.length / 1000);

  const trafficRatio = baseMins > 0 ? driveMins / baseMins : 1;
  const trafficLevel = trafficRatio > 1.25 ? 'heavy' : trafficRatio > 1.08 ? 'moderate' : 'clear';
  const trafficExtra = Math.max(0, driveMins - baseMins);

  const routeCoords = decodeHerePolyline(section.polyline);

  return { driveMins, baseMins, distanceKm, trafficLevel, trafficExtra, routeCoords };
}

module.exports = { getDriveRoute };
