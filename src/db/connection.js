require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

let connectionString = process.env.DATABASE_URL || '';
if (connectionString.includes('sslmode=require')) {
  connectionString = connectionString.replace('sslmode=require', 'sslmode=verify-full');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 10000,
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function getClient() {
  const client = await pool.connect();
  return client;
}

module.exports = {
  pool,
  query,
  getClient,
};
