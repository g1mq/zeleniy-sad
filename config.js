/**
 * Настройки проекта — меняйте здесь данные под своё задание на экзамене.
 * (.env загружается в server.js и app/db.js ДО чтения этого файла)
 *
 * На экзамене обычно меняют:
 *   - companyName, slogan, colors — здесь
 *   - те же цвета в app/public/css/app.css (:root)
 *   - товары и пользователи — в database/seed.sql
 */
module.exports = {
  // Название и слоган (логотип — отдельный файл logo.png)
  companyName: 'ООО «Зелёный Сад»',
  slogan: 'Природа в вашем доме',
  port: 3847, // порт сайта в браузере: http://localhost:3847

  // Цвета брендбука — продублируйте в app/public/css/app.css
  colors: {
    green: '#22C55E',
    brown: '#8B7355',
    yellow: '#FCD34D',
    cream: '#F8FAF5',
  },
  fonts: {
    heading: 'Nunito, sans-serif',
    body: 'Open Sans, sans-serif',
  },
  logoPath: '/images/logo.png',

  // Подключение к PostgreSQL — пароль и имя БД в файле .env (корень проекта)
  postgres: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'green_garden',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
  },
};
