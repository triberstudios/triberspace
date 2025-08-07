import { FastifyInstance } from 'fastify';
import { v1AuthRoutes } from './auth';
import { v1UsersRoutes } from './users';
import { v1WorldsRoutes } from './worlds';
import { v1CreatorsRoutes } from './creators';
import { v1AvatarsRoutes } from './avatars';
import { v1StoreRoutes } from './store';
import { v1PointsRoutes } from './points';

export async function v1Routes(fastify: FastifyInstance) {
  // Auth routes - extends your existing Better Auth
  await fastify.register(v1AuthRoutes, { prefix: '/auth' });
  
  // User routes - user profile management
  await fastify.register(v1UsersRoutes, { prefix: '/users' });
  
  // Worlds routes - public discovery with search and details
  await fastify.register(v1WorldsRoutes, { prefix: '/worlds' });
  
  // Creators routes - creator profiles and management
  await fastify.register(v1CreatorsRoutes, { prefix: '/creators' });

  // Avatar routes - avatar customization and inventory
  await fastify.register(v1AvatarsRoutes, { prefix: '/avatars' });

  // Store routes - product browsing and purchasing
  await fastify.register(v1StoreRoutes, { prefix: '/store' });

  // Points routes - points balance, packages, and transactions
  await fastify.register(v1PointsRoutes, { prefix: '/points' });

  // Health check for v1 API
  fastify.get('/', async (request, reply) => {
    return {
      success: true,
      data: {
        message: 'Triberspace API v1',
        version: '1.0.0',
        endpoints: [
          '/v1/auth',
          '/v1/users',
          '/v1/worlds',
          '/v1/creators',
          '/v1/avatars',
          '/v1/store',
          '/v1/points'
        ]
      }
    };
  });
}