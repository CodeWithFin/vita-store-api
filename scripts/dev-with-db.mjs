import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const dataDir = join(rootDir, '.data', 'postgres');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'vitastore',
  password: 'vitastore_secret',
  port: 5432,
  persistent: true,
});

console.log('Starting embedded PostgreSQL...');
if (!existsSync(join(dataDir, 'PG_VERSION'))) {
  await pg.initialise();
}
await pg.start();

try {
  await pg.createDatabase('vitastore');
} catch {
  // Database already exists on subsequent runs.
}

const client = pg.getPgClient('vitastore');
await client.connect();

const schemaCheck = await client.query(`SELECT to_regclass('public.items') AS table_name`);
if (!schemaCheck.rows[0].table_name) {
  const initSql = readFileSync(join(rootDir, 'docker', 'init.sql'), 'utf8');
  await client.query(initSql);
  console.log('Database schema initialized.');
} else {
  const migrationFiles = ['002_product_types_batches.sql', '003_brands.sql'];
  for (const file of migrationFiles) {
    const migrationPath = join(rootDir, 'docker', 'migrations', file);
    if (existsSync(migrationPath)) {
      const migrationSql = readFileSync(migrationPath, 'utf8');
      await client.query(migrationSql);
      console.log(`Database migration applied: ${file}`);
    }
  }
}

await client.end();

console.log('Starting API server on http://localhost:3000');
console.log('App UI: http://localhost:3000');
console.log('Swagger UI: http://localhost:3000/docs');

const server = spawn('node', ['--watch', 'src/server.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, DB_HOST: 'localhost' },
});

const shutdown = async () => {
  server.kill('SIGTERM');
  await pg.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.on('exit', async (code) => {
  await pg.stop();
  process.exit(code ?? 0);
});
