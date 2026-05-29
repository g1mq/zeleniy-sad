/**
 * Считает SHA-256 для пароля (для вставки в seed.sql).
 * Запуск: node scripts/hash-password.js "ВашПароль"
 */
const crypto = require('crypto');
const pwd = process.argv[2];
if (!pwd) {
  console.log('Использование: node scripts/hash-password.js "ВашПароль"');
  process.exit(1);
}
console.log(crypto.createHash('sha256').update(pwd).digest('hex'));
