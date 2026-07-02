import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', '..', 'docker', 'migrations');

export async function runMigrations(pool, log) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  if (!existsSync(migrationsDir)) return;

  const files = ['002_product_types_batches.sql', '003_brands.sql'];

  for (const file of files) {
    const migrationId = file.replace(/\.sql$/, '');
    const applied = await pool.query(
      `SELECT 1 FROM schema_migrations WHERE id = $1 LIMIT 1`,
      [migrationId]
    );

    if (applied.rowCount > 0) continue;

    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [migrationId]);
      await client.query('COMMIT');
      log.info(`Applied database migration: ${migrationId}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
