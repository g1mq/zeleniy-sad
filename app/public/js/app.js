/**
 * Интерфейс в браузере (экраны: вход, каталог, заказы…).
 * На экзамене обычно НЕ правят — данные приходят с сервера из PostgreSQL.
 * Слоган на входе можно поменять (поиск: «Природа в вашем доме»).
 */
const TYPE_LABELS = { seed: 'Семена', seedling: 'Рассада', plant: 'Растение', bulb: 'Луковица' };
const STATUS_LABELS = {
  new: 'Новый',
  processing: 'В обработке',
  shipped: 'Отправлен',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

let state = { user: null, route: 'login', captcha: '', products: [], conditions: [], clients: [] };

const app = document.getElementById('app');

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

function role() {
  return state.user?.role_name || null;
}

// ——— Права по ролям (как в оценочном листе) ———
/** Поиск и фильтры в каталоге — только менеджер и администратор */
function canFilter() {
  return role() === 'manager' || role() === 'admin';
}

/** Раздел «Заказы» — только менеджер и администратор */
function canOrders() {
  return role() === 'manager' || role() === 'admin';
}

/** CRUD товаров и заказов — только администратор */
function isAdmin() {
  return role() === 'admin';
}

function navigate(route, params = {}) {
  state.route = route;
  state.params = params;
  render();
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

function statusClass(s) {
  return `status status-${s}`;
}

async function init() {
  try {
    const { user } = await api('/api/me');
    state.user = user;
    if (user) navigate(user.role_name === 'guest' ? 'catalog' : 'catalog');
    else navigate('login');
  } catch {
    navigate('login');
  }
}

async function render() {
  if (state.route === 'login') return renderLogin();
  if (state.route === 'register') return renderRegister();
  if (!state.user) return navigate('login');

  const header = renderHeader();
  let body = '';
  switch (state.route) {
    case 'catalog':
      body = await renderCatalog();
      break;
    case 'product-form':
      body = await renderProductForm();
      break;
    case 'orders':
      body = await renderOrders();
      break;
    case 'order-detail':
      body = await renderOrderDetail();
      break;
    case 'order-form':
      body = await renderOrderForm();
      break;
    default:
      body = await renderCatalog();
  }
  app.innerHTML = `<div class="layout">${header}<main class="main">${body}</main></div>`;
  bindEvents();
}

function renderHeader() {
  const r = role();
  const roleRu = { guest: 'Гость', client: 'Клиент', manager: 'Менеджер', admin: 'Администратор' }[r] || '';
  let links = `<button class="link" data-route="catalog">Каталог</button>`;
  if (canOrders()) links += `<button class="link" data-route="orders">Заказы</button>`;
  if (isAdmin()) {
    links += `<button class="link" data-route="product-form">+ Товар</button>`;
    links += `<button class="link" data-route="order-form">+ Заказ</button>`;
  }
  return `
    <header class="header">
      <div class="logo">
        <img src="/images/logo.png" alt="ООО «Зелёный Сад»" class="logo-img">
      </div>
      <nav class="nav">${links}
        <span class="role-badge">${esc(roleRu)}${state.user.login ? ': ' + esc(state.user.login) : ''}</span>
        <button class="link" id="btn-logout">Выход</button>
      </nav>
    </header>`;
}

function renderLogin() {
  app.innerHTML = `
    <div class="auth-screen">
      <div class="logo" style="justify-content:center;flex-direction:column">
        <img src="/images/logo.png" alt="ООО «Зелёный Сад»" class="logo-img logo-img--auth">
        <small class="logo-text">Природа в вашем доме</small>
      </div>
      <h1 style="text-align:center;margin-top:16px">Вход в систему</h1>
      <div id="login-alert"></div>
      <form id="form-login">
        <div class="form-group"><label>Логин</label><input name="login" required autocomplete="username"></div>
        <div class="form-group"><label>Пароль</label><input name="password" type="password" required autocomplete="current-password"></div>
        <button type="submit" class="btn btn-primary btn-block">Войти</button>
      </form>
      <div class="btn-row" style="flex-direction:column">
        <button class="btn btn-outline btn-block" id="btn-register">Регистрация</button>
        <button class="btn btn-secondary btn-block" id="btn-guest">Войти как гость</button>
      </div>
    </div>`;
  document.getElementById('form-login').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const { user } = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login: fd.get('login'), password: fd.get('password') }),
      });
      state.user = user;
      navigate('catalog');
    } catch (err) {
      document.getElementById('login-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  };
  document.getElementById('btn-guest').onclick = async () => {
    const { user } = await api('/api/auth/guest', { method: 'POST', body: '{}' });
    state.user = user;
    navigate('catalog');
  };
  document.getElementById('btn-register').onclick = () => navigate('register');
}

async function renderRegister() {
  const cap = await api('/api/captcha');
  state.captcha = cap.question;
  app.innerHTML = `
    <div class="auth-screen">
      <h1>Регистрация</h1>
      <div id="reg-alert"></div>
      <form id="form-register">
        <div class="form-group"><label>Логин *</label><input name="login" required></div>
        <div class="form-group"><label>Пароль *</label><input name="password" type="password" required minlength="6"></div>
        <div class="form-group"><label>ФИО *</label><input name="full_name" required></div>
        <div class="form-group"><label>Телефон</label><input name="phone"></div>
        <div class="captcha-box">
          <span>CAPTCHA:</span>
          <span class="captcha-question">${esc(cap.question)}</span>
          <input name="captcha" type="number" required style="width:80px" placeholder="?">
          <button type="button" class="btn btn-sm btn-outline" id="refresh-captcha">↻</button>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Зарегистрироваться</button>
      </form>
      <button class="btn btn-outline btn-block" style="margin-top:12px" id="back-login">← К входу</button>
    </div>`;
  document.getElementById('back-login').onclick = () => navigate('login');
  document.getElementById('refresh-captcha').onclick = () => renderRegister();
  document.getElementById('form-register').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const { user } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          login: fd.get('login'),
          password: fd.get('password'),
          full_name: fd.get('full_name'),
          phone: fd.get('phone'),
          captcha: fd.get('captcha'),
        }),
      });
      state.user = user;
      navigate('catalog');
    } catch (err) {
      document.getElementById('reg-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  };
}

async function renderCatalog() {
  const q = state.catalogQuery || {};
  const qs = new URLSearchParams(q).toString();
  const data = await api(`/api/products?${qs}`);
  state.products = data.products;

  const filterBlock = canFilter()
    ? `<div class="toolbar" id="catalog-filters">
        <input type="search" id="f-search" placeholder="Поиск по названию/артикулу" value="${esc(q.search || '')}" style="flex:1;min-width:180px;padding:8px;border-radius:8px;border:2px solid #e5e7eb">
        <select id="f-category"><option value="">Все категории</option>${data.categories.map((c) => `<option value="${esc(c.category)}" ${q.category === c.category ? 'selected' : ''}>${esc(c.category)}</option>`).join('')}</select>
        <select id="f-type"><option value="">Все типы</option>${Object.entries(TYPE_LABELS).map(([k, v]) => `<option value="${k}" ${q.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <select id="f-sort"><option value="">Сортировка</option>
          <option value="price_asc" ${q.sort === 'price_asc' ? 'selected' : ''}>Цена ↑</option>
          <option value="price_desc" ${q.sort === 'price_desc' ? 'selected' : ''}>Цена ↓</option>
          <option value="name_asc" ${q.sort === 'name_asc' ? 'selected' : ''}>Название А-Я</option>
          <option value="date_desc" ${q.sort === 'date_desc' ? 'selected' : ''}>Новые</option>
        </select>
        <select id="f-climate" title="Климат"><option value="">Климат</option></select>
        <select id="f-soil"><option value="">Почва</option></select>
        <select id="f-sun"><option value="">Свет</option></select>
        <select id="f-water"><option value="">Полив</option></select>
        <button class="btn btn-primary btn-sm" id="apply-filters">Применить</button>
      </div>`
    : `<p class="form-hint" style="margin-bottom:16px">Режим просмотра: поиск и фильтры доступны только менеджеру и администратору.</p>`;

  const cards = data.products.length
    ? data.products
        .map(
          (p) => `
      <article class="product-card">
        <div class="product-card-img">🌱</div>
        <div class="product-card-body">
          <span class="badge">${esc(TYPE_LABELS[p.type])}</span>
          <h3>${esc(p.name)}</h3>
          <div class="product-meta">${esc(p.article)} · ${esc(p.category)} · ${esc(p.brand)}</div>
          <div class="product-price">${Number(p.price).toFixed(2)} ₽</div>
          <div class="product-icons">🌱 Остаток: ${p.quantity} &nbsp; 💧 ☀️</div>
          ${isAdmin() ? `<div class="btn-row" style="margin-top:12px">
            <button class="btn btn-sm btn-outline edit-product" data-id="${p.id}">Изменить</button>
            <button class="btn btn-sm btn-danger del-product" data-id="${p.id}">Удалить</button>
          </div>` : ''}
        </div>
      </article>`
        )
        .join('')
    : '<div class="empty">Товары не найдены</div>';

  return `<h1>Каталог растений и семян</h1>${filterBlock}<div class="product-grid">${cards}</div>`;
}

async function renderProductForm() {
  if (!isAdmin()) return '<div class="alert alert-error">Только администратор может управлять товарами</div>';
  const id = state.params?.id;
  let product = {};
  let linked = [];
  if (id) {
    const data = await api(`/api/products/${id}`);
    product = data.product;
    linked = data.conditions.map((c) => c.id);
  }
  const conditions = await api('/api/conditions');
  state.conditions = conditions;

  return `
    <div class="panel">
      <h2>${id ? 'Редактирование товара' : 'Новый товар'}</h2>
      <div id="product-alert"></div>
      <form id="form-product">
        <input type="hidden" name="id" value="${id || ''}">
        <div class="form-group"><label>Артикул *</label><input name="article" required value="${esc(product.article || '')}"></div>
        <div class="form-group"><label>Наименование *</label><input name="name" required value="${esc(product.name || '')}"></div>
        <div class="form-group"><label>Тип *</label><select name="type" required>${Object.entries(TYPE_LABELS).map(([k, v]) => `<option value="${k}" ${product.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="form-group"><label>Бренд *</label><input name="brand" required value="${esc(product.brand || '')}"></div>
        <div class="form-group"><label>Цена (₽) *</label><input name="price" type="number" step="0.01" min="0.01" required value="${product.price || ''}"></div>
        <div class="form-group"><label>Остаток *</label><input name="quantity" type="number" min="0" required value="${product.quantity ?? 0}"></div>
        <div class="form-group"><label>Категория *</label><input name="category" required value="${esc(product.category || '')}"></div>
        <div class="form-group"><label>Сезон посадки</label><input name="planting_season" value="${esc(product.planting_season || '')}"></div>
        <div class="form-group"><label>Описание</label><textarea name="description" rows="3">${esc(product.description || '')}</textarea></div>
        <div class="form-group"><label>Условия выращивания</label>
          <select name="condition_ids" multiple size="4">${conditions.map((c) => `<option value="${c.id}" ${linked.includes(c.id) ? 'selected' : ''}>${esc(c.climate_zone)} / ${esc(c.soil_type)} / ${esc(c.sunlight)} / ${esc(c.watering)}</option>`).join('')}</select>
        </div>
        <div class="btn-row">
          <button type="submit" class="btn btn-primary">Сохранить</button>
          <button type="button" class="btn btn-outline" data-route="catalog">Отмена</button>
          ${id ? `<button type="button" class="btn btn-danger" id="del-product-form">Удалить</button>` : ''}
        </div>
      </form>
    </div>`;
}

async function renderOrders() {
  if (!canOrders()) return '<div class="alert alert-error">Раздел недоступен для вашей роли</div>';
  const orders = await api('/api/orders');
  const rows = orders
    .map(
      (o) => `<tr>
      <td>#${o.id}</td><td>${esc(o.client_name)}</td><td>${new Date(o.order_date).toLocaleString('ru')}</td>
      <td><span class="${statusClass(o.status)}">${STATUS_LABELS[o.status]}</span></td>
      <td>${Number(o.total_amount).toFixed(2)} ₽</td>
      <td><button class="btn btn-sm btn-outline view-order" data-id="${o.id}">Открыть</button></td>
    </tr>`
    )
    .join('');
  return `<h1>Заказы</h1>
    ${isAdmin() ? '<button class="btn btn-primary" data-route="order-form" style="margin-bottom:16px">+ Создать заказ</button>' : ''}
    <table class="data-table"><thead><tr><th>№</th><th>Клиент</th><th>Дата</th><th>Статус</th><th>Сумма</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6" class="empty">Нет заказов</td></tr>'}</tbody></table>`;
}

async function renderOrderDetail() {
  const id = state.params.id;
  const { order, items, canCrud } = await api(`/api/orders/${id}`);
  const itemsHtml = items
    .map(
      (i) => `<tr><td>${esc(i.product_name)} (${esc(i.article)})</td><td>${i.count}</td><td>${Number(i.price_at_order).toFixed(2)} ₽</td><td>${(i.count * i.price_at_order).toFixed(2)} ₽</td></tr>`
    )
    .join('');

  const statusSelect = canOrders()
    ? `<select id="order-status">${Object.entries(STATUS_LABELS).map(([k, v]) => `<option value="${k}" ${order.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
       <button class="btn btn-sm btn-primary" id="save-status">Сохранить статус</button>`
    : `<span class="${statusClass(order.status)}">${STATUS_LABELS[order.status]}</span>`;

  return `<div class="panel">
    <h2>Заказ #${order.id}</h2>
    <p><strong>Клиент:</strong> ${esc(order.client_name)}</p>
    <p><strong>Адрес:</strong> ${esc(order.delivery_address)}</p>
    <p><strong>Телефон:</strong> ${esc(order.phone)}</p>
    <p><strong>Статус:</strong> ${statusSelect}</p>
    <p><strong>Сумма:</strong> ${Number(order.total_amount).toFixed(2)} ₽</p>
    <h3>Состав заказа</h3>
    <table class="data-table"><thead><tr><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>${itemsHtml}</tbody></table>
    <div class="btn-row">
      <button class="btn btn-outline" data-route="orders">← К списку</button>
      ${canCrud ? `<button class="btn btn-outline" data-route="order-form" data-id="${order.id}">Редактировать</button>
        <button class="btn btn-danger" id="del-order">Удалить заказ</button>` : ''}
    </div>
  </div>`;
}

async function renderOrderForm() {
  if (!isAdmin()) return '<div class="alert alert-error">Только администратор</div>';
  const id = state.params?.id;
  let order = { status: 'new', items: [{ product_id: '', count: 1, price_at_order: '' }] };
  if (id) {
    const data = await api(`/api/orders/${id}`);
    order = { ...data.order, items: data.items };
  }
  const clients = await api('/api/clients');
  const products = (await api('/api/products')).products;

  const itemsHtml = order.items
    .map(
      (it, idx) => `<div class="order-item-row" data-idx="${idx}" style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
      <select name="product_id" style="flex:2">${products.map((p) => `<option value="${p.id}" data-price="${p.price}" ${String(it.product_id) === String(p.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
      <input name="count" type="number" min="1" value="${it.count}" style="width:80px" placeholder="Кол-во">
      <input name="price_at_order" type="number" step="0.01" min="0.01" value="${it.price_at_order}" style="width:120px" placeholder="Цена">
      <button type="button" class="btn btn-sm btn-danger remove-item">✕</button>
    </div>`
    )
    .join('');

  return `<div class="panel">
    <h2>${id ? 'Редактирование заказа' : 'Новый заказ'}</h2>
    <div id="order-alert"></div>
    <form id="form-order">
      <div class="form-group"><label>Клиент *</label>
        <select name="user_id" required>${clients.map((c) => `<option value="${c.id}" ${String(order.user_id) === String(c.id) ? 'selected' : ''}>${esc(c.full_name)} (${esc(c.login)})</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Статус</label>
        <select name="status">${Object.entries(STATUS_LABELS).map(([k, v]) => `<option value="${k}" ${order.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Адрес доставки *</label><input name="delivery_address" required value="${esc(order.delivery_address || '')}"></div>
      <div class="form-group"><label>Телефон *</label><input name="phone" required value="${esc(order.phone || '')}"></div>
      <h3>Позиции</h3><div id="order-items">${itemsHtml}</div>
      <button type="button" class="btn btn-sm btn-outline" id="add-item">+ Позиция</button>
      <div class="btn-row" style="margin-top:16px">
        <button type="submit" class="btn btn-primary">Сохранить</button>
        <button type="button" class="btn btn-outline" data-route="orders">Отмена</button>
      </div>
    </form>
  </div>`;
}

function bindEvents() {
  document.querySelectorAll('[data-route]').forEach((el) => {
    el.onclick = () => {
      const route = el.dataset.route;
      const id = el.dataset.id;
      navigate(route, id ? { id } : {});
    };
  });

  const logout = document.getElementById('btn-logout');
  if (logout) {
    logout.onclick = async () => {
      await api('/api/auth/logout', { method: 'POST', body: '{}' });
      state.user = null;
      navigate('login');
    };
  }

  document.getElementById('apply-filters')?.addEventListener('click', () => {
    state.catalogQuery = {
      search: document.getElementById('f-search')?.value,
      category: document.getElementById('f-category')?.value,
      type: document.getElementById('f-type')?.value,
      sort: document.getElementById('f-sort')?.value,
      climate: document.getElementById('f-climate')?.value,
      soil: document.getElementById('f-soil')?.value,
      sunlight: document.getElementById('f-sun')?.value,
      watering: document.getElementById('f-water')?.value,
    };
    render();
  });

  if (canFilter()) loadConditionFilters();

  document.querySelectorAll('.edit-product').forEach((b) => {
    b.onclick = () => navigate('product-form', { id: b.dataset.id });
  });
  document.querySelectorAll('.del-product').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Удалить товар?')) return;
      await api(`/api/products/${b.dataset.id}`, { method: 'DELETE' });
      render();
    };
  });

  document.querySelectorAll('.view-order').forEach((b) => {
    b.onclick = () => navigate('order-detail', { id: b.dataset.id });
  });

  document.getElementById('form-product')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const sel = e.target.querySelector('[name=condition_ids]');
    const condition_ids = [...sel.selectedOptions].map((o) => Number(o.value));
    const body = Object.fromEntries(fd);
    body.condition_ids = condition_ids;
    body.price = Number(body.price);
    body.quantity = Number(body.quantity);
    try {
      const id = body.id;
      if (id) await api(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await api('/api/products', { method: 'POST', body: JSON.stringify(body) });
      navigate('catalog');
    } catch (err) {
      document.getElementById('product-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  });

  document.getElementById('del-product-form')?.addEventListener('click', async () => {
    const id = state.params?.id;
    if (!confirm('Удалить?')) return;
    await api(`/api/products/${id}`, { method: 'DELETE' });
    navigate('catalog');
  });

  document.getElementById('save-status')?.addEventListener('click', async () => {
    const status = document.getElementById('order-status').value;
    await api(`/api/orders/${state.params.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    render();
  });

  document.getElementById('del-order')?.addEventListener('click', async () => {
    if (!confirm('Удалить заказ?')) return;
    await api(`/api/orders/${state.params.id}`, { method: 'DELETE' });
    navigate('orders');
  });

  document.getElementById('add-item')?.addEventListener('click', () => {
    const wrap = document.getElementById('order-items');
    const first = wrap.querySelector('.order-item-row');
    const clone = first.cloneNode(true);
    clone.querySelectorAll('input').forEach((i) => (i.value = i.name === 'count' ? 1 : ''));
    wrap.appendChild(clone);
    bindItemRows();
  });

  bindItemRows();
  bindOrderForm();
}

async function loadConditionFilters() {
  try {
    const conds = await api('/api/conditions');
    const uniq = (key) => [...new Set(conds.map((c) => c[key]))];
    fillSelect('f-climate', uniq('climate_zone'), state.catalogQuery?.climate);
    fillSelect('f-soil', uniq('soil_type'), state.catalogQuery?.soil);
    fillSelect('f-sun', uniq('sunlight'), state.catalogQuery?.sunlight);
    fillSelect('f-water', uniq('watering'), state.catalogQuery?.watering);
  } catch (_) {}
}

function fillSelect(id, values, selected) {
  const el = document.getElementById(id);
  if (!el) return;
  const label = el.options[0].text;
  el.innerHTML = `<option value="">${label}</option>${values.map((v) => `<option value="${esc(v)}" ${selected === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}`;
}

function bindItemRows() {
  document.querySelectorAll('.remove-item').forEach((btn) => {
    btn.onclick = () => {
      const rows = document.querySelectorAll('.order-item-row');
      if (rows.length > 1) btn.closest('.order-item-row').remove();
    };
  });
  document.querySelectorAll('.order-item-row select').forEach((sel) => {
    sel.onchange = () => {
      const price = sel.selectedOptions[0]?.dataset?.price;
      const row = sel.closest('.order-item-row');
      if (price) row.querySelector('[name=price_at_order]').value = price;
    };
  });
}

function bindOrderForm() {
  const form = document.getElementById('form-order');
  if (!form) return;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const items = [...document.querySelectorAll('.order-item-row')].map((row) => ({
      product_id: Number(row.querySelector('[name=product_id]').value),
      count: Number(row.querySelector('[name=count]').value),
      price_at_order: Number(row.querySelector('[name=price_at_order]').value),
    }));
    const body = {
      user_id: Number(fd.get('user_id')),
      status: fd.get('status'),
      delivery_address: fd.get('delivery_address'),
      phone: fd.get('phone'),
      items,
    };
    try {
      const id = state.params?.id;
      if (id) await api(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await api('/api/orders', { method: 'POST', body: JSON.stringify(body) });
      navigate('orders');
    } catch (err) {
      document.getElementById('order-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  };
}

init();
