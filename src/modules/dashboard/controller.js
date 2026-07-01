import * as dashboardRepo from './repository.js';

export async function getMetrics(request, reply) {
  const metrics = await dashboardRepo.getMetrics(request.server.db);
  return reply.send({ data: metrics });
}
