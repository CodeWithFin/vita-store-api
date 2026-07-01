import fp from 'fastify-plugin';
import { createPool } from '../db/index.js';

async function dbConnector(fastify) {
  const pool = createPool();

  try {
    const client = await pool.connect();
    client.release();
    fastify.log.info('PostgreSQL connection established');
  } catch (err) {
    fastify.log.error(err, 'Failed to connect to PostgreSQL');
    throw err;
  }

  fastify.decorate('db', pool);
}

export default fp(dbConnector, {
  name: 'db-connector',
});
