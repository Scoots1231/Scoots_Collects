const STORAGE_KEY = 'scoots_data';
let data = { starting_cash: 5000, cards: [] };
let activeFilter = 'all';
let editingId = null;

const fmt = n => '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const sportBadge = s => `<span class="badge badge-${s.toLowerCase()}">${s}</span>`;

// ── Persistence ───────────────────────────────────────────────────────────────

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    data = JSON.parse(stored);
  } else {
    fetch('data/cards.json')
      .then(r => r.json())
      .then(d => { data = d; saveData(); render(); })
      .catch(() => { saveData(); render(); });
    return;
  }
  render();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event('scoots-data-updated'));
}

// ── Render ────────────────────────────────────────────────────────────────────

function imgThumb(url, label) {
  if (!url) return '—';
  return `<img src="${url}" alt="${label}" class="card-thumb" data-url="${url}" title="Click to enlarge" />`;
}

function renderRow(c) {
  const pnl = c.status === 'sold' && c.sale_price
    ? Number(c.sale_price) - Number(c.price_paid)
    : null;
  const target = c.target_sell ? fmt(c.target_sell) : fmt(c.price_paid * 1.20);
  const pnlCell = pnl !== null
    ? `<td class="${pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${pnl >= 0 ? '+' : ''}${fmt(pnl)}</td>`
    : '<td>—</td>';

  const hasFront = !!c.image_front;
  const hasBack  = !!c.image_back;
  const imgCell  = (hasFront || hasBack)
    ? `<td class="img-cell">
        ${hasFront ? `<img src="${c.image_front}" class="card-thumb" data-front="${c.image_front}" data-back="${c.image_back || ''}" title="View card images" />` : ''}
      </td>`
    : '<td>—</td>';

  return `<tr data-sport="${c.sport}" data-status="${c.status}">
    <td><strong>${c.name}</strong></td>
    <td>${sportBadge(c.sport)}</td>
    <td>${c.set || '—'}</td>
    <td>${c.condition || '—'}</td>
    <td>${c.purchase_date || '—'}</td>
    <td>${fmt(c.price_paid)}</td>
    <td>${c.current_price ? fmt(c.current_price) : '—'}</td>
    <td>${target}</td>
    <td style="max-width:200px;white-space:normal;font-size:.78rem;color:var(--muted)">${c.thesis || '—'}</td>
    <td style="font-size:.78rem;color:var(--muted)">${c.notes || '—'}</td>
    <td><span class="badge badge-${c.status}">${c.status}</span></td>
    <td>${c.sale_date || '—'}</td>
    <td>${c.sale_price ? fmt(c.sale_price) : '—'}</td>
    <td>${c.sale_site || '—'}</td>
    ${pnlCell}
    ${imgCell}
    <td>
      <button class="btn-delete" data-id="${c.id}" title="Delete card">✕</button>
    </td>
  </tr>`;
}

function render() {
  applyFilter(activeFilter);
}

function applyFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === filter));

  const rows = data.cards.filter(c =>
    filter === 'all'    ? true :
    filter === 'active' ? c.status === 'active' :
    filter === 'sold'   ? c.status === 'sold' :
    c.sport === filter
  );

  const tbody = document.getElementById('cards-tbody');
  tbody.innerHTML = rows.length
    ? rows.map(renderRow).join('')
    : `<tr><td colspan="17" class="table-loading">${
        data.cards.length === 0
          ? 'No cards yet — click "+ Add Card" to get started.'
          : 'No cards match this filter.'
      }</td></tr>`;

  tbody.querySelectorAll('.btn-delete').forEach(btn =>
    btn.addEventListener('click', () => deleteCard(Number(btn.dataset.id)))
  );

  tbody.querySelectorAll('.card-thumb').forEach(img =>
    img.addEventListener('click', () => openLightbox(img.dataset.front, img.dataset.back))
  );
}

// ── Delete ────────────────────────────────────────────────────────────────────

function deleteCard(id) {
  if (!confirm('Delete this card?')) return;
  data.cards = data.cards.filter(c => c.id !== id);
  saveData();
  render();
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

let lbFront = '';
let lbBack  = '';

const lbOverlay  = document.getElementById('lightbox-overlay');
const lbImg      = document.getElementById('lightbox-img');
const lbTabFront = document.getElementById('lb-tab-front');
const lbTabBack  = document.getElementById('lb-tab-back');

function openLightbox(front, back) {
  lbFront = front || '';
  lbBack  = back  || '';
  lbTabFront.classList.toggle('active', true);
  lbTabBack.classList.toggle('active', false);
  lbTabBack.style.display = lbBack ? '' : 'none';
  lbImg.src = lbFront;
  lbOverlay.classList.add('open');
}

lbTabFront.addEventListener('click', () => {
  lbImg.src = lbFront;
  lbTabFront.classList.add('active');
  lbTabBack.classList.remove('active');
});

lbTabBack.addEventListener('click', () => {
  lbImg.src = lbBack;
  lbTabBack.classList.add('active');
  lbTabFront.classList.remove('active');
});

document.getElementById('lightbox-close').addEventListener('click', () => lbOverlay.classList.remove('open'));
lbOverlay.addEventListener('click', e => { if (e.target === lbOverlay) lbOverlay.classList.remove('open'); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') lbOverlay.classList.remove('open');
});

// ── Card Form Modal ───────────────────────────────────────────────────────────

const overlay    = document.getElementById('modal-overlay');
const form       = document.getElementById('card-form');
const statusEl   = document.getElementById('f-status');
const soldFields = document.getElementById('sold-fields');

function openModal(card) {
  editingId = card ? card.id : null;
  document.getElementById('modal-title').textContent = card ? 'Edit Card' : 'Add Card';

  document.getElementById('f-id').value            = card ? card.id : '';
  document.getElementById('f-name').value          = card ? card.name : '';
  document.getElementById('f-sport').value         = card ? card.sport : '';
  document.getElementById('f-set').value           = card ? (card.set || '') : '';
  document.getElementById('f-condition').value     = card ? (card.condition || 'NM') : 'NM';
  document.getElementById('f-purchase-date').value = card ? (card.purchase_date || '') : '';
  document.getElementById('f-price-paid').value    = card ? card.price_paid : '';
  document.getElementById('f-current-price').value = card ? (card.current_price || '') : '';
  document.getElementById('f-target-sell').value   = card ? (card.target_sell || '') : '';
  document.getElementById('f-thesis').value        = card ? (card.thesis || '') : '';
  document.getElementById('f-notes').value         = card ? (card.notes || '') : '';
  document.getElementById('f-image-front').value   = card ? (card.image_front || '') : '';
  document.getElementById('f-image-back').value    = card ? (card.image_back || '') : '';
  document.getElementById('f-status').value        = card ? card.status : 'active';
  document.getElementById('f-sale-date').value     = card ? (card.sale_date || '') : '';
  document.getElementById('f-sale-price').value    = card ? (card.sale_price || '') : '';
  document.getElementById('f-sale-site').value     = card ? (card.sale_site || '') : '';

  soldFields.style.display = (card && card.status === 'sold') ? '' : 'none';
  overlay.classList.add('open');
  document.getElementById('f-name').focus();
}

function closeModal() {
  overlay.classList.remove('open');
  form.reset();
  editingId = null;
}

statusEl.addEventListener('change', () => {
  soldFields.style.display = statusEl.value === 'sold' ? '' : 'none';
});

document.getElementById('btn-add-card').addEventListener('click', () => openModal(null));
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('btn-cancel').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

form.addEventListener('submit', e => {
  e.preventDefault();

  const pricePaid    = parseFloat(document.getElementById('f-price-paid').value)    || 0;
  const currentPrice = parseFloat(document.getElementById('f-current-price').value) || '';
  const targetSell   = parseFloat(document.getElementById('f-target-sell').value)   || '';
  const salePrice    = parseFloat(document.getElementById('f-sale-price').value)    || '';
  const status       = document.getElementById('f-status').value;

  const card = {
    id:            editingId || Date.now(),
    name:          document.getElementById('f-name').value.trim(),
    sport:         document.getElementById('f-sport').value,
    set:           document.getElementById('f-set').value.trim(),
    condition:     document.getElementById('f-condition').value,
    purchase_date: document.getElementById('f-purchase-date').value,
    price_paid:    pricePaid,
    current_price: currentPrice,
    target_sell:   targetSell,
    thesis:        document.getElementById('f-thesis').value.trim(),
    notes:         document.getElementById('f-notes').value.trim(),
    image_front:   document.getElementById('f-image-front').value.trim(),
    image_back:    document.getElementById('f-image-back').value.trim(),
    status,
    sale_date:     status === 'sold' ? document.getElementById('f-sale-date').value : '',
    sale_price:    status === 'sold' ? salePrice : '',
    sale_site:     status === 'sold' ? document.getElementById('f-sale-site').value.trim() : '',
    pnl:           '',
  };

  if (editingId) {
    const idx = data.cards.findIndex(c => c.id === editingId);
    if (idx !== -1) data.cards[idx] = card;
  } else {
    data.cards.push(card);
  }

  saveData();
  render();
  closeModal();
});

// ── Filter buttons ────────────────────────────────────────────────────────────

document.querySelectorAll('.filter-btn').forEach(b =>
  b.addEventListener('click', () => applyFilter(b.dataset.filter))
);

// ── Init ──────────────────────────────────────────────────────────────────────

loadData();
