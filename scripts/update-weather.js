"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DATA_FILES = ["data-part-1.js", "data-part-2.js", "data-part-3.js", "data-part-4.js"];
const OUTPUT_FILE = "weather.json";
const FORECAST_DAYS = 16;
const MAX_AGE_AFTER_KICKOFF_MS = 6 * 60 * 60 * 1000;

const CITY_COORDS = {
  "cidade do mexico": { name: "Cidade do México", latitude: 19.3029, longitude: -99.1505 },
  "guadalajara": { name: "Guadalajara", latitude: 20.7366, longitude: -103.3845 },
  "toronto": { name: "Toronto", latitude: 43.6332, longitude: -79.4186 },
  "los angeles": { name: "Los Angeles", latitude: 33.9535, longitude: -118.3392 },
  "santa clara": { name: "Santa Clara", latitude: 37.4030, longitude: -121.9700 },
  "east rutherford": { name: "East Rutherford", latitude: 40.8135, longitude: -74.0745 },
  "foxborough": { name: "Foxborough", latitude: 42.0909, longitude: -71.2643 },
  "vancouver": { name: "Vancouver", latitude: 49.2767, longitude: -123.1119 },
  "houston": { name: "Houston", latitude: 29.6847, longitude: -95.4107 },
  "arlington": { name: "Arlington", latitude: 32.7473, longitude: -97.0945 },
  "philadelphia": { name: "Philadelphia", latitude: 39.9008, longitude: -75.1675 },
  "monterrey": { name: "Monterrey", latitude: 25.6680, longitude: -100.2440 },
  "atlanta": { name: "Atlanta", latitude: 33.7554, longitude: -84.4009 },
  "seattle": { name: "Seattle", latitude: 47.5952, longitude: -122.3316 },
  "miami": { name: "Miami", latitude: 25.9580, longitude: -80.2389 },
  "kansas city": { name: "Kansas City", latitude: 39.0490, longitude: -94.4840 }
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readPart(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/WC2026_PARTS\.push\((.*)\);?\s*$/s);
  if (!match) throw new Error(`Formato inesperado em ${file}`);
  return JSON.parse(match[1]);
}

function readGames() {
  return DATA_FILES.flatMap(file => readPart(path.join(process.cwd(), file))).map(row => ({
    num: row[0],
    date: row[1],
    time: row[2],
    match: row[3],
    venue: row[8]
  }));
}

function cityFromVenue(venue) {
  const parts = String(venue || "").split(",").map(part => part.trim()).filter(Boolean);
  const city = parts.length ? parts[parts.length - 1] : "";
  return CITY_COORDS[normalize(city)] || null;
}

function kickoffUtc(game) {
  const date = new Date(`${game.date}T${game.time}:00+01:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hourKeyUtc(date) {
  return date.toISOString().slice(0, 13) + ":00";
}

function weatherInfo(code) {
  const map = {
    0: ["☀️", "Céu limpo"],
    1: ["🌤️", "Pouco nublado"],
    2: ["⛅", "Parcialmente nublado"],
    3: ["☁️", "Nublado"],
    45: ["🌫️", "Nevoeiro"],
    48: ["🌫️", "Nevoeiro com gelo"],
    51: ["🌦️", "Chuvisco fraco"],
    53: ["🌦️", "Chuvisco"],
    55: ["🌦️", "Chuvisco forte"],
    61: ["🌧️", "Chuva fraca"],
    63: ["🌧️", "Chuva"],
    65: ["🌧️", "Chuva forte"],
    71: ["❄️", "Neve fraca"],
    73: ["❄️", "Neve"],
    75: ["❄️", "Neve forte"],
    80: ["🌦️", "Aguaceiros fracos"],
    81: ["🌦️", "Aguaceiros"],
    82: ["🌧️", "Aguaceiros fortes"],
    95: ["⛈️", "Trovoada"],
    96: ["⛈️", "Trovoada com granizo"],
    99: ["⛈️", "Trovoada forte"]
  };
  const entry = map[Number(code)] || ["🌡️", "Previsão disponível"];
  return { icon: entry[0], description: entry[1] };
}

function nearestIndex(times, target) {
  const wanted = hourKeyUtc(target);
  const exact = times.indexOf(wanted);
  if (exact >= 0) return exact;

  let bestIndex = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i += 1) {
    const value = new Date(times[i] + ":00Z");
    const diff = Math.abs(value.getTime() - target.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  }
  return bestDiff <= 90 * 60 * 1000 ? bestIndex : -1;
}

async function fetchForecast(city) {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    hourly: "temperature_2m,precipitation_probability,weather_code,wind_speed_10m",
    forecast_days: String(FORECAST_DAYS),
    timezone: "GMT",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm"
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const response = await fetch(url, { headers: { "accept": "application/json" } });
  if (!response.ok) throw new Error(`Open-Meteo ${response.status} em ${city.name}`);
  return response.json();
}

async function main() {
  const now = new Date();
  const maxForecastTime = new Date(now.getTime() + FORECAST_DAYS * 24 * 60 * 60 * 1000);
  const games = readGames();
  const forecastsByCity = new Map();
  const matches = {};

  for (const game of games) {
    const kickoff = kickoffUtc(game);
    const city = cityFromVenue(game.venue);

    if (!kickoff || !city) continue;
    if (kickoff.getTime() < now.getTime() - MAX_AGE_AFTER_KICKOFF_MS) continue;
    if (kickoff.getTime() > maxForecastTime.getTime()) continue;

    const cityKey = normalize(city.name);
    if (!forecastsByCity.has(cityKey)) {
      try {
        forecastsByCity.set(cityKey, await fetchForecast(city));
      } catch (error) {
        console.warn(error.message);
        continue;
      }
    }

    const forecast = forecastsByCity.get(cityKey);
    const hourly = forecast.hourly || {};
    const index = nearestIndex(hourly.time || [], kickoff);
    if (index < 0) continue;

    const code = hourly.weather_code?.[index];
    const info = weatherInfo(code);

    matches[String(game.num)] = {
      available: true,
      source: "Open-Meteo",
      city: city.name,
      venue: game.venue,
      kickoffUtc: kickoff.toISOString(),
      forecastHourUtc: `${hourly.time[index]}:00Z`,
      temperatureC: hourly.temperature_2m?.[index] ?? null,
      precipitationProbability: hourly.precipitation_probability?.[index] ?? null,
      windKmh: hourly.wind_speed_10m?.[index] ?? null,
      weatherCode: code ?? null,
      icon: info.icon,
      description: info.description
    };
  }

  const output = {
    provider: "Open-Meteo",
    status: "ok",
    generatedAt: now.toISOString(),
    forecastDays: FORECAST_DAYS,
    message: "Previsão meteorológica disponível apenas para jogos dentro da janela de previsão Open-Meteo.",
    matches
  };

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Open-Meteo: previsão criada para ${Object.keys(matches).length} jogo(s).`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
