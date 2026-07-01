import * as movementsRepo from './repository.js';

export async function createMovement(request, reply) {
  const result = await movementsRepo.createMovement(request.server.db, request.body);
  return reply.status(201).send({ data: result });
}

export async function listMovements(request, reply) {
  const { item_id: itemId, page = 1, limit = 20 } = request.query;
  const result = await movementsRepo.findAll(request.server.db, { itemId, page, limit });
  return reply.send(result);
}
