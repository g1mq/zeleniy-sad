/**
 * Работа с PostgreSQL.
 * На экзамене данные меняют в database/seed.sql, затем: npm run db:reset
 */
const fs = require('fs');
const path = require('path');
// .env лежит в КОРНЕ проекта (рядом с config.js), не в папке app
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const crypto = require('crypto');
const { Pool } = require('pg');
const config = require('../config');

// SQL-скрипты: структура таблиц и тестовые данные
const SCHEMA = path.join(__dirname, '..', 'database', 'schema.sql');
const SEED = path.join(__dirname, '..', 'database', 'seed.sql');

let pool;

function getPoolConfig() {
  if (config.postgres.connectionString) {
    return { connectionString: config.postgres.connectionString };
  }
  return {
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    user: config.postgres.user,
    password: config.postgres.password,
  };
}

/** Хеш пароля для БД (SHA-256). В seed.sql хранится хеш, не сам пароль. */
function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function getPool() {
  if (!pool) {
    pool = new Pool(getPoolConfig());
    pool.on('error', (err) => console.error('PostgreSQL:', err.message));
  }
  return pool;
}

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await getPool().query(sql);
}

/** При первом запуске: создать таблицы и загрузить seed.sql, если БД пустая */
async function initDatabase() {
  const p = getPool();
  const { rows } = await p.query(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'roles'
     ) AS exists`
  );
  if (!rows[0].exists) {
    console.log('Создание таблиц PostgreSQL...');
    await runSqlFile(SCHEMA);
    console.log('Загрузка тестовых данных...');
    await runSqlFile(SEED);
    console.log('База данных готова.');
  }
}

/** После правки seed.sql на экзамене: npm run db:reset — пересоздать всё заново */
async function resetDatabase() {
  const p = getPool();
  await p.query('DROP SCHEMA public CASCADE');
  await p.query('CREATE SCHEMA public');
  await p.query('GRANT ALL ON SCHEMA public TO public');
  await runSqlFile(SCHEMA);
  await runSqlFile(SEED);
  console.log('База данных пересоздана.');
}

module.exports = { getPool, hashPassword, initDatabase, resetDatabase };
