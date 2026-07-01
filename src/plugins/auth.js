import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import env from '../config/env.js';
import { AUTH_COOKIE } from '../utils/auth.js';

async function authPlugin(fastify) {
  await fastify.register(cookie);

  await fastify.register(jwt, {
    secret: env.auth.secret,
    cookie: {
      cookieName: AUTH_COOKIE,
      signed: false,
    },
  });

  fastify.decorate('authenticate', async function authenticate(request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
  });
}

export default fp(authPlugin, { name: 'auth-plugin' });
