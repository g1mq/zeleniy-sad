/**
 * Настройки проекта — меняйте здесь данные под своё задание на экзамене.
 */
module.exports = {
  companyName: 'ООО «Зелёный Сад»',
  slogan: 'Природа в вашем доме',
  port: 3847,
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
  postgres: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'green_garden',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
  },
};
