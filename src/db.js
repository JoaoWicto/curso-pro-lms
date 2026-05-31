
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL não configurada. Crie um banco PostgreSQL no Supabase/Neon e coloque a URL no .env ou no Render.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}
async function one(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}
async function many(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

module.exports = { pool, query, one, many };
