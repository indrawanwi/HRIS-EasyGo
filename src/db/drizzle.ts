import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './drizzle-schema';

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

export const db = drizzle(pool, { schema });
export { pool, schema };
export default db;
