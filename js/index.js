const STORAGE_KEY = 'scoots_data';

// ── Clock ─────────────────────────────────────────────────────────────────────

function updateClock() {
  const el = document.getElementById('live-datetime');
  if (!el) return;
  el.textContent = new Date().toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}
updateClock();
setInterval(updateClock, 30000);

// ── Dashboard ─────────────────────────────────────────────────────────────────

function populateDashboard(data) {
  const { starting_cash, cards } = data;
  const active = cards.filter(c => c.status === 'active');
  const sold   = cards.filter(c => c.status === 'sold');

  const inventoryWorth   = active.reduce((s, c) => s + (Number(c.current_price) || 0), 0);
  const totalSpentActive = active.reduce((s, c) => s + (Number(c.price_paid)    || 0), 0);
  const totalSpentSold   = sold.reduce((s, c)   => s + (Number(c.price_paid)    || 0), 0);
  const totalProceeds    = sold.reduce((s, c)   => s + (Number(c.sale_price)    || 0), 0);
  const cashOnHand = starting_cash - totalSpentActive - totalSpentSold + totalProceeds;
  const totalPnl   = totalProceeds - totalSpentSold;

  const fmt = n => '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  document.getElementById('stat-inventory').textContent = fmt(inventoryWorth);
  document.getElementById('stat-cash').textContent      = fmt(cashOnHand);
  document.getElementById('stat-card-count').textContent =
    active.length + ' active card' + (active.length !== 1 ? 's' : '');
  document.getElementById('stat-sold-count').textContent =
    sold.length + ' card' + (sold.length !== 1 ? 's' : '') + ' sold';
  document.getElementById('stat-total').textContent = cards.length;

  const pnlEl = document.getElementById('stat-pnl');
  pnlEl.textContent = (totalPnl < 0 ? '-' : '+') + fmt(totalPnl);
  pnlEl.className   = 'stat-value ' + (totalPnl >= 0 ? 'green' : 'red');

  // Sport breakdown
  const sports = {};
  active.forEach(c => {
    if (!sports[c.sport]) sports[c.sport] = { value: 0, count: 0 };
    sports[c.sport].value += Number(c.current_price) || 0;
    sports[c.sport].count++;
  });
  const grid = document.getElementById('sport-grid');
  grid.innerHTML = Object.entries(sports).map(([sport, d]) =>
    `<div class="sport-card" data-sport="${sport}">
      <div class="sport-card-name">${sport}</div>
      <div class="sport-card-value">${fmt(d.value)}</div>
      <div class="sport-card-count">${d.count} active card${d.count !== 1 ? 's' : ''}</div>
    </div>`
  ).join('') || '<p style="color:var(--muted);font-size:.85rem">No active cards yet.</p>';
}

function loadDashboard() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    populateDashboard(JSON.parse(stored));
  } else {
    fetch('data/cards.json')
      .then(r => r.json())
      .then(d => { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); populateDashboard(d); })
      .catch(() => {
        ['stat-inventory','stat-cash','stat-pnl','stat-total'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = '—';
        });
      });
  }
}

loadDashboard();

// Refresh if cards page updated data in the same tab
window.addEventListener('scoots-data-updated', loadDashboard);

// ── ESPN Scores ───────────────────────────────────────────────────────────────

const SPORTS = [
  { league: 'baseball/mlb',   elId: 'scores-mlb' },
  { league: 'basketball/nba', elId: 'scores-nba' },
  { league: 'football/nfl',   elId: 'scores-nfl' },
  { league: 'hockey/nhl',     elId: 'scores-nhl' },
];

function renderScores(events, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!events || !events.length) {
    el.innerHTML = '<div class="scores-empty">No games today</div>';
    return;
  }
  el.innerHTML = events.slice(0, 8).map(ev => {
    const comp = ev.competitions && ev.competitions[0];
    if (!comp) return '';
    const home = comp.competitors.find(t => t.homeAway === 'home');
    const away = comp.competitors.find(t => t.homeAway === 'away');
    const st  = ev.status && ev.status.type;
    const sid = st && st.id;
    const cls = sid === '2' ? 'score-status-live' : sid === '3' ? 'score-status-final' : 'score-status-scheduled';
    const awayN = away ? (away.team.abbreviation || away.team.displayName) : '?';
    const homeN = home ? (home.team.abbreviation || home.team.displayName) : '?';
    const scoreStr = (away && sid !== '1') ? `${away.score} – ${home.score}` : '';
    return `<div class="score-row">
      <div class="score-teams"><span>${awayN} @ ${homeN}</span><span>${scoreStr}</span></div>
      <div class="score-meta"><span class="${cls}">${(st && st.shortDetail) || ''}</span></div>
    </div>`;
  }).join('');
}

function loadScores() {
  SPORTS.forEach(({ league, elId }) => {
    fetch(`https://site.api.espn.com/apis/site/v2/sports/${league}/scoreboard`)
      .then(r => r.json()).then(d => renderScores(d.events, elId))
      .catch(() => {
        const el = document.getElementById(elId);
        if (el) el.innerHTML = '<div class="scores-empty">Scores unavailable</div>';
      });
  });
}

loadScores();
setInterval(loadScores, 60000);
