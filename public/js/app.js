import API from './api.js';

const state = {
  items: [],
  movements: [],
  metrics: null,
  expiring: [],
  brands: [],
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

  if (panelId === 'expiry') loadExpiring();
  if (panelId === 'brands') loadBrands();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDaysLeft(days) {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return 'Today';
  return `${days} day${days === 1 ? '' : 's'}`;
}

function expiryStatusLabel(status) {
  if (status === 'expired') return 'Expired';
  if (status === 'critical') return 'Expires soon';
  return 'Coming up';
}

function formatProductType(type) {
  return type === 'skincare' ? 'Skincare' : 'Makeup';
}

function formatCodeOrSize(item) {
  if (item.product_type === 'skincare') {
    if (!item.amount) return '—';
    return `${item.amount}${item.amount_unit || ''}`;
  }
  return item.sku || '—';
}

function formatExpiry(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getSelectedMovementItem() {
  const itemId = $('#movement-item')?.value;
  return state.items.find((item) => item.id === itemId) ?? null;
}

function updateItemFormFields() {
  const productType = $('#item-product-type')?.value || 'makeup';
  const isSkincare = productType === 'skincare';
  const isEditing = Boolean(state.editingItem);

  $('#item-sku-wrap')?.classList.toggle('hidden', isSkincare);
  $('#item-amount-wrap')?.classList.toggle('hidden', !isSkincare);
  $('#item-initial-stock')?.closest('.form-field')?.classList.toggle('hidden', isEditing);
  $('#item-expiry-wrap')?.classList.toggle('hidden', !isSkincare || isEditing);

  const skuInput = $('#item-sku');
  if (skuInput) skuInput.required = !isSkincare && !isEditing;

  const amountInput = $('#item-amount');
  if (amountInput) amountInput.required = isSkincare && !isEditing;

  updateCreateExpiryVisibility();
}

function updateCreateExpiryVisibility() {
  const productType = $('#item-product-type')?.value || 'makeup';
  const initialStock = Number($('#item-initial-stock')?.value || 0);
  const isEditing = Boolean(state.editingItem);
  const showExpiry = productType === 'skincare' && !isEditing && initialStock > 0;
  $('#item-expiry-wrap')?.classList.toggle('hidden', !showExpiry);
  const expiryInput = $('#item-expiry');
  if (expiryInput) expiryInput.required = showExpiry;
}

function updateMovementExpiryVisibility() {
  const item = getSelectedMovementItem();
  const movementType = $('#movement-type')?.value;
  const quantity = Number($('#movement-qty')?.value || 0);
  const needsExpiry =
    item?.product_type === 'skincare' &&
    (movementType === 'IN' || (movementType === 'ADJUSTMENT' && quantity > 0));

  $('#movement-expiry-wrap')?.classList.toggle('hidden', !needsExpiry);
  const expiryInput = $('#movement-expiry');
  if (expiryInput) expiryInput.required = needsExpiry;
}

async function loadMetrics() {
  const { data } = await API.getMetrics();
  state.metrics = data;
  $('#metric-total-items').textContent = data.total_items;
  $('#metric-low-stock').textContent = data.low_stock_count;
  $('#metric-expiring').textContent = data.expiring_batch_count ?? 0;

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

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  cutoff.setHours(0, 0, 0, 0);

  const recent = state.movements.filter((m) => new Date(m.created_at) >= cutoff);

  const segments = [
    { key: 'IN', label: 'Stock in', color: '#a64b16' },
    { key: 'OUT', label: 'Stock out', color: '#b85c4a' },
    { key: 'ADJUSTMENT', label: 'Adjustments', color: '#c49a3c' },
  ].map((segment) => ({
    ...segment,
    count: recent.filter((m) => m.type === segment.key).length,
  }));

  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  if (!total) {
    chart.innerHTML = '<div class="dash-chart-empty">No movements in the last 7 days</div>';
    return;
  }

  let cumulative = 0;
  const gradientStops = segments
    .filter((segment) => segment.count > 0)
    .map((segment) => {
      const start = (cumulative / total) * 360;
      cumulative += segment.count;
      const end = (cumulative / total) * 360;
      return `${segment.color} ${start}deg ${end}deg`;
    });

  chart.innerHTML = `
    <div class="dash-pie-wrap">
      <div
        class="dash-pie"
        style="background: conic-gradient(${gradientStops.join(', ')})"
        role="img"
        aria-label="Movement volume pie chart"
      ></div>
      <ul class="dash-pie-legend">
        ${segments
          .map(
            (segment) => `
          <li class="dash-pie-legend-item">
            <span class="dash-pie-swatch" style="background:${segment.color}"></span>
            <span class="dash-pie-legend-label">${segment.label}</span>
            <strong class="dash-pie-legend-count">${segment.count}</strong>
            <span class="dash-pie-legend-pct">${Math.round((segment.count / total) * 100)}%</span>
          </li>
        `
          )
          .join('')}
      </ul>
    </div>
  `;
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
          <div class="dash-reminder-meta">${formatCodeOrSize(item)} · ${item.current_stock} pieces</div>
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
  renderExpiringPreview();
}

async function loadExpiring() {
  const { data } = await API.getExpiring(90);
  state.expiring = data;
  renderExpiring();
  renderExpiringPreview();
  if (state.metrics) {
    $('#metric-expiring').textContent = data.length;
  }
}

function renderExpiringPreview() {
  const list = $('#expiring-preview-list');
  if (!list) return;

  if (!state.expiring.length) {
    list.innerHTML = '<div class="dash-empty">No batches expiring soon</div>';
    return;
  }

  list.innerHTML = state.expiring
    .slice(0, 5)
    .map(
      (entry) => `
      <div class="dash-reminder-item">
        <div>
          <div class="dash-reminder-name">${escapeHtml(entry.product_name)}</div>
          <div class="dash-reminder-meta">${escapeHtml(entry.brand)} · ${formatExpiry(entry.expiry_date)} · ${entry.quantity} pcs</div>
        </div>
        <span class="dash-expiry-badge is-${entry.status}">${expiryStatusLabel(entry.status)}</span>
      </div>
    `
    )
    .join('');
}

function renderExpiring() {
  const tbody = $('#expiry-table-body');
  const empty = $('#expiry-empty');
  const countEl = $('#expiry-count');
  if (!tbody) return;

  if (countEl) {
    countEl.textContent = `${state.expiring.length} batch${state.expiring.length === 1 ? '' : 'es'} expiring within 90 days`;
  }

  if (!state.expiring.length) {
    tbody.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }

  empty?.classList.add('hidden');
  tbody.innerHTML = state.expiring
    .map(
      (entry) => `
      <tr>
        <td data-label="Product"><strong>${escapeHtml(entry.product_name)}</strong></td>
        <td data-label="Brand">${escapeHtml(entry.brand)}</td>
        <td data-label="Expiry">${formatExpiry(entry.expiry_date)}</td>
        <td data-label="Days left">${formatDaysLeft(entry.days_until_expiry)}</td>
        <td data-label="Pieces">${entry.quantity}</td>
        <td data-label="Status"><span class="dash-expiry-badge is-${entry.status}">${expiryStatusLabel(entry.status)}</span></td>
      </tr>
    `
    )
    .join('');
}

async function loadBrands() {
  const { data } = await API.getBrands();
  state.brands = data;
  renderBrands();
  populateBrandFilter();
}

function renderBrands() {
  const grid = $('#brands-grid');
  const empty = $('#brands-empty');
  const countEl = $('#brands-count');
  if (!grid) return;

  if (countEl) {
    countEl.textContent = `${state.brands.length} brand${state.brands.length === 1 ? '' : 's'} available`;
  }

  if (!state.brands.length) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }

  empty?.classList.add('hidden');
  grid.innerHTML = state.brands
    .map(
      (brand) => `
      <article class="dash-brand-card">
        <h3 class="dash-brand-name">${escapeHtml(brand.brand)}</h3>
        <p class="dash-brand-meta">
          ${brand.product_count} product${brand.product_count === 1 ? '' : 's'}<br>
          ${brand.skincare_count} skincare · ${brand.makeup_count} makeup<br>
          ${brand.total_pieces} total pieces in stock
        </p>
        <button class="dash-btn dash-btn-outline" type="button" data-brand-filter="${escapeHtml(brand.brand)}" style="width:100%;min-height:36px;font-size:10px">
          View products
        </button>
      </article>
    `
    )
    .join('');
}

function populateBrandFilter() {
  const el = $('#filter-brand');
  if (!el) return;

  const current = el.value;
  el.innerHTML =
    '<option value="">All brands</option>' +
    state.brands
      .map((brand) => `<option value="${escapeHtml(brand.brand)}">${escapeHtml(brand.brand)}</option>`)
      .join('');

  if (current) el.value = current;
}

function filterProductsByBrand(brand) {
  switchPanel('products');
  const filter = $('#filter-brand');
  if (filter) filter.value = brand;
  loadItems();
}

async function loadItems() {
  const search = ($('#filter-search')?.value || $('#global-search')?.value || '').trim();
  const productType = $('#filter-product-type')?.value || '';
  const brand = $('#filter-brand')?.value || '';
  const lowStock = $('#filter-low-stock')?.checked || false;

  const { data } = await API.getItems({
    search: search || undefined,
    product_type: productType || undefined,
    brand: brand || undefined,
    low_stock: lowStock || undefined,
  });

  state.items = data;
  renderItems();
  populateMovementItemSelect();
  renderLowStockList();
}

function renderItems() {
  const tbody = $('#products-table-body');
  const empty = $('#products-empty');
  const countEl = $('#products-count');
  if (!tbody) return;

  if (countEl) {
    countEl.textContent = `${state.items.length} product${state.items.length === 1 ? '' : 's'} shown`;
  }

  if (!state.items.length) {
    tbody.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }

  empty?.classList.add('hidden');
  tbody.innerHTML = state.items
    .map((item) => {
      const isLow = item.current_stock <= item.min_stock_level;
      return `
        <tr class="${isLow ? 'is-low-stock' : ''}">
          <td data-label="Type"><span class="dash-table-sku">${formatProductType(item.product_type)}</span></td>
          <td data-label="Brand">${escapeHtml(item.brand || '—')}</td>
          <td data-label="Code / Size"><span class="dash-table-sku">${escapeHtml(formatCodeOrSize(item))}</span></td>
          <td data-label="Name">
            <strong>${escapeHtml(item.name)}</strong>
            ${item.description ? `<div class="dash-table-meta">${escapeHtml(item.description)}</div>` : ''}
          </td>
          <td data-label="Pieces">
            <span class="dash-table-stock${isLow ? ' is-low' : ''}">${item.current_stock}</span>
            ${isLow ? '<span class="dash-reminder-badge" style="margin-left:6px">Low</span>' : ''}
          </td>
          <td data-label="Min">${item.min_stock_level}</td>
          <td data-label="Actions">
            <div class="dash-table-actions">
              <button class="dash-table-btn" data-action="view" data-id="${item.id}" type="button">View</button>
              <button class="dash-table-btn" data-action="edit" data-id="${item.id}" type="button">Edit</button>
              <button class="dash-table-btn" data-action="movement" data-id="${item.id}" type="button">Log</button>
              <button class="dash-table-btn is-danger" data-action="delete" data-id="${item.id}" type="button">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderProductDetail(item) {
  const container = $('#product-detail');
  if (!container) return;

  const skincareSize =
    item.product_type === 'skincare' && item.amount
      ? `${item.amount}${item.amount_unit || ''}`
      : '—';

  const batchesHtml =
    item.product_type === 'skincare' && item.batches?.length
      ? `
        <div class="is-full">
          <dt>Stock by expiry</dt>
          <dd>
            <table class="dash-table is-cards" style="margin-top:8px">
              <thead>
                <tr>
                  <th>Expiry</th>
                  <th>Pieces</th>
                </tr>
              </thead>
              <tbody>
                ${item.batches
                  .map(
                    (batch) => `
                  <tr>
                    <td data-label="Expiry">${formatExpiry(batch.expiry_date)}</td>
                    <td data-label="Pieces">${batch.quantity}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </dd>
        </div>
      `
      : item.product_type === 'skincare'
        ? '<div class="is-full"><dt>Stock by expiry</dt><dd>No batches recorded yet</dd></div>'
        : '';

  container.innerHTML = `
    <dl class="product-detail-grid">
      <div><dt>Type</dt><dd>${formatProductType(item.product_type)}</dd></div>
      <div><dt>Brand</dt><dd>${escapeHtml(item.brand || '—')}</dd></div>
      <div><dt>${item.product_type === 'skincare' ? 'Size' : 'Product code'}</dt><dd>${escapeHtml(item.product_type === 'skincare' ? skincareSize : item.sku || '—')}</dd></div>
      <div><dt>Name</dt><dd>${escapeHtml(item.name)}</dd></div>
      <div><dt>Total pieces</dt><dd>${item.current_stock}</dd></div>
      <div class="is-full"><dt>Description</dt><dd>${item.description ? escapeHtml(item.description) : '—'}</dd></div>
      ${batchesHtml}
      <div><dt>Created</dt><dd>${formatDate(item.created_at)}</dd></div>
      <div><dt>Updated</dt><dd>${formatDate(item.updated_at)}</dd></div>
    </dl>
  `;

  const editBtn = $('#product-detail-edit');
  if (editBtn) {
    editBtn.onclick = () => {
      closeModal('product-modal');
      fillItemForm(item);
      openModal('item-modal');
    };
  }
}

async function openProductDetail(itemId) {
  try {
    const { data } = await API.getItem(itemId);
    renderProductDetail(data);
    openModal('product-modal');
  } catch (err) {
    showToast(err.message, true);
  }
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
          <td data-label="Date">${formatDate(m.created_at)}</td>
          <td data-label="Item">${escapeHtml(m.item?.name || m.item_id)}</td>
          <td data-label="Type"><span class="dash-pill ${pill}">${m.type}</span></td>
          <td data-label="Quantity" class="${qtyClass}">${sign}${m.quantity}</td>
          <td data-label="Expiry">${formatExpiry(m.expiry_date)}</td>
          <td data-label="Reason">${escapeHtml(m.reason)}</td>
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
            `<option value="${item.id}">${escapeHtml(formatProductType(item.product_type))} — ${escapeHtml(item.name)}</option>`
        )
        .join('');
    if (current) el.value = current;
  });
}

function resetItemForm() {
  state.editingItem = null;
  $('#item-form').reset();
  $('#item-product-type').value = 'makeup';
  $('#item-product-type').disabled = false;
  $('#item-sku').disabled = false;
  $('#item-brand').value = 'Vitapharm';
  $('#item-amount-unit').value = 'ml';
  $('#item-min').value = '5';
  $('#item-modal-title').textContent = 'Add product';
  $('#item-modal-sub').textContent = 'Choose skincare or makeup and fill in the fields for that product type.';
  updateItemFormFields();
}

function fillItemForm(item) {
  state.editingItem = item;
  $('#item-modal-title').textContent = 'Edit product';
  $('#item-modal-sub').textContent = 'Update product details. Stock levels are managed through movements.';
  $('#item-product-type').value = item.product_type;
  $('#item-product-type').disabled = true;
  $('#item-sku').value = item.sku || '';
  $('#item-sku').disabled = true;
  $('#item-name').value = item.name;
  $('#item-brand').value = item.brand || 'Vitapharm';
  $('#item-description').value = item.description || '';
  $('#item-amount').value = item.amount || '';
  $('#item-amount-unit').value = item.amount_unit || 'ml';
  $('#item-min').value = item.min_stock_level;
  updateItemFormFields();
}

async function handleItemSubmit(e) {
  e.preventDefault();
  const productType = $('#item-product-type').value;

  if (state.editingItem) {
    const body = {
      name: $('#item-name').value.trim(),
      brand: $('#item-brand').value.trim(),
      description: $('#item-description').value.trim() || null,
      min_stock_level: Number($('#item-min').value) || 5,
    };

    if (productType === 'skincare') {
      body.amount = Number($('#item-amount').value);
      body.amount_unit = $('#item-amount-unit').value;
    }

    try {
      await API.updateItem(state.editingItem.id, body);
      showToast('Product updated successfully');
      closeModal('item-modal');
      resetItemForm();
      await refreshAll();
    } catch (err) {
      showToast(err.message, true);
    }
    return;
  }

  const body = {
    product_type: productType,
    name: $('#item-name').value.trim(),
    brand: $('#item-brand').value.trim(),
    description: $('#item-description').value.trim() || null,
    initial_stock: Number($('#item-initial-stock').value) || 0,
    min_stock_level: Number($('#item-min').value) || 5,
  };

  if (productType === 'makeup') {
    body.sku = $('#item-sku').value.trim();
  } else {
    body.amount = Number($('#item-amount').value);
    body.amount_unit = $('#item-amount-unit').value;
    if (body.initial_stock > 0) {
      body.expiry_date = $('#item-expiry').value;
    }
  }

  try {
    await API.createItem(body);
    showToast('Product created successfully');
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

  const item = getSelectedMovementItem();
  const expiryValue = $('#movement-expiry')?.value;
  if (item?.product_type === 'skincare') {
    const needsExpiry =
      body.type === 'IN' || (body.type === 'ADJUSTMENT' && body.quantity > 0);
    if (needsExpiry && expiryValue) {
      body.expiry_date = expiryValue;
    }
  }

  try {
    await API.createMovement(body);
    showToast('Movement logged and stock updated');
    closeModal('movement-modal');
    $('#movement-form').reset();
    updateMovementExpiryVisibility();
    await refreshAll();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function refreshAll() {
  await Promise.all([loadMetrics(), loadItems(), loadMovements(), loadExpiring(), loadBrands()]);
}

function openAddItem() {
  resetItemForm();
  $('#item-product-type').disabled = false;
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
    const result = await API.importItems(file, $('#import-product-type')?.value || 'makeup');
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

function closeSidebar() {
  $('#dash-sidebar')?.classList.remove('is-open');
  $('#dash-backdrop')?.classList.remove('is-open');
  document.body.style.overflow = '';
}

function openSidebar() {
  $('#dash-sidebar')?.classList.add('is-open');
  $('#dash-backdrop')?.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function bindEvents() {
  $$('.dash-nav-item[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchPanel(btn.dataset.panel);
      closeSidebar();
    });
  });

  $('#btn-menu')?.addEventListener('click', openSidebar);
  $('#dash-backdrop')?.addEventListener('click', closeSidebar);

  $$('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchPanel(btn.dataset.goto);
      closeSidebar();
    });
  });

  $('#btn-add-item')?.addEventListener('click', openAddItem);
  $('#btn-add-item-2')?.addEventListener('click', openAddItem);
  $('#btn-add-item-3')?.addEventListener('click', openAddItem);

  $('#btn-import-items')?.addEventListener('click', openImportModal);
  $('#btn-import-items-2')?.addEventListener('click', openImportModal);
  $('#btn-import-items-3')?.addEventListener('click', openImportModal);
  $('#btn-download-template')?.addEventListener('click', () =>
    API.downloadImportTemplate($('#import-product-type')?.value || 'makeup')
  );

  $('#import-product-type')?.addEventListener('change', () => {
    $('#import-results')?.classList.add('hidden');
  });

  $('#item-product-type')?.addEventListener('change', updateItemFormFields);
  $('#item-initial-stock')?.addEventListener('input', updateCreateExpiryVisibility);
  $('#movement-item')?.addEventListener('change', updateMovementExpiryVisibility);
  $('#movement-type')?.addEventListener('change', updateMovementExpiryVisibility);
  $('#movement-qty')?.addEventListener('input', updateMovementExpiryVisibility);

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

  const openMovement = () => {
    updateMovementExpiryVisibility();
    openModal('movement-modal');
  };
  $('#btn-log-movement')?.addEventListener('click', openMovement);
  $('#btn-log-movement-2')?.addEventListener('click', openMovement);
  $('#btn-log-movement-3')?.addEventListener('click', openMovement);

  $('#btn-logout')?.addEventListener('click', logout);
  $('#btn-logout-sidebar')?.addEventListener('click', logout);

  $('#btn-low-stock-alert')?.addEventListener('click', () => {
    switchPanel('products');
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
  $('#filter-product-type')?.addEventListener('change', () => loadItems());
  $('#filter-brand')?.addEventListener('change', () => loadItems());
  $('#filter-low-stock')?.addEventListener('change', () => loadItems());
  $('#movement-filter-item')?.addEventListener('change', () => loadMovements());

  $('#brands-grid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-brand-filter]');
    if (!btn) return;
    filterProductsByBrand(btn.dataset.brandFilter);
  });

  $('#products-table-body')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const item = state.items.find((i) => i.id === btn.dataset.id);
    if (!item) return;

    if (btn.dataset.action === 'view') {
      await openProductDetail(item.id);
    } else if (btn.dataset.action === 'edit') {
      fillItemForm(item);
      openModal('item-modal');
    } else if (btn.dataset.action === 'movement') {
      openModal('movement-modal');
      $('#movement-item').value = item.id;
      updateMovementExpiryVisibility();
    } else if (btn.dataset.action === 'delete') {
      if (!confirm(`Delete "${item.name}"?`)) return;
      try {
        await API.deleteItem(item.id);
        showToast('Product removed');
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
  updateItemFormFields();
  updateMovementExpiryVisibility();

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
