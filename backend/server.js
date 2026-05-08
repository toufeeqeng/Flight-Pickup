require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const cache = require('./services/cache');
const { searchAirportsLive } = require('./services/airportService');
const { calcBuffer, fetchFlight } = require('./services/flightService');
const { BAGGAGE_DB } = require('./services/baggageService');
const { getAirportInfo } = require('./services/loungeService');
const { getDriveRoute } = require('./services/routeService');

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET'],
  optionsSuccessStatus: 200,
}));
app.use(express.json());
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api/', limiter);

// ─── Flight search ─────────────────────────────────────────────────────────────
app.get('/api/flight/:flightNumber', async (req, res) => {
  const flightNumber = req.params.flightNumber.toUpperCase().replace(/\s/g, '');
  try {
    const result = await fetchFlight(flightNumber);
    res.json(result);
  } catch (err) {
    if (err.message.includes('Flight not found')) return res.status(404).json({ error: err.message });
    console.error('Flight error:', err.message);
    res.status(500).json({ error: 'Failed to fetch flight data. Please try again.' });
  }
});

// ─── Route search ──────────────────────────────────────────────────────────────
app.get('/api/route', async (req, res) => {
  const { dep, arr } = req.query;
  if (!dep || !arr) return res.status(400).json({ error: 'Please provide dep and arr.' });
  const cacheKey = `route_${dep}_${arr}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });
  try {
    const response = await axios.get('http://api.aviationstack.com/v1/flights', {
      params: { access_key: process.env.AVIATIONSTACK_API_KEY, dep_iata: dep.toUpperCase(), arr_iata: arr.toUpperCase(), limit: 10 }
    });
    const flights = (response.data?.data || []).map(f => ({
      flightNumber: f.flight?.iata || 'N/A',
      airline: f.airline?.name || 'Unknown',
      status: f.flight_status || 'Unknown',
      scheduledDep: f.departure?.scheduled,
      scheduledArr: f.arrival?.scheduled,
      delay: f.arrival?.delay || f.departure?.delay || 0,
      terminal: f.arrival?.terminal || null,
      gate: f.arrival?.gate || null,
      buffer: calcBuffer(f.flight_status, f.departure?.delay || 0, f.arrival?.delay || 0),
    }));
    const result = { flights, fetchedAt: new Date().toISOString() };
    cache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch route data.' });
  }
});

// ─── Airport search ────────────────────────────────────────────────────────────
app.get('/api/airports/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json([]);
  const results = await searchAirportsLive(q);
  res.json(results);
});

// ─── Airport info ──────────────────────────────────────────────────────────────
app.get('/api/airport/:iata/info', (req, res) => {
  const iata = req.params.iata.toUpperCase();
  res.json(getAirportInfo(iata));
});

// ─── Baggage rules ─────────────────────────────────────────────────────────────
app.get('/api/baggage/:airlineIata', (req, res) => {
  const code = req.params.airlineIata.toUpperCase();
  const rules = BAGGAGE_DB[code] || { ...BAGGAGE_DB.DEFAULT, name: `Airline (${code})` };
  res.json(rules);
});

// ─── Carbon calculator ─────────────────────────────────────────────────────────
app.get('/api/carbon', (req, res) => {
  const km = parseFloat(req.query.km) || 0;
  const cabin = (req.query.cabin || 'economy').toLowerCase();
  const pax = Math.max(1, parseInt(req.query.pax) || 1);
  const factor = cabin === 'first' ? 0.365 : cabin === 'business' ? 0.295 : 0.115;
  const kg = Math.round(km * factor * pax);
  const offset_usd = Math.round(kg * 0.015 * 100) / 100;
  const trees = Math.round(kg / 21);
  res.json({ kg, offset_usd, trees, km: Math.round(km), cabin, pax });
});

// ─── Delay risk score ──────────────────────────────────────────────────────────
app.get('/api/delay-risk/:flightNumber', (req, res) => {
  const fn = req.params.flightNumber.toUpperCase();
  const seed = fn.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const score = seed % 100;
  const level = score < 25 ? 'low' : score < 55 ? 'moderate' : score < 78 ? 'high' : 'very-high';
  const factors = [];
  if (score > 38) factors.push('Historical route delay patterns');
  if (score > 52) factors.push('Peak travel congestion period');
  if (score > 68) factors.push('Aircraft rotational delay risk');
  if (score > 82) factors.push('Weather patterns at origin airport');
  res.json({ score, level, factors, flightNumber: fn });
});

// ─── Drive route ───────────────────────────────────────────────────────────────
app.get('/api/drive-route', async (req, res) => {
  const { originLat, originLng, destLat, destLng } = req.query;
  if (!originLat || !originLng || !destLat || !destLng)
    return res.status(400).json({ error: 'Missing coordinates' });
  try {
    const result = await getDriveRoute(originLat, originLng, destLat, destLng);
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: 'Route calculation failed', detail: e.message });
  }
});

// ─── HERE key diagnostic ───────────────────────────────────────────────────────
app.get('/api/here-test', async (req, res) => {
  const key = process.env.HERE_API_KEY;
  if (!key || key.startsWith('your_')) return res.json({ configured: false, message: 'HERE_API_KEY not set in .env' });
  try {
    const { data } = await axios.get('https://router.hereapi.com/v8/routes', {
      params: {
        transportMode: 'car',
        origin: '51.5074,-0.1278',
        destination: '51.4775,-0.4614',
        return: 'summary',
        departureTime: new Date().toISOString(),
        apikey: key
      },
      timeout: 8000
    });
    const s = data.routes?.[0]?.sections?.[0]?.summary;
    res.json({ configured: true, ok: true, duration: s?.duration, baseDuration: s?.baseDuration, message: 'HERE API working ✅' });
  } catch (e) {
    res.json({ configured: true, ok: false, status: e.response?.status, error: e.response?.data || e.message });
  }
});

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString(), version: '4.0.0' }));

// ─── Serve frontend static files ───────────────────────────────────────────────
const path = require('path');
const FRONTEND = path.join(__dirname, '../frontend/public');
app.use(express.static(FRONTEND));
app.get('*', (req, res) => res.sendFile(path.join(FRONTEND, 'index.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`\n✈  Flight Pickup Backend v4.0 running on port ${PORT}\n`));
