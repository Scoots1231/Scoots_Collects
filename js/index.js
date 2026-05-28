// Live clock
function updateClock() {
  const el = document.getElementById('live-datetime');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}
updateClock();
setInterval(updateClock, 30000);

// Load card data and populate dashboard
fetch('data/cards.json')
  .then(r => r.json())
  .then(data => {
    const { starting_cash, cards } = data;
    const active = cards.filter(c => c.status === 'active');
    const sold   = cards.filter(c => c.status === 'sold');

    const inventoryWorth = active.reduce((s, c) => s + (c.current_price || 0), 0);
    const totalSpentActive = active.reduce((s, c) => s + (c.price_paid || 0), 0);
    const totalSpentSold   = sold.reduce((s, c) => s + (c.price_paid || 0), 0);
    const totalProceeds    = sold.reduce((s, c) => s + (c.sale_price || 0), 0);
    const cashOnHand = starting_cash - totalSpentActive - totalSpentSold + totalProceeds;
    const totalPnl = totalProceeds - totalSpentSold;

    const fmt = n => '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    const pnlEl = document.getElementById('stat-pnl');
    pnlEl.textContent = (totalPnl < 0 ? '-' : '+') + fmt(totalPnl);
    pnlEl.className = 'stat-value ' + (totalPnl >= 0 ? 'green' : 'red');

    document.getElementById('stat-inventory').textContent = fmt(inventoryWorth);
    document.getElementById('stat-cash').textContent = fmt(cashOnHand);
    document.getElementById('stat-card-count').textContent = active.length + ' active card' + (active.length !== 1 ? 's' : '');
    document.getElementById('stat-sold-count').textContent = sold.length + ' card' + (sold.length !== 1 ? 's' : '') + ' sold';
    document.getElementById('stat-total').textContent = cards.length;

    // Sport breakdown
    const sports = {};
    active.forEach(c => {
      const s = c.sport;
      if (!sports[s]) sports[s] = { value: 0, count: 0 };
      sports[s].value += c.current_price || 0;
      sports[s].count++;
    });

    const grid = document.getElementById('sport-grid');
    if (Object.keys(sports).length === 0) {
      grid.innerHTML = '<p style="color:var(--muted);font-size:.85rem">No active cards.</p>';
    } else {
      grid.innerHTML = Object.entries(sports).map(([sport, d]) => `
        <div class="sport-card" data-sport="${sport}">
          <div class="sport-card-name">${sport}</div>
          <div class="sport-card-value">${fmt(d.value)}</div>
          <div class="sport-card-count">${d.count} active card${d.count !== 1 ? 's' : ''}</div>
        </div>
      `).join('');
    }
  })
  .catch(() => {
    ['stat-inventory','stat-cash','stat-pnl','stat-total'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
  });

// ESPN scores
const ESPN_SPORTS = [
  { key: 'mlb',  league: 'baseball/mlb',     elId: 'scores-mlb' },
  { key: 'nba',  league: 'basketball/nba',   elId: 'scores-nba' },
  { key: 'nfl',  league: 'football/nfl',     elId: 'scores-nfl' },
  { key: 'nhl',  league: 'hockey/nhl',       elId: 'scores-nhl' },
];

function renderScores(events, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!events || events.length === 0) {
    el.innerHTML = '<div class="scores-empty">No games today</div>';
    return;
  }
  el.innerHTML = events.slice(0, 8).map(ev => {
    const comp = ev.competitions && ev.competitions[0];
    if (!comp) return '';
    const home = comp.competitors.find(t => t.homeAway === 'home');
    const away = comp.competitors.find(t => t.homeAway === 'away');
    const st = ev.status && ev.status.type;
    const stateId = st && st.id;
    let statusClass = 'score-status-scheduled';
    let statusText = st && st.shortDetail || '';
    if (stateId === '2') { statusClass = 'score-status-live'; }
    else if (stateId === '3') { statusClass = 'score-status-final'; }

    const awayName  = away  ? (away.team.abbreviation  || away.team.displayName)  : '?';
    const homeName  = home  ? (home.team.abbreviation  || home.team.displayName)  : '?';
    const awayScore = away  && stateId !== '1' ? away.score  : '';
    const homeScore = home  && stateId !== '1' ? home.score  : '';
    const scoreStr  = awayScore !== '' ? `${awayScore} – ${homeScore}` : '';

    return `
      <div class="score-row">
        <div class="score-teams">
          <span>${awayName} @ ${homeName}</span>
          <span>${scoreStr}</span>
        </div>
        <div class="score-meta"><span class="${statusClass}">${statusText}</span></div>
      </div>
    `;
  }).join('');
}

function loadScores() {
  ESPN_SPORTS.forEach(({ league, elId }) => {
    fetch(`https://site.api.espn.com/apis/site/v2/sports/${league}/scoreboard`)
      .then(r => r.json())
      .then(d => renderScores(d.events, elId))
      .catch(() => {
        const el = document.getElementById(elId);
        if (el) el.innerHTML = '<div class="scores-empty">Scores unavailable</div>';
      });
  });
}

loadScores();
setInterval(loadScores, 60000);
