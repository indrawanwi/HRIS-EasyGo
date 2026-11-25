require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    // Create table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
      );
    `);
    // Insert a sample employee if table is empty
    const { rows } = await client.query('SELECT COUNT(*) FROM employees');
    const count = parseInt(rows[0].count, 10);
    if (count === 0) {
      await client.query(
        `INSERT INTO employees (name, email) VALUES
         ('Alice Example', 'alice@example.com'),
         ('Bob Sample', 'bob@example.com');`
      );
      console.log('Inserted sample employee data');
    } else {
      console.log('Employees table already has data');
    }
  } catch (err) {
    console.error('Error initializing DB:', err);
  } finally {
    await client.end();
  }
})();
