-- Тестовые данные (пароли: см. README)
-- SHA-256: GardenAdmin2026!, Manager#789, Client@321

INSERT INTO roles (role_name) VALUES
  ('guest'), ('client'), ('manager'), ('admin')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO users (login, password_hash, role_id, full_name, phone) VALUES
  ('admin_garden', 'a5de16289fb4750284fb4b2c20329cb4728b6562ca9728e7b8a1c987f144cdc6',
   (SELECT id FROM roles WHERE role_name = 'admin'), 'Петрова А.В.', '+7 (900) 111-11-11'),
  ('manager01', '94c105480e2170eb33279626c725f3b9290e5a8d61e51f642db92c59bd34f732',
   (SELECT id FROM roles WHERE role_name = 'manager'), 'Сидоров Е.К.', '+7 (900) 222-22-22'),
  ('client_ivanov', '59e42b17c388010e30a206902bd13e9f8e4562ea491e4809da96406926828279',
   (SELECT id FROM roles WHERE role_name = 'client'), 'Иванов Д.М.', '+7 (900) 333-33-33')
ON CONFLICT (login) DO NOTHING;

INSERT INTO growing_conditions (climate_zone, soil_type, sunlight, watering) VALUES
  ('Умеренный', 'Суглинок', 'Солнце', 'Умеренно'),
  ('Умеренный', 'Универсальная', 'Полутень', 'Умеренно'),
  ('Тропический', 'Песчаная', 'Солнце', 'Ежедневно'),
  ('Умеренный', 'Торфяная', 'Тень', 'Редко'),
  ('Субтропический', 'Суглинок', 'Солнце', 'Ежедневно');

INSERT INTO products (article, name, type, brand, price, quantity, category, description, planting_season) VALUES
  ('FL-ROSE-001', 'Роза чайная «Аврора»', 'plant', 'GreenLine', 890.00, 15, 'Цветы', 'Комнатно-садовая роза, ароматная.', 'Весна'),
  ('VG-TOM-042', 'Томаты «Бычье сердце»', 'seed', 'AgroSem', 129.50, 120, 'Овощи', 'Среднеспелый, крупноплодный сорт.', 'Весна'),
  ('HR-BAS-010', 'Базилик зелёный', 'seedling', 'HerbGarden', 79.00, 40, 'Зелень', 'Ароматная зелень для кухни.', 'Лето'),
  ('ID-FIC-007', 'Фикус Бенджамина', 'plant', 'TropicHome', 1450.00, 8, 'Комнатные', 'Декоративное комнатное растение.', 'Круглый год'),
  ('FL-TUL-020', 'Тюльпан «Апельдорн»', 'bulb', 'BulbMaster', 45.00, 200, 'Цветы', 'Классический голландский тюльпан.', 'Осень'),
  ('TR-BIR-001', 'Берёза повислая', 'plant', 'ForestPark', 3200.00, 3, 'Деревья', 'Саженец для сада, 1.2 м.', 'Весна')
ON CONFLICT (article) DO NOTHING;

INSERT INTO product_condition_link (product_id, condition_id)
SELECT p.id, gc.id FROM products p, growing_conditions gc
WHERE p.article = 'FL-ROSE-001' AND gc.climate_zone = 'Умеренный' AND gc.soil_type = 'Суглинок'
ON CONFLICT DO NOTHING;

INSERT INTO product_condition_link (product_id, condition_id)
SELECT p.id, gc.id FROM products p, growing_conditions gc
WHERE p.article = 'FL-ROSE-001' AND gc.climate_zone = 'Умеренный' AND gc.soil_type = 'Универсальная'
ON CONFLICT DO NOTHING;

INSERT INTO product_condition_link (product_id, condition_id)
SELECT p.id, gc.id FROM products p, growing_conditions gc
WHERE p.article = 'VG-TOM-042' AND gc.climate_zone = 'Умеренный' AND gc.soil_type = 'Суглинок'
ON CONFLICT DO NOTHING;

INSERT INTO product_condition_link (product_id, condition_id)
SELECT p.id, gc.id FROM products p, growing_conditions gc
WHERE p.article = 'HR-BAS-010' AND gc.climate_zone = 'Умеренный' AND gc.soil_type = 'Универсальная'
ON CONFLICT DO NOTHING;

INSERT INTO product_condition_link (product_id, condition_id)
SELECT p.id, gc.id FROM products p, growing_conditions gc
WHERE p.article = 'ID-FIC-007' AND gc.climate_zone = 'Тропический' AND gc.soil_type = 'Песчаная'
ON CONFLICT DO NOTHING;

INSERT INTO product_condition_link (product_id, condition_id)
SELECT p.id, gc.id FROM products p, growing_conditions gc
WHERE p.article = 'ID-FIC-007' AND gc.climate_zone = 'Субтропический' AND gc.soil_type = 'Суглинок'
ON CONFLICT DO NOTHING;

INSERT INTO product_condition_link (product_id, condition_id)
SELECT p.id, gc.id FROM products p, growing_conditions gc
WHERE p.article = 'FL-TUL-020' AND gc.climate_zone = 'Умеренный' AND gc.soil_type = 'Суглинок'
ON CONFLICT DO NOTHING;

INSERT INTO product_condition_link (product_id, condition_id)
SELECT p.id, gc.id FROM products p, growing_conditions gc
WHERE p.article = 'TR-BIR-001' AND gc.climate_zone = 'Умеренный' AND gc.soil_type = 'Суглинок'
ON CONFLICT DO NOTHING;

INSERT INTO orders (user_id, order_date, status, total_amount, delivery_address, phone)
SELECT u.id, '2026-05-20 10:30:00'::timestamp, 'completed', 1019.50,
       'г. Москва, ул. Садовая, 12', '+7 (900) 333-33-33'
FROM users u WHERE u.login = 'client_ivanov'
AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.total_amount = 1019.50);

INSERT INTO orders (user_id, order_date, status, total_amount, delivery_address, phone)
SELECT u.id, '2026-05-25 14:15:00'::timestamp, 'processing', 1529.00,
       'г. Москва, ул. Садовая, 12', '+7 (900) 333-33-33'
FROM users u WHERE u.login = 'client_ivanov'
AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.total_amount = 1529.00);

INSERT INTO order_items (order_id, product_id, count, price_at_order)
SELECT o.id, p.id, 2, 129.50 FROM orders o
JOIN users u ON u.id = o.user_id
JOIN products p ON p.article = 'VG-TOM-042'
WHERE u.login = 'client_ivanov' AND o.total_amount = 1019.50
AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id = p.id);

INSERT INTO order_items (order_id, product_id, count, price_at_order)
SELECT o.id, p.id, 1, 79.00 FROM orders o
JOIN users u ON u.id = o.user_id
JOIN products p ON p.article = 'HR-BAS-010'
WHERE u.login = 'client_ivanov' AND o.total_amount = 1019.50
AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id = p.id);

INSERT INTO order_items (order_id, product_id, count, price_at_order)
SELECT o.id, p.id, 10, 45.00 FROM orders o
JOIN users u ON u.id = o.user_id
JOIN products p ON p.article = 'FL-TUL-020'
WHERE u.login = 'client_ivanov' AND o.total_amount = 1019.50
AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id = p.id);

INSERT INTO order_items (order_id, product_id, count, price_at_order)
SELECT o.id, p.id, 1, 890.00 FROM orders o
JOIN users u ON u.id = o.user_id
JOIN products p ON p.article = 'FL-ROSE-001'
WHERE u.login = 'client_ivanov' AND o.total_amount = 1529.00
AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id = p.id);

INSERT INTO order_items (order_id, product_id, count, price_at_order)
SELECT o.id, p.id, 1, 1450.00 FROM orders o
JOIN users u ON u.id = o.user_id
JOIN products p ON p.article = 'ID-FIC-007'
WHERE u.login = 'client_ivanov' AND o.total_amount = 1529.00
AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id = p.id);
