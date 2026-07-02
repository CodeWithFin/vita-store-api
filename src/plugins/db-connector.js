import fp from 'fastify-plugin';
import { createPool } from '../db/index.js';
import { runMigrations } from '../db/migrate.js';

async function dbConnector(fastify) {
  const pool = createPool();

  try {
    const client = await pool.connect();
    client.release();
    fastify.log.info('PostgreSQL connection established');
    await runMigrations(pool, fastify.log);
  } catch (err) {
    fastify.log.error(err, 'Failed to connect to PostgreSQL');
    throw err;
  }

  fastify.decorate('db', pool);
}

export default fp(dbConnector, {
  name: 'db-connector',
});
