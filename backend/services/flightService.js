const cache = require('./cache');
const axios = require('axios');
const { getAirportByIata } = require('./airportService');
const { getWeather } = require('./weatherService');

function calcBuffer(flight) {
  const status = (flight.flight_status || '').toLowerCase();
  const depDelay = flight.departure?.delay || 0;
  const arrDelay = flight.arrival?.delay || 0;
  let bufferMinutes = 20, bufferLabel = 'On Schedule', bufferColor = 'blue', advice = '';

  if (status === 'landed') {
    bufferMinutes = 0; bufferLabel = 'Landed'; bufferColor = 'green';
    advice = 'Flight has landed! Head to arrivals — allow 15-20 min for baggage & customs.';
  } else if (status === 'cancelled') {
    bufferMinutes = 0; bufferLabel = 'Cancelled'; bufferColor = 'red';
    advice = 'Flight CANCELLED. Contact the airline immediately for rebooking.';
  } else if (status === 'diverted') {
    bufferMinutes = 0; bufferLabel = 'Diverted'; bufferColor = 'red';
    advice = 'Flight diverted to another airport. Do NOT go to original airport yet.';
  } else if (arrDelay > 60 || depDelay > 60) {
    bufferMinutes = arrDelay || depDelay; bufferLabel = 'Major Delay'; bufferColor = 'red';
    advice = `Major delay of ${Math.round(arrDelay || depDelay)} minutes. Stay home and wait.`;
  } else if (arrDelay > 20 || depDelay > 20) {
    bufferMinutes = arrDelay || depDelay; bufferLabel = 'Minor Delay'; bufferColor = 'amber';
    advice = `Running ${arrDelay || depDelay} min late. You have some extra time.`;
  } else if (status === 'active' || status === 'en-route') {
    bufferMinutes = 15; bufferLabel = 'In The Air'; bufferColor = 'green';
    advice = 'Flight is airborne and on time. Use the calculator below to plan your departure.';
  } else {
    bufferMinutes = 20; bufferLabel = 'On Schedule'; bufferColor = 'blue';
    advice = 'Flight is on schedule. Use the calculator below to know when to leave home.';
  }
  return { bufferMinutes, bufferLabel, bufferColor, advice };
}

async function fetchFlight(flightNumber) {
  const cacheKey = `flight_${flightNumber}`;
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  const response = await axios.get('http://api.aviationstack.com/v1/flights', {
    params: { access_key: process.env.AVIATIONSTACK_API_KEY, flight_iata: flightNumber, limit: 1 }
  });

  const aeroResponse = await axios.get(
  `https://aerodatabox.p.rapidapi.com/flights/number/${flightNumber}/${date}`,
  {
    headers: {
      "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
      "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com"
    }
  }
);

  if (!response.data?.data?.length) throw new Error('Flight not found. Please check the flight number and try again.');

  const flight = response.data.data[0];
  const buffer = calcBuffer(flight);
  const arrIata = flight.arrival?.iata || '';
  const depIata = flight.departure?.iata || '';

  const [arrAirport, depAirport] = await Promise.all([
    arrIata ? getAirportByIata(arrIata) : null,
    depIata ? getAirportByIata(depIata) : null,
  ]);
  const weather = arrIata
    ? await getWeather(
        arrAirport?.city || flight.arrival?.airport?.split(' ')[0] || '',
        arrAirport?.country || ''
      )
    : null;

  const result = {
    flightNumber: flight.flight?.iata || flightNumber,
    airline: flight.airline?.name || 'Unknown Airline',
    airlineIata: flight.airline?.iata || '',
    status: flight.flight_status || 'Unknown',
    departure: {
      airport: flight.departure?.airport || 'Unknown',
      iata: depIata,
      city: depAirport?.city || flight.departure?.airport?.split(' ')[0] || '',
      country: depAirport?.country || '',
      scheduled: flight.departure?.scheduled || null,
      estimated: flight.departure?.estimated || null,
      actual: flight.departure?.actual || null,
      delay: flight.departure?.delay || 0,
      terminal: flight.departure?.terminal || null,
      gate: flight.departure?.gate || null,
      lat: depAirport?.lat || null,
      lng: depAirport?.lng || null,
      photo: depAirport?.photo || null,
    },
    arrival: {
      airport: flight.arrival?.airport || 'Unknown',
      iata: arrIata,
      city: arrAirport?.city || flight.arrival?.airport?.split(' ')[0] || '',
      country: arrAirport?.country || '',
      scheduled: flight.arrival?.scheduled || null,
      estimated: flight.arrival?.estimated || null,
      actual: flight.arrival?.actual || null,
      delay: flight.arrival?.delay || 0,
      terminal: flight.arrival?.terminal || null,
      gate: flight.arrival?.gate || null,
      baggage: flight.arrival?.baggage || null,
      lat: arrAirport?.lat || null,
      lng: arrAirport?.lng || null,
      photo: arrAirport?.photo || null,
    },
    aircraft: flight.aircraft?.iata || null,
    live: flight.live && flight.live.latitude ? {
      latitude: flight.live.latitude,
      longitude: flight.live.longitude,
      altitude: flight.live.altitude,
      speed: flight.live.speed_horizontal,
      updated: flight.live.updated
    } : null,
    weather,
    buffer,
    fetchedAt: new Date().toISOString()
  };

  cache.set(cacheKey, result);
  return result;
}

module.exports = { calcBuffer, fetchFlight };
