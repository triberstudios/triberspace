import { FastifyInstance } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';

export async function v1AuthRoutes(fastify: FastifyInstance) {
  // Get current user session with extended info
  fastify.get('/me', {
    preHandler: authMiddleware
  }, async (request: AuthenticatedRequest, reply) => {
    return {
      success: true,
      data: {
        user: request.user,
        session: {
          id: request.session?.session.id,
          expiresAt: request.session?.session.expiresAt
        }
      }
    };
  });

  // Extended user profile endpoint
  fastify.get('/profile', {
    preHandler: authMiddleware
  }, async (request: AuthenticatedRequest, reply) => {
    // This could be extended to fetch additional user data
    // like creator status, tribe memberships, etc.
    return {
      success: true,
      data: {
        user: request.user,
        // Future: Add creator profile, tribe memberships, etc.
      }
    };
  });
}