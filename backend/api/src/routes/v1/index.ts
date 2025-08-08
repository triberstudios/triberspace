import { FastifyInstance } from 'fastify';
import { v1AuthRoutes } from './auth';
import { v1UsersRoutes } from './users';
import { v1WorldsRoutes } from './worlds';
import { v1SpacesRoutes } from './spaces';
import { v1EventsRoutes } from './events';
import { v1TribesRoutes } from './tribes';
import { v1CreatorsRoutes } from './creators';
import { v1AvatarsRoutes } from './avatars';
import { v1InventoryRoutes } from './inventory';
import { v1StoreRoutes } from './store';
import { v1PointsRoutes } from './points';
import { v1UploadsRoutes } from './uploads';

export async function v1Routes(fastify: FastifyInstance) {
  // Auth routes - extends your existing Better Auth
  await fastify.register(v1AuthRoutes, { prefix: '/auth' });
  
  // User routes - user profile management
  await fastify.register(v1UsersRoutes, { prefix: '/users' });
  
  // Worlds routes - public discovery with search and details + creator CRUD
  await fastify.register(v1WorldsRoutes, { prefix: '/worlds' });
  
  // Spaces routes - public discovery and creator CRUD
  await fastify.register(v1SpacesRoutes, { prefix: '/spaces' });
  
  // Events routes - event discovery and creator CRUD with attendance
  await fastify.register(v1EventsRoutes, { prefix: '/events' });
  
  // Tribes routes - tribe discovery and membership system
  await fastify.register(v1TribesRoutes, { prefix: '/tribes' });
  
  // Creators routes - creator profiles and management
  await fastify.register(v1CreatorsRoutes, { prefix: '/creators' });

  // Avatar routes - avatar customization and equipment
  await fastify.register(v1AvatarsRoutes, { prefix: '/avatars' });

  // Inventory routes - universal user inventory management
  await fastify.register(v1InventoryRoutes, { prefix: '/inventory' });

  // Store routes - product browsing and purchasing
  await fastify.register(v1StoreRoutes, { prefix: '/store' });

  // Points routes - points balance, packages, and transactions
  await fastify.register(v1PointsRoutes, { prefix: '/points' });

  // Uploads - Cloudflare R2 presigned uploads
  await fastify.register(v1UploadsRoutes, { prefix: '/uploads' });

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
          '/v1/spaces',
          '/v1/events',
          '/v1/tribes',
          '/v1/creators',
          '/v1/avatars',
          '/v1/inventory',
          '/v1/store',
          '/v1/points',
          '/v1/uploads'
        ]
      }
    };
  });
}