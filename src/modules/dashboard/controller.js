import * as dashboardRepo from './repository.js';

export async function getMetrics(request, reply) {
  const metrics = await dashboardRepo.getMetrics(request.server.db);
  return reply.send({ data: metrics });
}

export async function getExpiring(request, reply) {
  const days = request.query.days ? Number(request.query.days) : undefined;
  const data = await dashboardRepo.getExpiringBatches(request.server.db, { days });
  return reply.send({ data, count: data.length });
}

export async function getBrands(request, reply) {
  const data = await dashboardRepo.getBrands(request.server.db);
  return reply.send({ data, count: data.length });
}
