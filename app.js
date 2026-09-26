/**
 * SmartRoute Maharashtra - Main Application Logic
 * Demo / Sample data only. Not live traffic or fares.
 */

document.addEventListener('DOMContentLoaded', () => {
  initGraph();
  initCommon();
  const page = document.body.dataset.page;
  if (page === 'home') initHome();
  if (page === 'plan') initPlan();
  if (page === 'network') initNetwork();
  if (page === 'dsa') initDSA();
  if (page === 'transport') initTransport();
});

function initCommon() {
  // Mobile menu
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  // Highlight active nav
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

/* ========== HOME ========== */
function initHome() {
  const fromInput = document.getElementById('from-input');
  const toInput = document.getElementById('to-input');
  const findBtn = document.getElementById('find-btn');
  const swapBtn = document.getElementById('swap-btn');

  setupAutocomplete(fromInput, 'from-ac');
  setupAutocomplete(toInput, 'to-ac');

  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const t = fromInput.value;
      fromInput.value = toInput.value;
      toInput.value = t;
    });
  }

  if (findBtn) {
    findBtn.addEventListener('click', () => {
      const from = fromInput.value.trim();
      const to = toInput.value.trim();
      if (!from || !to) {
        alert('Please enter both From and To locations.');
        return;
      }
      if (!graph || !graph.getStationByName(from)) {
        alert('Starting location not found in demo dataset.\nTry: Pune Railway Station, Swargate, Shivajinagar, etc.');
        return;
      }
      if (!graph.getStationByName(to)) {
        alert('Destination not found in demo dataset.\nTry: VIT Pune, Katraj, Hinjawadi, PCMC, etc.');
        return;
      }
      try {
        sessionStorage.setItem('sr_from', from);
        sessionStorage.setItem('sr_to', to);
      } catch (e) {}
      // Use URL params so it always works
      window.location.href = 'plan.html?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to);
    });
  }

  // Quick chips
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const name = chip.dataset.loc;
      if (!fromInput.value) {
        fromInput.value = name;
      } else if (!toInput.value) {
        toInput.value = name;
      } else {
        toInput.value = name;
      }
    });
  });
}

function setupAutocomplete(input, acId) {
  if (!input) return;
  let ac = document.getElementById(acId);
  if (!ac) {
    ac = document.createElement('div');
    ac.id = acId;
    ac.className = 'autocomplete';
    input.parentElement.appendChild(ac);
  }

  let activeIdx = -1;

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (q.length < 1) {
      ac.classList.remove('show');
      return;
    }
    const results = graph.searchStations(q, 8);
    if (results.length === 0) {
      ac.innerHTML = '<div class="autocomplete-item">No match in demo data</div>';
    } else {
      ac.innerHTML = results.map((s, i) =>
        `<div class="autocomplete-item" data-name="${s.name}">${s.name} <span class="text-muted" style="font-size:0.8em">(${s.area})</span></div>`
      ).join('');
    }
    ac.classList.add('show');
    activeIdx = -1;

    ac.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        input.value = item.dataset.name || item.textContent;
        ac.classList.remove('show');
      });
    });
  });

  input.addEventListener('keydown', (e) => {
    const items = ac.querySelectorAll('.autocomplete-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      items.forEach((it, i) => it.classList.toggle('active', i === activeIdx));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
      items.forEach((it, i) => it.classList.toggle('active', i === activeIdx));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      input.value = items[activeIdx].dataset.name || items[activeIdx].textContent;
      ac.classList.remove('show');
    } else if (e.key === 'Escape') {
      ac.classList.remove('show');
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !ac.contains(e.target)) {
      ac.classList.remove('show');
    }
  });
}

/* ========== PLAN ROUTE ========== */
let currentRoutes = [];
let currentSummary = null;
let selectedRouteIdx = 0;

function initPlan() {
  // Read from URL first (most reliable), then sessionStorage, then defaults
  const params = new URLSearchParams(window.location.search);
  let from = params.get('from') || '';
  let to = params.get('to') || '';
  try {
    if (!from) from = sessionStorage.getItem('sr_from') || '';
    if (!to) to = sessionStorage.getItem('sr_to') || '';
  } catch (e) {}
  if (!from) from = 'Pune Railway Station';
  if (!to) to = 'VIT Pune';

  const fromEl = document.getElementById('plan-from');
  const toEl = document.getElementById('plan-to');
  if (fromEl) fromEl.textContent = from;
  if (toEl) toEl.textContent = to;

  // Filters
  document.getElementById('apply-filters')?.addEventListener('click', () => runSearch(from, to));
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filterByTab(tab.dataset.tab);
    });
  });

  // Run search with visible error handling
  try {
    if (!graph) {
      throw new Error('Graph not initialized. Check that js/data.js and js/graph.js are loaded.');
    }
    runSearch(from, to);
  } catch (err) {
    console.error(err);
    const list = document.getElementById('route-list');
    if (list) {
      list.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>
        <p><strong>Error loading routes</strong></p>
        <p class="text-muted">${err.message}</p>
        <p class="text-muted mt-1">Open browser Console (F12) for details.</p></div>`;
    }
  }
}

function getFilterOptions() {
  const modes = [];
  document.querySelectorAll('.filter-check input:checked').forEach(cb => {
    modes.push(cb.value);
  });
  const maxFare = parseFloat(document.getElementById('max-fare')?.value) || Infinity;
  const maxTime = parseFloat(document.getElementById('max-time')?.value) || Infinity;
  const maxTrans = parseFloat(document.getElementById('max-transfers')?.value);
  return {
    allowModes: modes.length ? modes : null,
    maxTransfers: isNaN(maxTrans) ? Infinity : maxTrans,
    maxFare,
    maxTime
  };
}

function runSearch(from, to) {
  const opts = getFilterOptions();
  let all = [];
  try {
    all = graph.findAllRoutes(from, to, opts) || [];
  } catch (e) {
    console.error('findAllRoutes error:', e);
    all = [];
  }

  // Apply fare/time filters post-hoc
  currentRoutes = all.filter(r =>
    r.totalFare <= (opts.maxFare || Infinity) &&
    r.totalTime <= (opts.maxTime || Infinity) &&
    r.transfers <= (opts.maxTransfers ?? Infinity)
  );

  currentSummary = graph.getSummary(currentRoutes);
  selectedRouteIdx = 0;

  renderSummary();
  renderRouteList(currentRoutes);
  renderComparisonTable(currentRoutes);

  if (currentRoutes.length > 0) {
    renderRouteDetails(currentRoutes[0]);
  } else {
    const details = document.getElementById('route-details');
    if (details) {
      details.innerHTML = `
        <div class="empty-state">
          <div class="icon">🗺️</div>
          <p>No routes found with current filters.<br>Try relaxing filters or different locations.</p>
          <p class="text-muted mt-1" style="font-size:0.85rem">From: <strong>${from}</strong> → To: <strong>${to}</strong></p>
          <p class="text-muted" style="font-size:0.85rem">Demo dataset covers major Pune & PCMC corridors.</p>
        </div>`;
    }
  }
}

function renderSummary() {
  const s = currentSummary;
  const el = document.getElementById('summary-metrics');
  if (!el) return;
  if (!s || !currentRoutes.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `
    <div class="metric-card highlight">
      <div class="label">Shortest Distance</div>
      <div class="value">${s.shortest.totalDistance} km</div>
    </div>
    <div class="metric-card highlight">
      <div class="label">Fastest</div>
      <div class="value">${s.fastest.totalTime} min</div>
    </div>
    <div class="metric-card highlight">
      <div class="label">Cheapest</div>
      <div class="value">₹${s.cheapest.totalFare}</div>
    </div>
    <div class="metric-card highlight">
      <div class="label">Min Transfers</div>
      <div class="value">${s.minTransfers.transfers}</div>
    </div>
  `;
}

function filterByTab(tab) {
  let list = [...currentRoutes];
  if (tab === 'distance' && currentSummary?.shortest) {
    list = [currentSummary.shortest, ...currentRoutes.filter(r => r !== currentSummary.shortest)];
  } else if (tab === 'time' && currentSummary?.fastest) {
    list = [currentSummary.fastest, ...currentRoutes.filter(r => r !== currentSummary.fastest)];
  } else if (tab === 'fare' && currentSummary?.cheapest) {
    list = [currentSummary.cheapest, ...currentRoutes.filter(r => r !== currentSummary.cheapest)];
  } else if (tab === 'transfers' && currentSummary?.minTransfers) {
    list = [currentSummary.minTransfers, ...currentRoutes.filter(r => r !== currentSummary.minTransfers)];
  }
  renderRouteList(list);
  if (list.length) {
    selectedRouteIdx = 0;
    renderRouteDetails(list[0]);
  }
}

function renderRouteList(routes) {
  const el = document.getElementById('route-list');
  if (!el) return;
  if (!routes.length) {
    el.innerHTML = '<div class="empty-state"><p>No routes to display.</p></div>';
    return;
  }

  el.innerHTML = routes.map((r, i) => {
    const badge = getRouteBadge(r);
    const pathHtml = r.steps.map((s, si) => {
      const icon = MODE_INFO[s.mode]?.icon || '•';
      return `
        <div class="route-step">
          <span>${si === 0 ? r.pathStations[0] : ''}</span>
        </div>
        <div class="route-step">
          <span class="mode-icon">${icon}</span>
          <span class="arrow">↓ ${s.mode}</span>
          <strong>${s.to}</strong>
        </div>`;
    }).join('');

    // Cleaner path display
    let pathStr = r.pathStations[0];
    r.steps.forEach(s => {
      const icon = MODE_INFO[s.mode]?.icon || '';
      pathStr += `<br><span class="arrow">↓ ${icon} ${s.mode}</span><br><strong>${s.to}</strong>`;
    });

    return `
      <div class="route-card ${i === selectedRouteIdx ? 'selected' : ''}" data-idx="${i}" onclick="selectRoute(${i})">
        <div class="route-header">
          <div class="route-title">Route ${i + 1}</div>
          ${badge ? `<span class="route-badge">${badge}</span>` : ''}
        </div>
        <div class="route-path">${pathStr}</div>
        <div class="route-stats">
          <span>📏 <strong>${r.totalDistance} km</strong></span>
          <span>⏱️ <strong>${r.totalTime} min</strong></span>
          <span>💰 <strong>₹${r.totalFare}</strong></span>
          <span>🔄 <strong>${r.transfers} transfer${r.transfers !== 1 ? 's' : ''}</strong></span>
        </div>
        <button class="btn btn-sm btn-outline mt-1" onclick="event.stopPropagation(); selectRoute(${i})">View Details</button>
      </div>`;
  }).join('');
}

function getRouteBadge(r) {
  if (!currentSummary) return '';
  if (r === currentSummary.shortest) return 'Shortest';
  if (r === currentSummary.fastest) return 'Fastest';
  if (r === currentSummary.cheapest) return 'Cheapest';
  if (r === currentSummary.minTransfers) return 'Min Transfers';
  return '';
}

window.selectRoute = function(idx) {
  selectedRouteIdx = idx;
  const cards = document.querySelectorAll('.route-card');
  cards.forEach((c, i) => c.classList.toggle('selected', i === idx));
  // Find actual route from current displayed list or original
  const listEl = document.getElementById('route-list');
  const card = listEl?.querySelector(`[data-idx="${idx}"]`);
  // Use currentRoutes for simplicity; tab reorders display only
  const route = currentRoutes[idx] || currentRoutes[0];
  if (route) renderRouteDetails(route);
};

function renderRouteDetails(route) {
  const el = document.getElementById('route-details');
  if (!el || !route) return;

  let stepsHtml = '';
  route.steps.forEach((s, i) => {
    const icon = MODE_INFO[s.mode]?.icon || '';
    const color = MODE_INFO[s.mode]?.color || '#666';
    stepsHtml += `
      <div class="step-block">
        <div class="step-num">${i + 1}</div>
        <div class="step-content">
          <h4>${s.from}</h4>
          <div class="mode-pill" style="background:${color}18;color:${color}">
            ${icon} ${s.mode}${s.routeNumber && s.routeNumber !== 'Auto' && s.routeNumber !== 'Cab' && s.routeNumber !== 'Walk' ? ' · ' + s.routeNumber : ''}
          </div>
          <div class="step-meta">
            <span>📏 ${s.distance} km</span>
            <span>⏱️ ${s.time} min</span>
            <span>💰 ₹${s.fare} <small>(estimated)</small></span>
          </div>
          ${s.stops && s.stops.length > 2 ? `<p class="text-muted mt-1" style="font-size:0.8rem">Stops: ${s.stops.join(' → ')}</p>` : ''}
          <p class="mt-1" style="font-size:0.9rem">→ <strong>${s.to}</strong></p>
        </div>
      </div>`;
  });

  el.innerHTML = `
    <h3 style="margin-bottom:1rem">Route Details</h3>
    ${stepsHtml}
    <div style="border-top:2px solid var(--border);padding-top:1rem;margin-top:0.5rem">
      <strong>TOTAL</strong>
      <div class="route-stats" style="border:none;padding:0.5rem 0 0">
        <span>📏 <strong>${route.totalDistance} km</strong></span>
        <span>⏱️ <strong>${route.totalTime} min</strong></span>
        <span>💰 <strong>₹${route.totalFare}</strong> <small class="text-muted">(estimated)</small></span>
        <span>🔄 <strong>${route.transfers} transfer${route.transfers !== 1 ? 's' : ''}</strong></span>
      </div>
      <p class="text-muted mt-1" style="font-size:0.8rem">All values are from sample/demo dataset for academic demonstration.</p>
    </div>
  `;
}

function renderComparisonTable(routes) {
  const el = document.getElementById('comparison-table');
  if (!el) return;
  if (!routes.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th data-sort="idx">Route</th>
            <th data-sort="distance">Distance</th>
            <th data-sort="time">Time</th>
            <th data-sort="fare">Fare</th>
            <th data-sort="transfers">Transfers</th>
            <th>Transport</th>
          </tr>
        </thead>
        <tbody>
          ${routes.map((r, i) => `
            <tr>
              <td>Route ${i + 1}</td>
              <td>${r.totalDistance} km</td>
              <td>${r.totalTime} min</td>
              <td>₹${r.totalFare}</td>
              <td>${r.transfers}</td>
              <td>${r.modes.map(m => (MODE_INFO[m]?.icon || '') + ' ' + m).join(' + ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <p class="text-muted mt-1" style="font-size:0.8rem">Click column headers conceptually to sort (demo). Values are estimated from static demo data.</p>
  `;
}

/* ========== NETWORK ========== */
function initNetwork() {
  const grid = document.getElementById('network-grid');
  const detail = document.getElementById('station-detail');
  if (!grid) return;

  const stations = STATIONS.filter(s =>
    ['major', 'hub', 'metro', 'landmark'].includes(s.type)
  );

  grid.innerHTML = stations.map(s => `
    <div class="station-node ${s.type}" data-id="${s.id}" onclick="showStation('${s.id}')">
      <div class="name">${s.name}</div>
      <div class="area">${s.area}</div>
    </div>
  `).join('');

  window.showStation = function(id) {
    const s = graph.stations.get(id);
    if (!s) return;
    document.querySelectorAll('.station-node').forEach(n => n.classList.remove('active'));
    document.querySelector(`.station-node[data-id="${id}"]`)?.classList.add('active');

    const neighbors = graph.getNeighbors(id);
    let connHtml = neighbors.length === 0
      ? '<p class="text-muted">No outbound connections in demo data.</p>'
      : neighbors.map(n => {
          const dest = graph.stations.get(n.to);
          const icon = MODE_INFO[n.edge.mode]?.icon || '';
          return `
            <div style="padding:0.5rem 0;border-bottom:1px solid var(--border);font-size:0.9rem">
              ${icon} <strong>${n.edge.mode}</strong> → ${dest?.name || n.to}
              <br><span class="text-muted">${n.edge.distance} km · ${n.edge.time} min · ₹${n.edge.fare} (est.)</span>
              ${n.edge.routeNumber ? `<br><span class="text-muted">Route: ${n.edge.routeNumber}</span>` : ''}
            </div>`;
        }).join('');

    detail.innerHTML = `
      <h3>${s.name}</h3>
      <p class="text-muted">${s.area} · ${s.type}</p>
      <h4 class="mt-2" style="font-size:0.95rem">Connected Routes (${neighbors.length})</h4>
      ${connHtml}
      <p class="text-muted mt-2" style="font-size:0.8rem">Sample demo data. Not live schedules.</p>
    `;
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
}

/* ========== DSA ========== */
function initDSA() {
  // Interactive mini graph explanation is static in HTML
}

/* ========== TRANSPORT ========== */
function initTransport() {
  // Static content mostly
}
