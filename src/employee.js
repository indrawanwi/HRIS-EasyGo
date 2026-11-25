require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

/**
 * Creates and returns a connected pg Client.
 * Caller is responsible for calling client.end() after use.
 */
async function createClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

/**
 * Fetch all employees.
 * Assumes a table `employees` with at least `id`, `name`, `email` columns.
 * Returns an array of row objects.
 */
async function getAllEmployees() {
  const client = await createClient();
  try {
    const res = await client.query('SELECT id, name, email FROM employees');
    return res.rows;
  } finally {
    await client.end();
  }
}

/**
 * Fetch a single employee by ID.
 * @param {number|string} id - Employee identifier.
 * @returns {object|null} employee row or null if not found.
 */
async function getEmployeeById(id) {
  const client = await createClient();
  try {
    const res = await client.query('SELECT id, name, email FROM employees WHERE id = $1', [id]);
    return res.rows[0] || null;
  } finally {
    await client.end();
  }
}

module.exports = { getAllEmployees, getEmployeeById };
