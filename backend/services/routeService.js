const axios = require('axios');

async function getDriveRoute(originLat, originLng, destLat, destLng) {
  /* ── GOOGLE MAPS (uncomment when key is ready) ──────────────────────────
  const key = process.env.GOOGLE_MAPS_KEY;
  const gUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving&departure_time=now&key=${key}`;
  const gr = await axios.get(gUrl);
  const leg = gr.data.routes[0].legs[0];
  const driveMins   = Math.round(leg.duration_in_traffic.value / 60);
  const baseMins    = Math.round(leg.duration.value / 60);
  const distanceKm  = Math.round(leg.distance.value / 1000);
  const trafficRatio = driveMins / baseMins;
  const trafficLevel = trafficRatio > 1.25 ? 'heavy' : trafficRatio > 1.08 ? 'moderate' : 'clear';
  const trafficExtra = driveMins - baseMins;
  const decode = (enc) => { const pts=[]; let i=0,lat=0,lng=0; while(i<enc.length){let b,shift=0,r=0;do{b=enc.charCodeAt(i++)-63;r|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);lat+=r&1?~(r>>1):(r>>1);shift=0;r=0;do{b=enc.charCodeAt(i++)-63;r|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);lng+=r&1?~(r>>1):(r>>1);pts.push([lat/1e5,lng/1e5])}return pts};
  const routeCoords = decode(gr.data.routes[0].overview_polyline.points);
  return { driveMins, baseMins, distanceKm, trafficLevel, trafficExtra, routeCoords };
  ── end Google Maps ──────────────────────────────────────────────────── */

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
  const { data } = await axios.get(osrmUrl, { timeout: 8000 });
  if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('Routing failed');

  const route      = data.routes[0];
  const baseMins   = Math.round(route.duration / 60);
  const distanceKm = Math.round(route.distance / 1000);

  const h = new Date().getHours();
  let trafficLevel, trafficExtra;
  if ((h >= 7 && h < 9) || (h >= 17 && h < 19))       { trafficLevel='heavy';    trafficExtra=Math.round(baseMins*0.35); }
  else if ((h >= 9 && h < 12)||(h >= 15 && h < 17)||(h >= 19 && h < 21)) { trafficLevel='moderate'; trafficExtra=Math.round(baseMins*0.15); }
  else                                                   { trafficLevel='clear';    trafficExtra=0; }

  const driveMins   = baseMins + trafficExtra;
  const routeCoords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

  return { driveMins, baseMins, distanceKm, trafficLevel, trafficExtra, routeCoords };
}

module.exports = { getDriveRoute };
