require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    const res = await client.query('SELECT 1 AS result');
    console.log('Connection successful, query result:', res.rows[0].result);
  } catch (err) {
    console.error('Error connecting to Neon Postgres:', err);
  } finally {
    await client.end();
  }
})();
