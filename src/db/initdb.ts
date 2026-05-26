import 'dotenv/config';
import mysql from 'mysql2/promise';

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`Base de datos '${process.env.DB_NAME}' asegurada`);
  await connection.end();
}

initDatabase().catch(err => {
  console.error('initdb falló:', err);
  process.exit(1);
});
