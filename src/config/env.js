import 'dotenv/config';

const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'vitastore',
    user: process.env.DB_USER ?? 'vitastore',
    password: process.env.DB_PASSWORD ?? 'vitastore_secret',
    max: Number(process.env.DB_POOL_MAX ?? 20),
  },
};

export default env;
