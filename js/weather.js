/* ===== SlipMenu Weather & Conditions ===== */

const WEATHER_CACHE_KEY = 'sm_weather_v1';
const WEATHER_CACHE_TTL  = 10 * 60 * 1000; // 10 minutes

// In-flight fetch deduplication: key → Promise
const weatherFetchPromises = new Map();

// Intersection Observer instance (replaced on each renderGrid call)
let weatherObserver = null;

// ===== Coordinate Cluster Key =====
function getWeatherKey(lat, lng) {
  return `${Math.round(lat * 100) / 100}_${Math.round(lng * 100) / 100}`;
}

// ===== Session Cache =====
function loadWeatherCache() {
  try {
    return JSON.parse(sessionStorage.getItem(WEATHER_CACHE_KEY) || '{}');
  } catch (_) {
    return {};
  }
}

function getCachedWeather(key) {
  const cache = loadWeatherCache();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > WEATHER_CACHE_TTL) return null;
  return entry;
}

function setCachedWeather(key, data) {
  try {
    const cache = loadWeatherCache();
    cache[key] = { ...data, fetchedAt: Date.now() };
    sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
  } catch (_) {
    // sessionStorage full or unavailable — skip silently
  }
}

// ===== Wind Direction =====
function degreesToCompass(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ===== Tide Parsing =====
// Walk hourly sea_level values to find next local max (High) or min (Low) after now
function parseNextTide(times, seaLevels) {
  if (!times || !seaLevels || times.length < 3) return null;

  const now = Date.now();
  // Find the first index that is >= current time
  let startIdx = 0;
  for (let i = 0; i < times.length; i++) {
    if (new Date(times[i]).getTime() >= now) {
      startIdx = Math.max(0, i - 1);
      break;
    }
  }

  // Search next 18 hours for a local extremum
  const end = Math.min(startIdx + 18, seaLevels.length - 1);
  for (let i = startIdx + 1; i < end; i++) {
    const prev = seaLevels[i - 1];
    const curr = seaLevels[i];
    const next = seaLevels[i + 1];
    if (curr == null || prev == null || next == null) continue;

    if (curr > prev && curr > next) {
      // Local maximum = High tide
      const t = new Date(times[i]);
      return {
        type: 'High',
        time: t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        height_ft: Math.round(curr * 3.281 * 10) / 10, // metres → feet
      };
    }
    if (curr < prev && curr < next) {
      // Local minimum = Low tide
      const t = new Date(times[i]);
      return {
        type: 'Low',
        time: t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        height_ft: Math.round(curr * 3.281 * 10) / 10,
      };
    }
  }
  return null;
}

// ===== API Fetches =====
async function fetchWeatherData(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=mph&temperature_unit=fahrenheit`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.current;
    if (!c) return null;
    return {
      wind_speed:     Math.round(c.wind_speed_10m),
      wind_direction: c.wind_direction_10m,
      air_temp:       Math.round(c.temperature_2m),
    };
  } catch (_) {
    return null;
  }
}

async function fetchMarineData(lat, lng) {
  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=sea_surface_temperature&hourly=sea_level&temperature_unit=fahrenheit&timezone=America%2FNew_York`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const water_temp = data.current && data.current.sea_surface_temperature != null
      ? Math.round(data.current.sea_surface_temperature)
      : null;
    const next_tide = data.hourly
      ? parseNextTide(data.hourly.time, data.hourly.sea_level)
      : null;
    return { water_temp, next_tide };
  } catch (_) {
    return null;
  }
}

async function fetchConditions(lat, lng) {
  const [weatherResult, marineResult] = await Promise.allSettled([
    fetchWeatherData(lat, lng),
    fetchMarineData(lat, lng),
  ]);

  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
  const marine  = marineResult.status  === 'fulfilled' ? marineResult.value  : null;

  // If both failed entirely, return null
  if (!weather && !marine) return null;

  return {
    wind_speed:     weather ? weather.wind_speed     : null,
    wind_direction: weather ? weather.wind_direction : null,
    air_temp:       weather ? weather.air_temp       : null,
    water_temp:     marine  ? marine.water_temp      : null,
    next_tide:      marine  ? marine.next_tide       : null,
  };
}

// Deduplicated fetch: only one in-flight request per coordinate cluster
async function getOrFetchConditions(key, lat, lng) {
  const cached = getCachedWeather(key);
  if (cached) return cached;

  if (weatherFetchPromises.has(key)) {
    return weatherFetchPromises.get(key);
  }

  const promise = fetchConditions(lat, lng).then(data => {
    weatherFetchPromises.delete(key);
    if (data) setCachedWeather(key, data);
    return data;
  });
  weatherFetchPromises.set(key, promise);
  return promise;
}

// ===== Widget HTML =====
function renderWeatherWidget(data) {
  if (!data) {
    return `<span class="weather-error">Conditions unavailable</span>`;
  }

  let windHtml = '';
  if (data.wind_speed != null) {
    const compass = data.wind_direction != null ? ` ${degreesToCompass(data.wind_direction)}` : '';
    windHtml = `
      <div class="weather-stat">
        <span class="weather-stat-label">Wind</span>
        <span class="weather-stat-value">${data.wind_speed} mph${compass}</span>
      </div>`;
  }

  let airHtml = '';
  if (data.air_temp != null) {
    airHtml = `
      <div class="weather-stat">
        <span class="weather-stat-label">Air</span>
        <span class="weather-stat-value">${data.air_temp}°F</span>
      </div>`;
  }

  let waterHtml = '';
  if (data.water_temp != null) {
    waterHtml = `
      <div class="weather-stat">
        <span class="weather-stat-label">Water</span>
        <span class="weather-stat-value">${data.water_temp}°F</span>
      </div>`;
  }

  const statsHtml = windHtml || airHtml || waterHtml
    ? `<div class="weather-conditions">${windHtml}${airHtml}${waterHtml}</div>`
    : '';

  let tideHtml = '';
  if (data.next_tide) {
    const t = data.next_tide;
    tideHtml = `<div class="weather-tide">🌊 Next ${t.type}: ${t.time} (${t.height_ft} ft)</div>`;
  }

  if (!statsHtml && !tideHtml) {
    return `<span class="weather-error">Conditions unavailable</span>`;
  }

  return statsHtml + tideHtml;
}

// ===== Card Loading =====
async function loadWeatherForCard(el, key, lat, lng) {
  const data = await getOrFetchConditions(key, lat, lng);
  el.innerHTML = renderWeatherWidget(data);
}

// ===== Intersection Observer =====
function initWeatherObserver() {
  if (weatherObserver) {
    weatherObserver.disconnect();
    weatherObserver = null;
  }

  const widgets = document.querySelectorAll('.weather-widget[data-weather-key]');
  if (widgets.length === 0) return;

  weatherObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      weatherObserver.unobserve(entry.target);

      const el  = entry.target;
      const key = el.dataset.weatherKey;
      const lat = parseFloat(el.dataset.lat);
      const lng = parseFloat(el.dataset.lng);

      // Check cache first — render immediately if available
      const cached = getCachedWeather(key);
      if (cached) {
        el.innerHTML = renderWeatherWidget(cached);
        return;
      }

      loadWeatherForCard(el, key, lat, lng);
    });
  }, { rootMargin: '200px 0px' });

  widgets.forEach(el => {
    el.innerHTML = '<div class="weather-loading">Fetching conditions...</div>';
    weatherObserver.observe(el);
  });
}
