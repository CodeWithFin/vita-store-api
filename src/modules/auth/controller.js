import env from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import { safeEqual, AUTH_COOKIE } from '../../utils/auth.js';

export async function login(request, reply) {
  const { username, password } = request.body;

  const validUser = safeEqual(username, env.auth.username);
  const validPass = safeEqual(password, env.auth.password);

  if (!validUser || !validPass) {
    throw new AppError(401, 'Invalid username or password');
  }

  const token = await reply.jwtSign(
    { username: env.auth.username },
    { expiresIn: env.auth.sessionTtl }
  );

  reply.setCookie(AUTH_COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: env.auth.sessionMaxAge,
  });

  return reply.send({
    data: {
      user: { username: env.auth.username },
      message: 'Signed in successfully',
    },
  });
}

export async function logout(_request, reply) {
  reply.clearCookie(AUTH_COOKIE, { path: '/' });
  return reply.send({
    data: { message: 'Signed out successfully' },
  });
}

export async function me(request, reply) {
  return reply.send({
    data: {
      user: { username: request.user.username },
    },
  });
}
