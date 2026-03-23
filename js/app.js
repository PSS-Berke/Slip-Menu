/* ===== SlipMenu App ===== */

let allRestaurants = [];
let activeArea = 'all';
let searchQuery = '';

// ===== Data Loading =====
async function loadData() {
  try {
    const response = await fetch('restaurants_boat_access_updated.csv');
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    let restaurants = parsed.data.filter(r => r.Name && r.Name.trim());
    // Apply any admin overrides from localStorage
    try {
      const overrides = JSON.parse(localStorage.getItem('slipMenuOverrides') || '{}');
      restaurants = restaurants.map(r => overrides[r.Name] ? { ...r, ...overrides[r.Name] } : r);
    } catch (e) { /* ignore storage errors */ }
    allRestaurants = restaurants;
    return allRestaurants;
  } catch (e) {
    console.error('Failed to load CSV:', e);
    return [];
  }
}

// ===== Area Helpers =====
function getAreaKey(area) {
  if (!area) return 'other';
  const a = area.toLowerCase();
  if (a.includes('cape coral')) return 'cape-coral';
  if (a.includes('fort myers beach')) return 'fort-myers-beach';
  if (a.includes('fort myers')) return 'fort-myers';
  if (a.includes('pine island')) return 'pine-island';
  if (a.includes('captiva')) return 'captiva';
  return 'other';
}

function getAreaLabel(area) {
  if (!area) return 'Other';
  const a = area.toLowerCase();
  if (a.includes('cape coral')) return 'Cape Coral';
  if (a.includes('fort myers beach')) return 'Fort Myers Beach';
  if (a.includes('fort myers')) return 'Fort Myers';
  if (a.includes('pine island')) return 'Pine Island';
  if (a.includes('captiva')) return 'Captiva';
  return 'Other';
}

// ===== Phone Extraction =====
function getPhone(notes) {
  if (!notes) return null;
  const match = notes.match(/\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/);
  return match ? match[0] : null;
}

function getTextPhone(notes) {
  if (!notes) return null;
  const match = notes.match(/[Tt]ext:\s*(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})/);
  return match ? match[1] : null;
}

// ===== URL Helpers =====
function getWebsite(r) {
  return (r.Website || '').trim() || null;
}

function getMenuUrl(r) {
  return (r['Menu URL'] || '').trim() || null;
}

function getOpenTableUrl(r) {
  return (r['OpenTable URL'] || '').trim() || null;
}

function displayUrl(url) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// ===== Menu Preview =====
function getMenuPreview(menuStr, max = 4) {
  if (!menuStr) return [];
  // Split on semicolons, take items that look like food names (not very long sentences)
  const items = menuStr.split(';').map(s => s.trim()).filter(s => s.length > 0 && s.length < 60);
  // Strip price info for chips
  return items.slice(0, max).map(item => item.replace(/\s*\$[\d.]+\s*/g, '').trim());
}

// ===== Filtering =====
function getFiltered() {
  return allRestaurants.filter(r => {
    const areaMatch = activeArea === 'all' || getAreaKey(r.Area) === activeArea;
    if (!areaMatch) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.Name || '').toLowerCase().includes(q) ||
      (r.Location || '').toLowerCase().includes(q) ||
      (r.Area || '').toLowerCase().includes(q) ||
      (r['Menu Items with Price'] || '').toLowerCase().includes(q) ||
      (r.Notes || '').toLowerCase().includes(q)
    );
  });
}

// ===== Card Rendering =====
function renderCard(r, index) {
  const areaKey = getAreaKey(r.Area);
  const areaLabel = getAreaLabel(r.Area);
  const menuItems = getMenuPreview(r['Menu Items with Price']);

  const menuChips = menuItems.length > 0
    ? `<div class="menu-preview">
        <strong>Menu Highlights</strong>
        <div class="menu-items-preview">
          ${menuItems.map(item => `<span class="menu-chip">${escapeHtml(item)}</span>`).join('')}
        </div>
      </div>`
    : '';

  const slips = r['Slip Count'] ? r['Slip Count'] : 'Info available';
  const phone = getPhone(r.Notes);
  const menuUrl = getMenuUrl(r);
  const website = getWebsite(r);

  const coords = typeof RESTAURANT_COORDS !== 'undefined' ? RESTAURANT_COORDS[r.Name] : null;
  const weatherKey = coords ? getWeatherKey(coords[0], coords[1]) : 'none';
  const weatherWidget = coords
    ? `<div class="weather-widget" data-weather-key="${weatherKey}" data-lat="${coords[0]}" data-lng="${coords[1]}"></div>`
    : '';

  return `
    <article class="card">
      <div class="card-header">
        <div class="card-badges">
          <span class="badge badge-area ${areaKey}">${escapeHtml(areaLabel)}</span>
        </div>
        <h2 class="card-name">${escapeHtml(r.Name)}</h2>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <div class="card-meta-row">
            <span class="icon">📍</span>
            <span>${escapeHtml(r.Location || 'Location varies')}</span>
          </div>
          <div class="card-meta-row">
            <span class="icon">⚓</span>
            <span>${escapeHtml(slips)} slips</span>
          </div>
          ${phone ? `<div class="card-meta-row">
            <span class="icon">📞</span>
            <a href="tel:${phone.replace(/\D/g, '')}" style="color:var(--ocean)">${escapeHtml(phone)}</a>
          </div>` : ''}
        </div>
        ${menuChips}
        ${weatherWidget}
      </div>
      <div class="card-footer">
        ${menuUrl ? `<a href="${menuUrl}" target="_blank" rel="noopener" class="btn-menu">View Menu</a>` : (website ? `<a href="${website}" target="_blank" rel="noopener" class="btn-menu">Visit Website</a>` : '')}
        <a href="restaurant.html?id=${index}" class="btn-details">
          View Details <span>→</span>
        </a>
      </div>
    </article>
  `;
}

// ===== Grid Rendering =====
function renderGrid() {
  const grid = document.getElementById('restaurant-grid');
  const resultsInfo = document.getElementById('results-info');
  if (!grid) return;

  const filtered = getFiltered();

  if (resultsInfo) {
    resultsInfo.textContent = filtered.length === allRestaurants.length
      ? `${filtered.length} restaurants`
      : `${filtered.length} of ${allRestaurants.length} restaurants`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <div class="empty-icon">⚓</div>
        <h3>No results found</h3>
        <p>Try adjusting your search or filter.</p>
      </div>
    `;
    return;
  }

  // Map filtered items back to original indices for correct detail links
  grid.innerHTML = filtered.map(r => {
    const index = allRestaurants.indexOf(r);
    return renderCard(r, index);
  }).join('');

  if (typeof initWeatherObserver === 'function') initWeatherObserver();
}

// ===== Filter Tabs =====
function initFilterTabs() {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeArea = tab.dataset.area;
      renderGrid();
    });
  });
}

// ===== Search =====
function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', () => {
    searchQuery = input.value.trim();
    renderGrid();
  });
}

// ===== Detail Page =====
async function initDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'), 10);

  await loadData();

  const container = document.getElementById('detail-content');
  if (!container) return;

  if (isNaN(id) || id < 0 || id >= allRestaurants.length) {
    container.innerHTML = `<p>Restaurant not found. <a href="index.html">Go back</a></p>`;
    return;
  }

  const r = allRestaurants[id];
  const areaKey = getAreaKey(r.Area);
  const areaLabel = getAreaLabel(r.Area);
  const phone = getPhone(r.Notes);
  const textPhone = getTextPhone(r.Notes);
  const website = getWebsite(r);
  const menuUrl = getMenuUrl(r);
  const openTableUrl = getOpenTableUrl(r);

  // Parse menu items
  const menuItems = (r['Menu Items with Price'] || '')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Parse notes into sentences/chunks
  const notes = (r.Notes || '').split(';').map(s => s.trim()).filter(s => s.length > 0);

  // Set page title
  document.title = `${r.Name} — SlipMenu`;

  const detailCoords = typeof RESTAURANT_COORDS !== 'undefined' ? RESTAURANT_COORDS[r.Name] : null;
  const detailWeatherKey = detailCoords ? getWeatherKey(detailCoords[0], detailCoords[1]) : 'none';
  const detailWeatherSection = detailCoords ? `
    <div class="detail-weather-section">
      <div class="detail-section-title">🌊 Current Conditions</div>
      <div class="weather-widget" data-weather-key="${detailWeatherKey}" data-lat="${detailCoords[0]}" data-lng="${detailCoords[1]}">
        <div class="weather-loading">Fetching conditions...</div>
      </div>
    </div>` : '';

  container.innerHTML = `
    <div class="detail-card">
      <div class="detail-card-header">
        <span class="badge badge-area ${areaKey}" style="margin-bottom:0.75rem;display:inline-block;">${escapeHtml(areaLabel)}</span>
        <h1 class="detail-name">${escapeHtml(r.Name)}</h1>
        <div class="detail-location">
          <span>📍</span>
          <span>${escapeHtml(r.Location || 'See notes for location details')}</span>
        </div>
        ${phone ? `<div class="detail-location" style="margin-top:0.4rem;">
          <span>📞</span>
          <a href="tel:${phone.replace(/\D/g, '')}" style="color:rgba(255,255,255,0.9);text-decoration:underline;">${escapeHtml(phone)}</a>
        </div>` : ''}
        ${textPhone ? `<div class="detail-location" style="margin-top:0.4rem;">
          <span>💬</span>
          <a href="sms:${textPhone.replace(/\D/g, '')}" style="color:rgba(255,255,255,0.9);text-decoration:underline;">Text: ${escapeHtml(textPhone)}</a>
        </div>` : ''}
        ${(website || menuUrl || openTableUrl) ? `<div class="detail-links">
          ${website ? `<a href="${website}" target="_blank" rel="noopener" class="detail-link-btn detail-link-website">🌐 Website</a>` : ''}
          ${menuUrl ? `<a href="${menuUrl}" target="_blank" rel="noopener" class="detail-link-btn detail-link-menu">🍽 View Menu</a>` : ''}
          ${openTableUrl ? `<a href="${openTableUrl}" target="_blank" rel="noopener" class="detail-link-btn detail-link-opentable">📅 OpenTable</a>` : ''}
        </div>` : ''}
      </div>
      ${detailWeatherSection}
      <div class="detail-body">

        <div class="detail-section">
          <div class="detail-section-title">⚓ Slip / Dock Access</div>
          <div class="detail-slip-box">${escapeHtml(r['Slip Count'] || 'See notes for details')}</div>
        </div>

        ${menuItems.length > 0 ? `
        <div class="detail-section">
          <div class="detail-section-title">🍽 Menu</div>
          <div class="menu-list">
            ${menuItems.map(item => `<span class="menu-tag">${escapeHtml(item)}</span>`).join('')}
          </div>
        </div>
        ` : ''}

        ${notes.length > 0 ? `
        <div class="detail-section">
          <div class="detail-section-title">ℹ Info & Hours</div>
          <div class="notes-box">
            ${notes.map(n => `<p>${escapeHtml(n)}</p>`).join('')}
          </div>
        </div>
        ` : ''}


      </div>
    </div>
  `;

  // Eagerly fetch weather for the single detail page restaurant
  if (detailCoords && typeof loadWeatherForCard === 'function') {
    const widgetEl = container.querySelector('.weather-widget');
    if (widgetEl) {
      loadWeatherForCard(widgetEl, detailWeatherKey, detailCoords[0], detailCoords[1]);
    }
  }
}

// ===== Map Page — Leaflet Map =====
let leafletMap = null;

const AREA_MARKER_COLORS = {
  'cape-coral':       '#1e6091',
  'fort-myers-beach': '#9d174d',
  'fort-myers':       '#5b21b6',
  'pine-island':      '#065f46',
  'captiva':          '#92400e',
  'other':            '#374151',
};

function initLeafletMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') return;

  leafletMap = L.map('map', { zoomControl: true }).setView([26.56, -81.98], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(leafletMap);

  allRestaurants.forEach((r, index) => {
    const coords = RESTAURANT_COORDS[r.Name];
    if (!coords) return;

    const areaKey = getAreaKey(r.Area);
    const color = AREA_MARKER_COLORS[areaKey] || AREA_MARKER_COLORS.other;
    const phone = getPhone(r.Notes);
    const slips = r['Slip Count'] || 'See details';
    const areaLabel = getAreaLabel(r.Area);

    const marker = L.circleMarker(coords, {
      radius: 9,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    }).addTo(leafletMap);

    const phoneHtml = phone
      ? `<div style="margin-top:4px;font-size:12px;">📞 <a href="tel:${phone.replace(/\D/g,'')}" style="color:${color}">${phone}</a></div>`
      : '';

    marker.bindPopup(`
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:180px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${color};margin-bottom:4px;">${areaLabel}</div>
        <div style="font-size:14px;font-weight:700;color:#0a2342;margin-bottom:4px;line-height:1.3;">${r.Name}</div>
        <div style="font-size:12px;color:#6c757d;margin-bottom:2px;">⚓ ${slips}</div>
        ${phoneHtml}
        <a href="restaurant.html?id=${index}" style="display:inline-block;margin-top:8px;font-size:12px;font-weight:600;color:${color};">View Details →</a>
      </div>
    `, { maxWidth: 240 });
  });
}

// ===== Map Page — Area Counts =====
function renderAreaCards() {
  const container = document.getElementById('area-cards');
  if (!container) return;

  const areas = [
    { key: 'cape-coral',       label: 'Cape Coral' },
    { key: 'fort-myers-beach', label: 'Fort Myers Beach' },
    { key: 'fort-myers',       label: 'Fort Myers' },
    { key: 'pine-island',      label: 'Pine Island' },
    { key: 'captiva',          label: 'Captiva' },
  ];

  container.innerHTML = areas.map(area => {
    const count = allRestaurants.filter(r => getAreaKey(r.Area) === area.key).length;
    const view = typeof AREA_VIEWS !== 'undefined' ? AREA_VIEWS[area.key] : null;
    return `
      <div class="area-card" data-area-key="${area.key}"
           data-lat="${view ? view[0] : ''}"
           data-lng="${view ? view[1] : ''}"
           data-zoom="${view ? view[2] : ''}">
        <div class="area-name">${area.label}</div>
        <div class="area-count">${count} restaurant${count !== 1 ? 's' : ''}</div>
      </div>
    `;
  }).join('');

  // FlyTo on click
  container.querySelectorAll('.area-card').forEach(card => {
    card.addEventListener('click', () => {
      const lat = parseFloat(card.dataset.lat);
      const lng = parseFloat(card.dataset.lng);
      const zoom = parseInt(card.dataset.zoom, 10);
      if (leafletMap && lat && lng) {
        leafletMap.flyTo([lat, lng], zoom, { duration: 1.2 });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

// ===== Utility =====
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ===== Page Init =====
async function initIndexPage() {
  document.getElementById('restaurant-grid').innerHTML = '<div class="loading">Loading restaurants...</div>';
  await loadData();

  // Check for ?area= param from map page links
  const params = new URLSearchParams(window.location.search);
  const areaParam = params.get('area');
  if (areaParam) {
    activeArea = areaParam;
    const tab = document.querySelector(`.filter-tab[data-area="${areaParam}"]`);
    if (tab) {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    }
  }

  initFilterTabs();
  initSearch();
  renderGrid();
}

async function initMapPage() {
  await loadData();
  initLeafletMap();
  renderAreaCards();
}

// Route to correct init
const page = document.body.dataset.page;
if (page === 'index') initIndexPage();
if (page === 'detail') initDetailPage();
if (page === 'map') initMapPage();
