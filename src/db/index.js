import pg from 'pg';
import env from '../config/env.js';

const { Pool } = pg;

let pool;

export function createPool() {
  if (!pool) {
    pool = new Pool({
      host: env.db.host,
      port: env.db.port,
      database: env.db.database,
      user: env.db.user,
      password: env.db.password,
      max: env.db.max,
    });

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error', err);
    });
  }

  return pool;
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool has not been initialized');
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
