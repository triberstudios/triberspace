import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export class ValidationError extends Error implements ApiError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error implements ApiError {
  statusCode = 401;
  code = 'UNAUTHORIZED';
  
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error implements ApiError {
  statusCode = 403;
  code = 'FORBIDDEN';
  
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export async function errorHandler(
  error: FastifyError | ApiError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  const statusCode = error.statusCode || 500;
  const code = (error as ApiError).code || 'INTERNAL_ERROR';
  
  let message = error.message;
  if (statusCode === 500) {
    message = 'Internal server error';
  }

  return reply.code(statusCode).send({
    error: {
      code,
      message,
      statusCode
    }
  });
}