const { initDatabase, getPool } = require('../db');

initDatabase()
  .then(() => getPool().end())
  .then(() => {
    console.log('Готово.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
