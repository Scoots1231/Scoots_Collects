let allCards = [];
let activeFilter = 'all';

const fmt = n => '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const sportBadge = s => `<span class="badge badge-${s.toLowerCase()}">${s}</span>`;

function calcPnl(card) {
  if (card.status !== 'sold' || !card.sale_price) return null;
  return Number(card.sale_price) - Number(card.price_paid);
}

function renderRow(card) {
  const pnl = calcPnl(card);
  const targetSell = card.target_sell
    ? fmt(card.target_sell)
    : fmt(card.price_paid * 1.20);

  const pnlCell = pnl !== null
    ? `<td class="${pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${pnl >= 0 ? '+' : ''}${fmt(pnl)}</td>`
    : '<td>—</td>';

  return `
    <tr data-sport="${card.sport}" data-status="${card.status}">
      <td><strong>${card.name}</strong></td>
      <td>${sportBadge(card.sport)}</td>
      <td>${card.set}</td>
      <td>${card.condition}</td>
      <td>${fmt(card.price_paid)}</td>
      <td>${card.current_price ? fmt(card.current_price) : '—'}</td>
      <td>${targetSell}</td>
      <td style="max-width:200px;white-space:normal;font-size:.78rem;color:var(--muted)">${card.thesis || '—'}</td>
      <td style="font-size:.78rem;color:var(--muted)">${card.notes || '—'}</td>
      <td><span class="badge badge-${card.status}">${card.status}</span></td>
      <td>${card.sale_date || '—'}</td>
      <td>${card.sale_price ? fmt(card.sale_price) : '—'}</td>
      <td>${card.sale_site || '—'}</td>
      ${pnlCell}
    </tr>
  `;
}

function applyFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  const tbody = document.getElementById('cards-tbody');
  const filtered = allCards.filter(c => {
    if (filter === 'all')    return true;
    if (filter === 'active') return c.status === 'active';
    if (filter === 'sold')   return c.status === 'sold';
    return c.sport === filter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="14" class="table-loading">No cards match this filter.</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(renderRow).join('');
}

fetch('data/cards.json')
  .then(r => r.json())
  .then(data => {
    allCards = data.cards;
    applyFilter('all');
  })
  .catch(() => {
    document.getElementById('cards-tbody').innerHTML =
      '<tr><td colspan="14" class="table-loading">Failed to load cards.</td></tr>';
  });

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
});
