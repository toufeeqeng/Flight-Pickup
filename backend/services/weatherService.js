const cache = require('./cache');
const axios = require('axios');

const IMPERIAL_COUNTRIES = new Set(['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA']);

function usesImperial(country) {
  return IMPERIAL_COUNTRIES.has((country || '').toUpperCase().trim());
}

async function getWeather(city, country) {
  if (!process.env.OPENWEATHER_API_KEY || !city) return null;
  const imperial = usesImperial(country);
  const units = imperial ? 'imperial' : 'metric';
  const cacheKey = `wx_${city}_${units}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  try {
    const res = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: country ? `${city},${country}` : city,
        appid: process.env.OPENWEATHER_API_KEY,
        units
      }
    });
    const d = res.data;
    const result = {
      temp: Math.round(d.main.temp),
      feels: Math.round(d.main.feels_like),
      desc: d.weather[0].description,
      icon: d.weather[0].icon,
      humidity: d.main.humidity,
      wind: imperial
        ? Math.round(d.wind.speed)        // imperial: already mph
        : Math.round(d.wind.speed * 3.6), // metric: m/s → km/h
      rain: d.rain ? Math.round((d.rain['1h'] || 0) * 10) / 10 : 0,
      visibility: Math.round((d.visibility || 10000) / 1000),
      unit: imperial ? 'imperial' : 'metric'
    };
    cache.set(cacheKey, result, 1800);
    return result;
  } catch (e) {
    return null;
  }
}

module.exports = { getWeather };
