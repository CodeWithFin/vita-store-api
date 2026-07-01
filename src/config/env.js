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
  auth: {
    secret: process.env.AUTH_SECRET ?? 'dev-secret-change-in-production',
    username: process.env.AUTH_USERNAME ?? 'admin',
    password: process.env.AUTH_PASSWORD ?? 'admin123',
    sessionTtl: process.env.AUTH_SESSION_TTL ?? '7d',
    sessionMaxAge: Number(process.env.AUTH_SESSION_MAX_AGE ?? 60 * 60 * 24 * 7),
  },
};

export default env;
