import { useState, useEffect } from 'react';

// Open-Meteo — completely free, no API key, no rate limits for personal use
// Docs: https://open-meteo.com/en/docs

const CITY_COORDS = {
  'Europe/Brussels':    { lat: 50.85, lon: 4.35,  label: 'Brussels' },
  'Europe/Berlin':      { lat: 50.11, lon: 8.68,  label: 'Frankfurt' },
  'America/Vancouver':  { lat: 49.25, lon: -123.12, label: 'Vancouver' },
};

const WMO_CODES = {
  0: { label: 'Clear',        emoji: '☀️' },
  1: { label: 'Mostly clear', emoji: '🌤️' },
  2: { label: 'Partly cloudy',emoji: '⛅' },
  3: { label: 'Overcast',     emoji: '☁️' },
  45:{ label: 'Foggy',        emoji: '🌫️' },
  48:{ label: 'Icy fog',      emoji: '🌫️' },
  51:{ label: 'Light drizzle',emoji: '🌦️' },
  53:{ label: 'Drizzle',      emoji: '🌦️' },
  55:{ label: 'Heavy drizzle',emoji: '🌧️' },
  61:{ label: 'Light rain',   emoji: '🌧️' },
  63:{ label: 'Rain',         emoji: '🌧️' },
  65:{ label: 'Heavy rain',   emoji: '🌧️' },
  71:{ label: 'Light snow',   emoji: '🌨️' },
  73:{ label: 'Snow',         emoji: '❄️' },
  80:{ label: 'Showers',      emoji: '🌦️' },
  95:{ label: 'Thunderstorm', emoji: '⛈️' },
};

// Cache in module scope so multiple cards sharing the same city don't re-fetch
const cache = {};

export function useWeather(timezone, dateStr) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!timezone || !dateStr) { setLoading(false); return; }

    const coords = CITY_COORDS[timezone];
    if (!coords) { setLoading(false); return; }

    const cacheKey = `${coords.lat},${coords.lon}`;

    async function fetchWeather() {
      try {
        let forecast;
        if (cache[cacheKey]) {
          forecast = cache[cacheKey];
        } else {
          const url = `https://api.open-meteo.com/v1/forecast?` +
            `latitude=${coords.lat}&longitude=${coords.lon}` +
            `&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max` +
            `&timezone=${encodeURIComponent(timezone)}` +
            `&forecast_days=16`;
          const res = await fetch(url);
          forecast = await res.json();
          cache[cacheKey] = forecast;
        }

        const { daily } = forecast;
        const idx = daily.time.indexOf(dateStr);

        if (idx === -1) {
          // Date outside forecast window — show seasonal average for July Belgium
          setData({
            hi: timezone === 'America/Vancouver' ? 22 : 24,
            lo: timezone === 'America/Vancouver' ? 14 : 15,
            code: 1,
            precip: 30,
            seasonal: true,
            city: coords.label,
          });
        } else {
          const code = daily.weathercode[idx];
          setData({
            hi: Math.round(daily.temperature_2m_max[idx]),
            lo: Math.round(daily.temperature_2m_min[idx]),
            code,
            precip: daily.precipitation_probability_max[idx],
            seasonal: false,
            city: coords.label,
          });
        }
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, [timezone, dateStr]);

  const wmo = data ? (WMO_CODES[data.code] ?? WMO_CODES[0]) : null;
  return { weather: data, wmo, loading };
}
