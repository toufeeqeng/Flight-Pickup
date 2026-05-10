const cache = require('./cache');
const axios = require('axios');
const { getAirportByIata } = require('./airportService');
const { getWeather } = require('./weatherService');

function calcBuffer(status, depDelay, arrDelay) {
  const s = (status || '').toLowerCase().replace(/[-\s]/g, '');
  let bufferMinutes = 20, bufferLabel = 'On Schedule', bufferColor = 'blue', advice = '';

  if (s === 'landed') {
    bufferMinutes = 0; bufferLabel = 'Landed'; bufferColor = 'green';
    advice = 'Flight has landed! Head to arrivals — allow 15-20 min for baggage & customs.';
  } else if (s === 'cancelled') {
    bufferMinutes = 0; bufferLabel = 'Cancelled'; bufferColor = 'red';
    advice = 'Flight CANCELLED. Contact the airline immediately for rebooking.';
  } else if (s === 'diverted') {
    bufferMinutes = 0; bufferLabel = 'Diverted'; bufferColor = 'red';
    advice = 'Flight diverted to another airport. Do NOT go to original airport yet.';
  } else if (arrDelay > 60 || depDelay > 60) {
    bufferMinutes = arrDelay || depDelay; bufferLabel = 'Major Delay'; bufferColor = 'red';
    advice = `Major delay of ${Math.round(arrDelay || depDelay)} minutes. Stay home and wait.`;
  } else if (arrDelay > 20 || depDelay > 20) {
    bufferMinutes = arrDelay || depDelay; bufferLabel = 'Minor Delay'; bufferColor = 'amber';
    advice = `Running ${arrDelay || depDelay} min late. You have some extra time.`;
  } else if (s === 'active' || s === 'enroute') {
    bufferMinutes = 15; bufferLabel = 'In The Air'; bufferColor = 'green';
    advice = 'Flight is airborne and on time. Use the calculator below to plan your departure.';
  } else {
    advice = 'Flight is on schedule. Use the calculator below to know when to leave home.';
  }
  return { bufferMinutes, bufferLabel, bufferColor, advice };
}

// AeroDataBox returns "2024-05-06 14:30+00:00" (space instead of T) — fix to valid ISO 8601
function fixTime(t) { return t ? t.replace(' ', 'T') : null; }

// ── Normalize AeroDataBox response ──────────────────────────────────────────
function normalizeAeroDataBox(f, flightNumber, arrAirport, depAirport, weather) {
  const dep = f.departure || {};
  const arr = f.arrival || {};
  const depInfo = dep.airport || {};
  const arrInfo = arr.airport || {};

  const statusMap = {
    enroute: 'active', scheduled: 'scheduled', landed: 'landed',
    cancelled: 'cancelled', diverted: 'diverted',
    gateclosed: 'scheduled', boarding: 'scheduled', unknown: 'scheduled',
    expected: 'scheduled',
  };
  const rawStatus = (f.status || 'unknown').toLowerCase().replace(/\s/g, '');
  const status = statusMap[rawStatus] || rawStatus;

  const depDelay = dep.delay?.minutes || 0;
  const arrDelay = arr.delay?.minutes || 0;

  return {
    flightNumber: f.number || flightNumber,
    airline: f.airline?.name || 'Unknown Airline',
    airlineIata: f.airline?.iata || '',
    status,
    departure: {
      airport: depInfo.name || 'Unknown',
      iata: depInfo.iata || '',
      city: depAirport?.city || depInfo.municipalityName || '',
      country: depAirport?.country || '',
      scheduled: fixTime(dep.scheduledTimeUtc || dep.scheduledTime?.utc || dep.scheduledTimeLocal || dep.scheduledTime?.local || null),
      estimated: fixTime(dep.estimatedTimeUtc || dep.estimatedTime?.utc || dep.estimatedTimeLocal || dep.estimatedTime?.local || null),
      actual: fixTime(dep.actualTimeUtc || dep.actualTime?.utc || dep.actualTimeLocal || dep.actualTime?.local || null),
      delay: depDelay,
      terminal: dep.terminal || null,
      gate: dep.gate || null,
      lat: depInfo.location?.lat || depAirport?.lat || null,
      lng: depInfo.location?.lon || depAirport?.lng || null,
    },
    arrival: {
      airport: arrInfo.name || 'Unknown',
      iata: arrInfo.iata || '',
      city: arrAirport?.city || arrInfo.municipalityName || '',
      country: arrAirport?.country || '',
      scheduled: fixTime(arr.scheduledTimeUtc || arr.scheduledTime?.utc || arr.scheduledTimeLocal || arr.scheduledTime?.local || null),
      estimated: fixTime(arr.estimatedTimeUtc || arr.estimatedTime?.utc || arr.estimatedTimeLocal || arr.estimatedTime?.local || null),
      actual: fixTime(arr.actualTimeUtc || arr.actualTime?.utc || arr.actualTimeLocal || arr.actualTime?.local || null),
      delay: arrDelay,
      terminal: arr.terminal || null,
      gate: arr.gate || null,
      baggage: arr.baggageBelt || null,
      lat: arrInfo.location?.lat || arrAirport?.lat || null,
      lng: arrInfo.location?.lon || arrAirport?.lng || null,
    },
    aircraft: f.aircraft?.model || f.aircraft?.reg || null,
    live: (() => {
      const loc = f.aircraft?.location;
      if (loc?.lat != null) return {
        latitude: loc.lat,
        longitude: loc.lon ?? loc.lng ?? null,
        altitude: f.aircraft?.altitude?.feet ?? null,
        speed: f.aircraft?.speed?.horizontal ?? null,
        heading: f.aircraft?.heading ?? null,
        updated: new Date().toISOString(),
      };
      return null;
    })(),
    weather,
    buffer: calcBuffer(status, depDelay, arrDelay),
    fetchedAt: new Date().toISOString(),
    source: 'aerodatabox',
  };
}

// ── Normalize AviationStack response ────────────────────────────────────────
function normalizeAviationStack(flight, flightNumber, arrAirport, depAirport, weather) {
  const depDelay = flight.departure?.delay || 0;
  const arrDelay = flight.arrival?.delay || 0;

  return {
    flightNumber: flight.flight?.iata || flightNumber,
    airline: flight.airline?.name || 'Unknown Airline',
    airlineIata: flight.airline?.iata || '',
    status: flight.flight_status || 'unknown',
    departure: {
      airport: flight.departure?.airport || 'Unknown',
      iata: flight.departure?.iata || '',
      city: depAirport?.city || flight.departure?.airport?.split(' ')[0] || '',
      country: depAirport?.country || '',
      scheduled: flight.departure?.scheduled || null,
      estimated: flight.departure?.estimated || null,
      actual: flight.departure?.actual || null,
      delay: depDelay,
      terminal: flight.departure?.terminal || null,
      gate: flight.departure?.gate || null,
      lat: depAirport?.lat || null,
      lng: depAirport?.lng || null,
    },
    arrival: {
      airport: flight.arrival?.airport || 'Unknown',
      iata: flight.arrival?.iata || '',
      city: arrAirport?.city || flight.arrival?.airport?.split(' ')[0] || '',
      country: arrAirport?.country || '',
      scheduled: flight.arrival?.scheduled || null,
      estimated: flight.arrival?.estimated || null,
      actual: flight.arrival?.actual || null,
      delay: arrDelay,
      terminal: flight.arrival?.terminal || null,
      gate: flight.arrival?.gate || null,
      baggage: flight.arrival?.baggage || null,
      lat: arrAirport?.lat || null,
      lng: arrAirport?.lng || null,
    },
    aircraft: flight.aircraft?.iata || null,
    live: flight.live?.latitude ? {
      latitude: flight.live.latitude,
      longitude: flight.live.longitude,
      altitude: flight.live.altitude,
      speed: flight.live.speed_horizontal,
      updated: flight.live.updated,
    } : null,
    weather,
    buffer: calcBuffer(flight.flight_status, depDelay, arrDelay),
    fetchedAt: new Date().toISOString(),
    source: 'aviationstack',
  };
}

// ── API callers ──────────────────────────────────────────────────────────────
async function fetchFromAeroDataBox(flightNumber) {
  const key = process.env.AERODATABOX_API_KEY || process.env.RAPIDAPI_KEY;
  if (!key || key === 'your_aerodatabox_key_here') throw new Error('AeroDataBox key not set');
  const date = new Date().toISOString().split('T')[0];
  const res = await axios.get(
    `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(flightNumber)}/${date}`,
    {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' },
      timeout: 8000,
    }
  );
  if (!res.data || (Array.isArray(res.data) && res.data.length === 0)) throw new Error('No data');
  return Array.isArray(res.data) ? res.data[0] : res.data;
}

async function fetchFromAviationStack(flightNumber) {
  const key = process.env.AVIATIONSTACK_API_KEY;
  if (!key || key === 'AVIATIONSTACK_API_KEY') throw new Error('AviationStack key not set');
  const res = await axios.get('http://api.aviationstack.com/v1/flights', {
    params: { access_key: key, flight_iata: flightNumber, limit: 1 },
    timeout: 8000,
  });
  if (!res.data?.data?.length) throw new Error('No data');
  return res.data.data[0];
}

// ── OpenSky Network live position enrichment (free, no key) ─────────────────
async function enrichWithOpenSky(result, icao24) {
  if (!icao24) return result;
  try {
    const res = await axios.get('https://opensky-network.org/api/states/all', {
      params: { icao24: icao24.toLowerCase() },
      timeout: 5000,
    });
    const s = res.data?.states?.[0];
    // indices: 5=lon, 6=lat, 7=baro_altitude(m), 8=on_ground, 9=velocity(m/s), 10=true_track
    if (!s || s[8] || s[6] == null || s[5] == null) return result;
    result.live = {
      latitude: s[6],
      longitude: s[5],
      altitude: s[7] != null ? Math.round(s[7] * 3.28084) : null, // metres → feet
      speed: s[9] != null ? Math.round(s[9] * 1.94384) : null,    // m/s → knots
      heading: s[10] ?? null,
      updated: new Date().toISOString(),
      source: 'opensky',
    };
    console.log(`[flight] ✈  OpenSky live position found for ${icao24}`);
  } catch (e) {
    console.log(`[flight] OpenSky enrichment failed: ${e.message}`);
  }
  return result;
}

// ── Main fetch with fallback ─────────────────────────────────────────────────
async function fetchFlight(flightNumber) {
  const cacheKey = `flight_${flightNumber}`;
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  let rawFlight = null;
  let source = null;

  // 1️⃣ AeroDataBox first (primary)
  try {
    rawFlight = await fetchFromAeroDataBox(flightNumber);
    source = 'aerodatabox';
    console.log(`[flight] ✅ AeroDataBox — ${flightNumber}`);
  } catch (err) {
    const reason = err.response?.status === 429 ? 'rate limit' : err.message;
    console.log(`[flight] ⚠️  AeroDataBox failed (${reason}) — falling back to AviationStack`);
  }

  // 2️⃣ AviationStack fallback
  if (!rawFlight) {
    try {
      rawFlight = await fetchFromAviationStack(flightNumber);
      source = 'aviationstack';
      console.log(`[flight] ✅ AviationStack — ${flightNumber}`);
    } catch (err) {
      console.log(`[flight] ❌ AviationStack also failed: ${err.message}`);
    }
  }

  if (!rawFlight) throw new Error('Flight not found. Check the flight number and try again.');

  // Enrich with airport + weather
  const arrIata = source === 'aerodatabox'
    ? rawFlight.arrival?.airport?.iata
    : rawFlight.arrival?.iata;
  const depIata = source === 'aerodatabox'
    ? rawFlight.departure?.airport?.iata
    : rawFlight.departure?.iata;

  const [arrAirport, depAirport] = await Promise.all([
    arrIata ? getAirportByIata(arrIata) : null,
    depIata ? getAirportByIata(depIata) : null,
  ]);
  const weather = arrIata
    ? await getWeather(arrAirport?.city || '', arrAirport?.country || '')
    : null;

  let result = source === 'aerodatabox'
    ? normalizeAeroDataBox(rawFlight, flightNumber, arrAirport, depAirport, weather)
    : normalizeAviationStack(rawFlight, flightNumber, arrAirport, depAirport, weather);

  // If no live position yet and flight is airborne, try OpenSky Network (free)
  if (result.live === null && result.status === 'active') {
    const icao24 = source === 'aerodatabox'
      ? rawFlight.aircraft?.modeS || rawFlight.aircraft?.hex || null
      : null;
    result = await enrichWithOpenSky(result, icao24);
  }

  cache.set(cacheKey, result, 60);
  return result;
}

module.exports = { calcBuffer, fetchFlight };
