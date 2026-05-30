-- Информационная система ООО «Зелёный Сад»
-- PostgreSQL, 3NF
-- На экзамене меняют РЕДКО — только если в ТЗ другие поля/таблицы.
-- Обычно правят database/seed.sql (данные), не этот файл.

-- ========== roles — роли (guest, client, manager, admin) ==========
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(20) NOT NULL UNIQUE
        CHECK (role_name IN ('guest', 'client', 'manager', 'admin'))
);

-- ========== users — логины и хеши паролей ==========
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========== growing_conditions — справочник условий выращивания ==========
CREATE TABLE IF NOT EXISTS growing_conditions (
    id SERIAL PRIMARY KEY,
    climate_zone VARCHAR(50) NOT NULL,
    soil_type VARCHAR(50) NOT NULL,
    sunlight VARCHAR(30) NOT NULL,
    watering VARCHAR(30) NOT NULL
);

-- ========== products — товары (растения, семена) ==========
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    article VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('seed', 'seedling', 'plant', 'bulb')),
    brand VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    category VARCHAR(50) NOT NULL,
    description TEXT,
    image_path VARCHAR(255),
    planting_season VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========== product_condition_link — связь товар ↔ условия (N:M) ==========
CREATE TABLE IF NOT EXISTS product_condition_link (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    condition_id INTEGER NOT NULL REFERENCES growing_conditions(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, condition_id)
);

-- ========== orders — заказы клиентов ==========
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'processing', 'shipped', 'completed', 'cancelled')),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    delivery_address VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========== order_items — позиции в заказе ==========
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    count INTEGER NOT NULL CHECK (count > 0),
    price_at_order DECIMAL(10, 2) NOT NULL CHECK (price_at_order > 0)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
