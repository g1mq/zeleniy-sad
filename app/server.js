/**
 * Сервер приложения (блок 3 экзамена).
 * Логику ролей и API не меняют на экзамене — данные в database/seed.sql.
 */
const path = require('path');
// Важно: .env загружается ДО config.js, иначе неверный пароль PostgreSQL
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const session = require('express-session');
const config = require('../config');
const { getPool, hashPassword, initDatabase } = require('./db');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'zeleniy-sad-demo-exam-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 },
  })
);
app.use(express.static(path.join(__dirname, 'public'))); // HTML, CSS, JS, logo.png

/** Текущая роль: guest | client | manager | admin */
function getSessionRole(req) {
  if (!req.session.user) return 'guest';
  return req.session.user.role_name;
}

/** Middleware: доступ только указанным ролям (иначе 403) */
function requireRole(...allowed) {
  return (req, res, next) => {
    const role = getSessionRole(req);
    if (!allowed.includes(role)) {
      return res.status(403).json({ error: 'Недостаточно прав доступа' });
    }
    next();
  };
}

function asyncRoute(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(err);
      if (err.code === '23503') {
        return res.status(400).json({ error: 'Нарушение связей: запись используется в других таблицах' });
      }
      res.status(500).json({ error: err.message || 'Ошибка сервера' });
    });
  };
}

// ——— CAPTCHA ———
app.get('/api/captcha', (req, res) => {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  req.session.captchaAnswer = a + b;
  res.json({ question: `${a} + ${b} = ?` });
});

// ——— Auth ———
app.get('/api/me', (req, res) => {
  if (req.session.user) return res.json({ user: req.session.user });
  if (req.session.isGuest) {
    return res.json({ user: { role_name: 'guest', full_name: 'Гость', login: null } });
  }
  res.json({ user: null });
});

app.post(
  '/api/auth/login',
  asyncRoute(async (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Введите логин и пароль' });
    }
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT u.id, u.login, u.full_name, u.phone, u.password_hash, r.role_name
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.login = $1`,
      [login.trim()]
    );
    const row = rows[0];
    if (!row || row.password_hash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    delete row.password_hash;
    req.session.isGuest = false;
    req.session.user = row;
    res.json({ user: row });
  })
);

app.post('/api/auth/guest', (req, res) => {
  req.session.user = null;
  req.session.isGuest = true;
  res.json({ user: { role_name: 'guest', full_name: 'Гость' } });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.post(
  '/api/auth/register',
  asyncRoute(async (req, res) => {
    const { login, password, full_name, phone, captcha } = req.body;
    if (!login?.trim() || !password || !full_name?.trim()) {
      return res.status(400).json({ error: 'Заполните обязательные поля' });
    }
    if (Number(captcha) !== req.session.captchaAnswer) {
      return res.status(400).json({ error: 'Неверная CAPTCHA. Попробуйте снова.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль не менее 6 символов' });
    }
    const pool = getPool();
    const exists = await pool.query('SELECT id FROM users WHERE login = $1', [login.trim()]);
    if (exists.rows.length) {
      return res.status(400).json({ error: 'Логин уже занят' });
    }
    const roleRes = await pool.query("SELECT id FROM roles WHERE role_name = 'client'");
    const { rows } = await pool.query(
      `INSERT INTO users (login, password_hash, role_id, full_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [login.trim(), hashPassword(password), roleRes.rows[0].id, full_name.trim(), phone || null]
    );
    const userRes = await pool.query(
      `SELECT u.id, u.login, u.full_name, u.phone, r.role_name FROM users u
       JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
      [rows[0].id]
    );
    req.session.isGuest = false;
    req.session.user = userRes.rows[0];
    delete req.session.captchaAnswer;
    res.json({ user: userRes.rows[0] });
  })
);

// ——— Growing conditions ———
app.get(
  '/api/conditions',
  requireRole('manager', 'admin'),
  asyncRoute(async (req, res) => {
    const { rows } = await getPool().query('SELECT * FROM growing_conditions ORDER BY id');
    res.json(rows);
  })
);

// ——— Каталог товаров (фильтры только manager/admin) ———
app.get(
  '/api/products',
  asyncRoute(async (req, res) => {
    const role = getSessionRole(req);
    if (!req.session.user && !req.session.isGuest) {
      return res.status(401).json({ error: 'Войдите в систему или выберите режим «Гость»' });
    }

    let sql = `SELECT p.*, STRING_AGG(pcl.condition_id::text, ',') AS condition_ids
      FROM products p
      LEFT JOIN product_condition_link pcl ON pcl.product_id = p.id
      WHERE 1=1`;
    const params = [];

    if (role === 'manager' || role === 'admin') {
      const { search, category, type, sort, climate, soil, sunlight, watering } = req.query;
      if (search) {
        params.push(`%${search}%`);
        sql += ` AND (p.name ILIKE $${params.length} OR p.article ILIKE $${params.length})`;
      }
      if (category) {
        params.push(category);
        sql += ` AND p.category = $${params.length}`;
      }
      if (type) {
        params.push(type);
        sql += ` AND p.type = $${params.length}`;
      }
      if (climate || soil || sunlight || watering) {
        sql += ` AND p.id IN (
          SELECT pcl2.product_id FROM product_condition_link pcl2
          JOIN growing_conditions gc ON gc.id = pcl2.condition_id WHERE 1=1`;
        if (climate) {
          params.push(climate);
          sql += ` AND gc.climate_zone = $${params.length}`;
        }
        if (soil) {
          params.push(soil);
          sql += ` AND gc.soil_type = $${params.length}`;
        }
        if (sunlight) {
          params.push(sunlight);
          sql += ` AND gc.sunlight = $${params.length}`;
        }
        if (watering) {
          params.push(watering);
          sql += ` AND gc.watering = $${params.length}`;
        }
        sql += ')';
      }
      const sortMap = {
        price_asc: 'p.price ASC',
        price_desc: 'p.price DESC',
        name_asc: 'p.name ASC',
        name_desc: 'p.name DESC',
        date_desc: 'p.created_at DESC',
        date_asc: 'p.created_at ASC',
      };
      sql += ` GROUP BY p.id ORDER BY ${sortMap[sort] || 'p.name ASC'}`;
    } else {
      sql += ' GROUP BY p.id ORDER BY p.name ASC';
    }

    const pool = getPool();
    const products = (await pool.query(sql, params)).rows;
    const categories = (await pool.query('SELECT DISTINCT category FROM products ORDER BY category')).rows;
    res.json({ products, categories, canFilter: role === 'manager' || role === 'admin' });
  })
);

app.get(
  '/api/products/:id',
  asyncRoute(async (req, res) => {
    const role = getSessionRole(req);
    if (!req.session.user && !req.session.isGuest) {
      return res.status(401).json({ error: 'Нет доступа' });
    }
    const pool = getPool();
    const product = (await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id])).rows[0];
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    const conditions = (
      await pool.query(
        `SELECT gc.* FROM growing_conditions gc
         JOIN product_condition_link pcl ON pcl.condition_id = gc.id
         WHERE pcl.product_id = $1`,
        [req.params.id]
      )
    ).rows;
    res.json({ product, conditions, canEdit: role === 'admin' });
  })
);

app.post(
  '/api/products',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    const err = validateProduct(req.body);
    if (err) return res.status(400).json({ error: err });
    const b = req.body;
    const { rows } = await getPool().query(
      `INSERT INTO products (article, name, type, brand, price, quantity, category, description, planting_season)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        b.article.trim(),
        b.name.trim(),
        b.type,
        b.brand.trim(),
        Number(b.price),
        Number(b.quantity) || 0,
        b.category.trim(),
        b.description || null,
        b.planting_season || null,
      ]
    );
    await linkConditions(rows[0].id, b.condition_ids);
    res.json({ id: rows[0].id });
  })
);

app.put(
  '/api/products/:id',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    const err = validateProduct(req.body);
    if (err) return res.status(400).json({ error: err });
    const b = req.body;
    const pool = getPool();
    await pool.query(
      `UPDATE products SET article=$1, name=$2, type=$3, brand=$4, price=$5, quantity=$6,
       category=$7, description=$8, planting_season=$9 WHERE id=$10`,
      [
        b.article.trim(),
        b.name.trim(),
        b.type,
        b.brand.trim(),
        Number(b.price),
        Number(b.quantity) || 0,
        b.category.trim(),
        b.description || null,
        b.planting_season || null,
        req.params.id,
      ]
    );
    await pool.query('DELETE FROM product_condition_link WHERE product_id = $1', [req.params.id]);
    await linkConditions(req.params.id, b.condition_ids);
    res.json({ ok: true });
  })
);

app.delete(
  '/api/products/:id',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    await getPool().query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  })
);

async function linkConditions(productId, conditionIds) {
  if (!conditionIds?.length) return;
  const ids = Array.isArray(conditionIds) ? conditionIds : String(conditionIds).split(',').map(Number);
  const pool = getPool();
  for (const cid of ids.filter(Boolean)) {
    await pool.query(
      `INSERT INTO product_condition_link (product_id, condition_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [productId, cid]
    );
  }
}

function validateProduct(b) {
  if (!b.article?.trim() || !b.name?.trim() || !b.type || !b.brand?.trim() || !b.category?.trim()) {
    return 'Заполните обязательные поля';
  }
  if (Number(b.price) <= 0 || Number.isNaN(Number(b.price))) return 'Цена должна быть больше 0';
  if (Number(b.quantity) < 0 || Number.isNaN(Number(b.quantity))) return 'Количество не может быть отрицательным';
  return null;
}

// ——— Заказы (просмотр manager/admin; CRUD только admin) ———
app.get(
  '/api/orders',
  requireRole('manager', 'admin'),
  asyncRoute(async (req, res) => {
    const { rows } = await getPool().query(
      `SELECT o.*, u.full_name AS client_name, u.login AS client_login
       FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.order_date DESC`
    );
    res.json(rows);
  })
);

app.get(
  '/api/orders/:id',
  requireRole('manager', 'admin'),
  asyncRoute(async (req, res) => {
    const pool = getPool();
    const order = (
      await pool.query(
        `SELECT o.*, u.full_name AS client_name FROM orders o
         JOIN users u ON u.id = o.user_id WHERE o.id = $1`,
        [req.params.id]
      )
    ).rows[0];
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    const items = (
      await pool.query(
        `SELECT oi.*, p.name AS product_name, p.article FROM order_items oi
         JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1`,
        [req.params.id]
      )
    ).rows;
    res.json({ order, items, canCrud: getSessionRole(req) === 'admin' });
  })
);

app.post(
  '/api/orders',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    const err = validateOrder(req.body);
    if (err) return res.status(400).json({ error: err });
    const { user_id, delivery_address, phone, status, items } = req.body;
    const total = items.reduce((s, it) => s + Number(it.count) * Number(it.price_at_order), 0);
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const orderRes = await client.query(
        `INSERT INTO orders (user_id, status, total_amount, delivery_address, phone)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user_id, status || 'new', total, delivery_address.trim(), phone.trim()]
      );
      const orderId = orderRes.rows[0].id;
      for (const it of items) {
        if (Number(it.count) <= 0 || Number(it.price_at_order) <= 0) {
          throw new Error('Некорректные позиции заказа');
        }
        await client.query(
          'INSERT INTO order_items (order_id, product_id, count, price_at_order) VALUES ($1, $2, $3, $4)',
          [orderId, it.product_id, it.count, it.price_at_order]
        );
      }
      await client.query('COMMIT');
      res.json({ id: orderId });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  })
);

app.put(
  '/api/orders/:id',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    const err = validateOrder(req.body, false);
    if (err) return res.status(400).json({ error: err });
    const { user_id, delivery_address, phone, status, items } = req.body;
    const total = items.reduce((s, it) => s + Number(it.count) * Number(it.price_at_order), 0);
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE orders SET user_id=$1, status=$2, total_amount=$3, delivery_address=$4, phone=$5 WHERE id=$6`,
        [user_id, status, total, delivery_address.trim(), phone.trim(), req.params.id]
      );
      await client.query('DELETE FROM order_items WHERE order_id = $1', [req.params.id]);
      for (const it of items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, count, price_at_order) VALUES ($1, $2, $3, $4)',
          [req.params.id, it.product_id, it.count, it.price_at_order]
        );
      }
      await client.query('COMMIT');
      res.json({ ok: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  })
);

app.delete(
  '/api/orders/:id',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    const pool = getPool();
    await pool.query('DELETE FROM order_items WHERE order_id = $1', [req.params.id]);
    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  })
);

app.patch(
  '/api/orders/:id/status',
  requireRole('manager', 'admin'),
  asyncRoute(async (req, res) => {
    const { status } = req.body;
    const allowed = ['new', 'processing', 'shipped', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Некорректный статус' });
    }
    await getPool().query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ ok: true });
  })
);

app.get(
  '/api/clients',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    const { rows } = await getPool().query(
      `SELECT u.id, u.login, u.full_name FROM users u
       JOIN roles r ON r.id = u.role_id WHERE r.role_name = 'client'`
    );
    res.json(rows);
  })
);

function validateOrder(b, needItems = true) {
  if (!b.user_id || !b.delivery_address?.trim() || !b.phone?.trim()) {
    return 'Заполните данные заказа';
  }
  if (needItems && (!b.items?.length)) return 'Добавьте позиции заказа';
  return null;
}

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  await initDatabase();
  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`\n🌿 ${config.companyName}`);
    console.log(`   PostgreSQL: ${config.postgres.database}@${config.postgres.host}`);
    console.log(`   http://localhost:${PORT}\n`);
  });
}

start().catch((err) => {
  console.error('\nОшибка запуска:', err.message);
  console.error('Проверьте PostgreSQL и настройки в .env или config.js\n');
  process.exit(1);
});
