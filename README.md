# Информационная система ООО «Зелёный Сад»

Готовое решение для демонстрационного экзамена (80 баллов): прототип, **PostgreSQL**, приложение.

> **На экзамен без интернета:** откройте **`ИНСТРУКЦИЯ_ЭКЗАМЕН.md`** — полный порядок сдачи и замена всех данных из нового ТЗ.

## Структура проекта

| Папка | Блок | Содержимое |
|-------|------|------------|
| `prototype/` | Блок 1 | 6 HTML-экранов, логотип |
| `database/` | Блок 2 | `schema.sql`, `seed.sql`, ER → PDF |
| `app/` | Блок 3 | Node.js + Express + PostgreSQL |

## 1. Установка PostgreSQL

1. Установите [PostgreSQL](https://www.postgresql.org/download/) (16+).
2. Создайте базу (pgAdmin или `psql`):

```sql
CREATE DATABASE green_garden
  ENCODING 'UTF8'
  LC_COLLATE 'Russian_Russia.1251'
  LC_CTYPE 'Russian_Russia.1251'
  TEMPLATE template0;
```

(Если локаль недоступна, достаточно `CREATE DATABASE green_garden;`)

3. Скопируйте настройки подключения:

```bash
copy .env.example .env
```

Отредактируйте `.env` в корне проекта:

```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=green_garden
PGUSER=postgres
PGPASSWORD=ваш_пароль
```

## 2. Запуск приложения

```bash
cd app
npm install
npm start
```

Или **`zapusk.bat`** в корне проекта.

При первом запуске автоматически выполняются `schema.sql` и `seed.sql`.

Откройте: **http://localhost:3847**

### Полезные команды

| Команда | Действие |
|---------|----------|
| `npm start` | Запуск сервера |
| `npm run db:init` | Создать таблицы и данные (если БД пустая) |
| `npm run db:reset` | Удалить все таблицы и загрузить заново |

## Тестовые учётные записи

| Роль | Логин | Пароль |
|------|-------|--------|
| Администратор | `admin_garden` | `GardenAdmin2026!` |
| Менеджер | `manager01` | `Manager#789` |
| Клиент | `client_ivanov` | `Client@321` |
| Гость | кнопка на экране входа | — |

Проверка хешей: `SELECT login, password_hash FROM users;`

## Как подставить свои данные

1. **Бренд** — `config.js`, логотип `app/public/images/logo.png`
2. **Данные** — `database/seed.sql`
3. После правок: `cd app` → `npm run db:reset` → `npm start`

## Сдача на экзамене

1. Figma (из `prototype/`)
2. PDF ER-диаграммы (`database/ER-diagram.html` → Печать → PDF)
3. Скрипты `database/schema.sql`, `seed.sql`
4. Дамп БД (опционально): `pg_dump -U postgres green_garden > backup.sql`
5. Папка `app/` + демонстрация под 4 ролями
