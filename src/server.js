import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import env from './config/env.js';
import dbConnector from './plugins/db-connector.js';
import authPlugin from './plugins/auth.js';
import { closePool } from './db/index.js';
import { AppError } from './utils/errors.js';
import { isPublicPath, isProtectedPath } from './utils/auth.js';
import authRoutes from './modules/auth/routes.js';
import itemsRoutes from './modules/items/routes.js';
import movementsRoutes from './modules/movements/routes.js';
import dashboardRoutes from './modules/dashboard/routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.nodeEnv === 'production' ? 'info' : 'debug',
    },
  }).withTypeProvider();

  await fastify.register(cors, { origin: true });

  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
  });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'VitaStore Inventory API',
        description:
          'RESTful API for core inventory management: product catalog, stock movements ledger, and dashboard metrics.',
        version: '1.0.0',
      },
      tags: [
        { name: 'Auth', description: 'Authentication' },
        { name: 'Items', description: 'Inventory item catalog operations' },
        { name: 'Movements', description: 'Stock movement ledger operations' },
        { name: 'Dashboard', description: 'Aggregated inventory metrics' },
        { name: 'Health', description: 'Service health checks' },
      ],
      servers: [
        {
          url: `http://localhost:${env.port}`,
          description: 'Local development',
        },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });

  await fastify.register(dbConnector);
  await fastify.register(authPlugin);

  fastify.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0];
    if (isPublicPath(path)) return;

    try {
      await request.jwtVerify();
    } catch {
      if (path.startsWith('/api/')) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      if (isProtectedPath(path)) {
        return reply.redirect('/login');
      }
    }
  });

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name,
        message: error.message,
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: error.message,
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: env.nodeEnv === 'production' ? 'An unexpected error occurred' : error.message,
    });
  });

  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Health check',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  );

  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(itemsRoutes, { prefix: '/api/items' });
  await fastify.register(movementsRoutes, { prefix: '/api/movements' });
  await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });

  fastify.get('/login', async (request, reply) => {
    try {
      await request.jwtVerify();
      return reply.redirect('/dashboard');
    } catch {
      return reply.sendFile('login.html');
    }
  });

  fastify.get('/', async (_request, reply) => reply.sendFile('index.html'));

  fastify.get('/dashboard', async (_request, reply) => reply.sendFile('dashboard.html'));

  await fastify.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    index: false,
  });

  fastify.setNotFoundHandler(async (request, reply) => {
    const path = request.url.split('?')[0];
    if (path.startsWith('/api') || path.startsWith('/docs')) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Route not found',
      });
    }

    if (isProtectedPath(path)) {
      return reply.redirect('/login');
    }

    return reply.sendFile('index.html');
  });

  return fastify;
}

async function start() {
  const fastify = await buildServer();

  const shutdown = async (signal) => {
    fastify.log.info(`Received ${signal}, shutting down...`);
    await fastify.close();
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await fastify.listen({ port: env.port, host: env.host });
    fastify.log.info(`App available at http://${env.host}:${env.port}`);
    fastify.log.info(`Swagger UI available at http://${env.host}:${env.port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
