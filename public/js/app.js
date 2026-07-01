import API from './api.js';

const state = {
  items: [],
  movements: [],
  metrics: null,
  editingItem: null,
  activePanel: 'overview',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function formatDate(value) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(value) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function showToast(message, isError = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('is-error', isError);
  toast.classList.add('is-visible');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function openModal(id) {
  $(`#${id}`).classList.add('is-open');
}

function closeModal(id) {
  $(`#${id}`).classList.remove('is-open');
}

function switchPanel(panelId) {
  state.activePanel = panelId;
  $$('.dash-panel').forEach((p) => p.classList.remove('is-active'));
  $(`#panel-${panelId}`)?.classList.add('is-active');
  $$('.dash-nav-item[data-panel]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.panel === panelId);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function loadMetrics() {
  const { data } = await API.getMetrics();
  state.metrics = data;
  $('#metric-total-items').textContent = data.total_items;
  $('#metric-low-stock').textContent = data.low_stock_count;

  const inStock = Math.max(0, data.total_items - data.low_stock_count);
  $('#metric-in-stock').textContent = inStock;
}

function countMovementsToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return state.movements.filter((m) => new Date(m.created_at) >= today).length;
}

function renderMovementChart() {
  const chart = $('#movement-chart');
  if (!chart) return;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }

  const counts = days.map((day) => {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    return state.movements.filter((m) => {
      const t = new Date(m.created_at);
      return t >= day && t < next;
    }).length;
  });

  const max = Math.max(...counts, 1);
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  chart.innerHTML = counts
    .map((count, i) => {
      const height = Math.max(8, (count / max) * 140);
      const alt = i % 2 === 1 ? ' is-alt' : '';
      const dayLabel = labels[days[i].getDay()];
      return `
        <div class="dash-chart-bar-wrap">
          <div class="dash-chart-bar${alt}" style="height:${height}px" title="${count} movements"></div>
          <span class="dash-chart-label">${dayLabel}</span>
        </div>
      `;
    })
    .join('');
}

function renderLowStockList() {
  const list = $('#low-stock-list');
  if (!list) return;

  const lowItems = state.items.filter((i) => i.current_stock <= i.min_stock_level);

  if (!lowItems.length) {
    list.innerHTML = '<div class="dash-empty">No low-stock items</div>';
    return;
  }

  list.innerHTML = lowItems
    .slice(0, 5)
    .map(
      (item) => `
      <div class="dash-reminder-item">
        <div>
          <div class="dash-reminder-name">${escapeHtml(item.name)}</div>
          <div class="dash-reminder-meta">${escapeHtml(item.sku)} · ${item.current_stock} / ${item.min_stock_level} min</div>
        </div>
        <span class="dash-reminder-badge">Low stock</span>
      </div>
    `
    )
    .join('');
}

function renderRecentMovements() {
  const list = $('#recent-movements-list');
  if (!list) return;

  if (!state.movements.length) {
    list.innerHTML = '<div class="dash-empty">No movements yet</div>';
    return;
  }

  list.innerHTML = state.movements
    .slice(0, 4)
    .map((m) => {
      const sign = m.quantity > 0 ? '+' : '';
      return `
        <div class="dash-reminder-item">
          <div>
            <div class="dash-reminder-name">${escapeHtml(m.item?.name || 'Item')}</div>
            <div class="dash-reminder-meta">${m.type} · ${formatShortDate(m.created_at)}</div>
          </div>
          <span class="dash-reminder-badge dash-badge-accent">${sign}${m.quantity}</span>
        </div>
      `;
    })
    .join('');
}

function updateOverviewWidgets() {
  $('#metric-movements-today').textContent = countMovementsToday();
  renderMovementChart();
  renderLowStockList();
  renderRecentMovements();
}

async function loadItems() {
  const search = ($('#filter-search')?.value || $('#global-search')?.value || '').trim();
  const category = $('#filter-category')?.value.trim() || '';
  const lowStock = $('#filter-low-stock')?.checked || false;

  const { data } = await API.getItems({
    search: search || undefined,
    category: category || undefined,
    low_stock: lowStock || undefined,
  });

  state.items = data;
  renderItems();
  populateMovementItemSelect();
  renderLowStockList();
}

function renderItems() {
  const grid = $('#items-grid');
  const empty = $('#items-empty');
  if (!grid) return;

  if (!state.items.length) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }

  empty?.classList.add('hidden');
  grid.innerHTML = state.items
    .map((item) => {
      const isLow = item.current_stock <= item.min_stock_level;
      return `
        <article class="dash-item-card ${isLow ? 'is-low' : ''}">
          <div class="dash-item-top">
            <span class="dash-item-sku">${escapeHtml(item.sku)}</span>
            ${isLow ? '<span class="dash-reminder-badge">Low stock</span>' : ''}
          </div>
          <h3 class="dash-item-name">${escapeHtml(item.name)}</h3>
          <p class="dash-item-cat">${escapeHtml(item.category)}</p>
          <div class="dash-item-stats">
            <div class="dash-item-stat">
              <span class="dash-item-stat-label">Stock</span>
              <span class="dash-item-stat-val">${item.current_stock}</span>
            </div>
            <div class="dash-item-stat">
              <span class="dash-item-stat-label">Min level</span>
              <span class="dash-item-stat-val">${item.min_stock_level}</span>
            </div>
          </div>
          <div class="dash-item-actions">
            <button class="dash-btn dash-btn-primary" data-action="movement" data-id="${item.id}" type="button">Log</button>
            <button class="dash-btn dash-btn-outline" data-action="edit" data-id="${item.id}" type="button">Edit</button>
            <button class="dash-btn dash-btn-outline" data-action="delete" data-id="${item.id}" type="button" style="color:#b42318">Del</button>
          </div>
        </article>
      `;
    })
    .join('');
}

async function loadMovements() {
  const itemId = $('#movement-filter-item')?.value || '';
  const { data, pagination } = await API.getMovements({
    item_id: itemId || undefined,
    page: 1,
    limit: 50,
  });

  state.movements = data;
  const countEl = $('#movements-count');
  if (countEl) countEl.textContent = `${pagination.total} total entries`;
  renderMovements();
  updateOverviewWidgets();
}

function renderMovements() {
  const tbody = $('#movements-body');
  const empty = $('#movements-empty');
  if (!tbody) return;

  if (!state.movements.length) {
    tbody.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }

  empty?.classList.add('hidden');
  tbody.innerHTML = state.movements
    .map((m) => {
      const pill =
        m.type === 'IN' ? 'dash-pill-in' : m.type === 'OUT' ? 'dash-pill-out' : 'dash-pill-adj';
      const qtyClass = m.quantity >= 0 ? 'qty-pos' : 'qty-neg';
      const sign = m.quantity > 0 ? '+' : '';
      return `
        <tr>
          <td>${formatDate(m.created_at)}</td>
          <td>${escapeHtml(m.item?.name || m.item_id)}</td>
          <td><span class="dash-pill ${pill}">${m.type}</span></td>
          <td class="${qtyClass}">${sign}${m.quantity}</td>
          <td>${escapeHtml(m.reason)}</td>
        </tr>
      `;
    })
    .join('');
}

function populateMovementItemSelect() {
  ['#movement-item', '#movement-filter-item'].forEach((sel) => {
    const el = $(sel);
    if (!el) return;
    const current = el.value;
    const isFilter = sel.includes('filter');
    el.innerHTML =
      (isFilter ? '<option value="">All items</option>' : '<option value="">Select item</option>') +
      state.items
        .map(
          (item) =>
            `<option value="${item.id}">${escapeHtml(item.sku)} — ${escapeHtml(item.name)}</option>`
        )
        .join('');
    if (current) el.value = current;
  });
}

function resetItemForm() {
  state.editingItem = null;
  $('#item-form').reset();
  $('#item-modal-title').textContent = 'Add inventory item';
  $('#item-modal-sub').textContent = 'Create a catalog entry. Stock starts at zero until movements are logged.';
}

function fillItemForm(item) {
  state.editingItem = item;
  $('#item-modal-title').textContent = 'Edit inventory item';
  $('#item-modal-sub').textContent = 'Update catalog details. Stock levels are managed through movements.';
  $('#item-sku').value = item.sku;
  $('#item-sku').disabled = true;
  $('#item-name').value = item.name;
  $('#item-category').value = item.category;
  $('#item-description').value = item.description || '';
  $('#item-min').value = item.min_stock_level;
}

async function handleItemSubmit(e) {
  e.preventDefault();
  const body = {
    sku: $('#item-sku').value.trim(),
    name: $('#item-name').value.trim(),
    category: $('#item-category').value.trim(),
    description: $('#item-description').value.trim() || null,
    min_stock_level: Number($('#item-min').value) || 5,
  };

  try {
    if (state.editingItem) {
      delete body.sku;
      await API.updateItem(state.editingItem.id, body);
      showToast('Item updated successfully');
    } else {
      await API.createItem(body);
      showToast('Item created successfully');
    }
    closeModal('item-modal');
    resetItemForm();
    await refreshAll();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function handleMovementSubmit(e) {
  e.preventDefault();
  const body = {
    item_id: $('#movement-item').value,
    type: $('#movement-type').value,
    quantity: Number($('#movement-qty').value),
    reason: $('#movement-reason').value.trim(),
  };

  try {
    await API.createMovement(body);
    showToast('Movement logged and stock updated');
    closeModal('movement-modal');
    $('#movement-form').reset();
    await refreshAll();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function refreshAll() {
  await Promise.all([loadMetrics(), loadItems(), loadMovements()]);
}

function openAddItem() {
  resetItemForm();
  $('#item-sku').disabled = false;
  openModal('item-modal');
}

function resetImportForm() {
  $('#import-form')?.reset();
  $('#import-file-label').textContent = 'Choose an Excel file';
  $('#import-submit').disabled = true;
  $('#import-results').classList.add('hidden');
  $('#import-results').innerHTML = '';
}

function openImportModal() {
  resetImportForm();
  openModal('import-modal');
}

function setImportFile(file) {
  const label = $('#import-file-label');
  const submit = $('#import-submit');

  if (!file) {
    label.textContent = 'Choose an Excel file';
    submit.disabled = true;
    return;
  }

  label.textContent = file.name;
  submit.disabled = false;
}

function renderImportResults(result) {
  const container = $('#import-results');
  const { created_count: createdCount, failed_count: failedCount, errors = [] } = result.data;

  let html = `<p class="import-results-summary">${escapeHtml(result.message)}</p>`;

  if (failedCount > 0) {
    html += '<ul class="import-results-errors">';
    errors.slice(0, 8).forEach((error) => {
      html += `<li>Row ${error.row} (${escapeHtml(error.sku)}): ${escapeHtml(error.message)}</li>`;
    });
    if (errors.length > 8) {
      html += `<li>…and ${errors.length - 8} more issue${errors.length - 8 === 1 ? '' : 's'}</li>`;
    }
    html += '</ul>';
  }

  container.innerHTML = html;
  container.classList.remove('hidden');
}

async function handleImportSubmit(e) {
  e.preventDefault();

  const fileInput = $('#import-file');
  const file = fileInput?.files?.[0];
  if (!file) {
    showToast('Choose an Excel file first', true);
    return;
  }

  const submit = $('#import-submit');
  submit.disabled = true;
  submit.textContent = 'Uploading…';

  try {
    const result = await API.importItems(file);
    renderImportResults(result);

    if (result.data.created_count > 0) {
      showToast(result.message);
      await refreshAll();
    } else {
      showToast('No products were added. Check the issues listed below.', true);
    }
  } catch (err) {
    showToast(err.message, true);
  } finally {
    submit.disabled = !fileInput?.files?.length;
    submit.textContent = 'Upload products';
  }
}

async function logout() {
  try {
    await API.logout();
    window.location.href = '/login?next=/dashboard';
  } catch (err) {
    showToast(err.message, true);
  }
}

function bindEvents() {
  $$('.dash-nav-item[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
  });

  $$('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.goto));
  });

  $('#btn-add-item')?.addEventListener('click', openAddItem);
  $('#btn-add-item-2')?.addEventListener('click', openAddItem);
  $('#btn-add-item-3')?.addEventListener('click', openAddItem);

  $('#btn-import-items')?.addEventListener('click', openImportModal);
  $('#btn-import-items-2')?.addEventListener('click', openImportModal);
  $('#btn-import-items-3')?.addEventListener('click', openImportModal);
  $('#btn-download-template')?.addEventListener('click', () => API.downloadImportTemplate());

  $('#import-file')?.addEventListener('change', (e) => {
    setImportFile(e.target.files?.[0] ?? null);
  });

  const dropzone = $('#import-dropzone');
  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('is-dragover');
  });
  dropzone?.addEventListener('dragleave', () => {
    dropzone.classList.remove('is-dragover');
  });
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const fileInput = $('#import-file');
    if (fileInput) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      fileInput.files = transfer.files;
    }
    setImportFile(file);
  });

  $('#import-form')?.addEventListener('submit', handleImportSubmit);

  const openMovement = () => openModal('movement-modal');
  $('#btn-log-movement')?.addEventListener('click', openMovement);
  $('#btn-log-movement-2')?.addEventListener('click', openMovement);
  $('#btn-log-movement-3')?.addEventListener('click', openMovement);

  $('#btn-logout')?.addEventListener('click', logout);
  $('#btn-logout-sidebar')?.addEventListener('click', logout);

  $('#btn-low-stock-alert')?.addEventListener('click', () => {
    switchPanel('inventory');
    $('#filter-low-stock').checked = true;
    loadItems();
  });

  $('#global-search')?.addEventListener(
    'input',
    debounce((e) => {
      if ($('#filter-search')) $('#filter-search').value = e.target.value;
      loadItems();
    }, 300)
  );

  $$('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  $$('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });

  $('#item-form')?.addEventListener('submit', handleItemSubmit);
  $('#movement-form')?.addEventListener('submit', handleMovementSubmit);

  $('#filter-search')?.addEventListener(
    'input',
    debounce((e) => {
      if ($('#global-search')) $('#global-search').value = e.target.value;
      loadItems();
    }, 300)
  );
  $('#filter-category')?.addEventListener('input', debounce(() => loadItems(), 300));
  $('#filter-low-stock')?.addEventListener('change', () => loadItems());
  $('#movement-filter-item')?.addEventListener('change', () => loadMovements());

  $('#items-grid')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const item = state.items.find((i) => i.id === btn.dataset.id);
    if (!item) return;

    if (btn.dataset.action === 'edit') {
      fillItemForm(item);
      openModal('item-modal');
    } else if (btn.dataset.action === 'movement') {
      openModal('movement-modal');
      $('#movement-item').value = item.id;
    } else if (btn.dataset.action === 'delete') {
      if (!confirm(`Delete "${item.name}"?`)) return;
      try {
        await API.deleteItem(item.id);
        showToast('Item removed');
        await refreshAll();
      } catch (err) {
        showToast(err.message, true);
      }
    }
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

async function init() {
  bindEvents();

  try {
    const { data } = await API.me();
    const username = data.user.username;
    $('#nav-username').textContent = username;
    $('#nav-email').textContent = `${username}@vitastore.local`;
    $('#user-avatar').textContent = username.charAt(0).toUpperCase();
    await refreshAll();
  } catch {
    window.location.href = '/login?next=/dashboard';
    return;
  }
}

init();
