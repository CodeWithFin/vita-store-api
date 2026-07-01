import { Type } from '@sinclair/typebox';

export const LoginBodySchema = Type.Object({
  username: Type.String({ minLength: 1 }),
  password: Type.String({ minLength: 1 }),
});

export const AuthUserSchema = Type.Object({
  username: Type.String(),
});

export const AuthResponseSchema = Type.Object({
  data: Type.Object({
    user: AuthUserSchema,
    message: Type.Optional(Type.String()),
  }),
});

export const ErrorResponseSchema = Type.Object({
  statusCode: Type.Integer(),
  error: Type.String(),
  message: Type.String(),
});
