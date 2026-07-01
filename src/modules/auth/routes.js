import {
  LoginBodySchema,
  AuthResponseSchema,
  ErrorResponseSchema,
} from './schema.js';
import * as controller from './controller.js';

export default async function authRoutes(fastify) {
  fastify.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Sign in',
        body: LoginBodySchema,
        response: {
          200: AuthResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    controller.login
  );

  fastify.post(
    '/logout',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Sign out',
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: { message: { type: 'string' } },
              },
            },
          },
        },
      },
    },
    controller.logout
  );

  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Current user',
        response: {
          200: AuthResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    controller.me
  );
}
