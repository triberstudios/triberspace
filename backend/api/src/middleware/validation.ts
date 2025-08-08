import { FastifyRequest, FastifyReply } from 'fastify';
import { z, ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = schema.safeParse(request.body);
      
      if (!result.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      request.body = result.data;
    } catch (error) {
      request.log.error(error as Error, 'Validation error');
      return reply.code(400).send({ error: 'Invalid request data' });
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = schema.safeParse(request.params);
      
      if (!result.success) {
        return reply.code(400).send({
          error: 'Invalid parameters',
          details: result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      request.params = result.data;
    } catch (error) {
      request.log.error(error as Error, 'Parameter validation error');
      return reply.code(400).send({ error: 'Invalid parameters' });
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = schema.safeParse(request.query);
      
      if (!result.success) {
        return reply.code(400).send({
          error: 'Invalid query parameters',
          details: result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      request.query = result.data;
    } catch (error) {
      request.log.error(error as Error, 'Query validation error');
      return reply.code(400).send({ error: 'Invalid query parameters' });
    }
  };
}