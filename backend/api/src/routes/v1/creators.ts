import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, creators, user, tribes, worlds, creatorStores } from '@triberspace/database';
import { eq, sql } from 'drizzle-orm';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateBody } from '../../middleware/validation';
import { publicIdSchema } from '../../schemas/common';
import { NotFoundError, ForbiddenError } from '../../middleware/error';

const creatorParamsSchema = z.object({
  creatorId: publicIdSchema
});

const createCreatorSchema = z.object({
  bio: z.string().max(500).optional(),
  pointsName: z.string().min(1).max(20).default('Points')
});

const updateCreatorSchema = z.object({
  bio: z.string().max(500).optional(),
  pointsName: z.string().min(1).max(20).optional()
});

const applyCreatorSchema = z.object({
  bio: z.string().max(500).optional(),
  pointsName: z.string().min(1).max(20).default('Points'),
  worldName: z.string().min(1).max(100).optional(),
  worldDescription: z.string().max(500).optional(),
  tribeName: z.string().min(1).max(100).optional(),
  tribeDescription: z.string().max(500).optional(),
  storeName: z.string().min(1).max(100).optional(),
  storeDescription: z.string().max(500).optional()
});

export async function v1CreatorsRoutes(fastify: FastifyInstance) {
  // Public: List all creators
  fastify.get('/', {
    preHandler: optionalAuthMiddleware
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const creatorsList = await db
        .select({
          id: creators.publicId,
          bio: creators.bio,
          pointsName: creators.pointsName,
          createdAt: creators.createdAt,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            userName: user.userName,
            image: user.image
          }
        })
        .from(creators)
        .innerJoin(user, eq(creators.userId, user.id))
        .orderBy(sql`${creators.createdAt} DESC`)
        .limit(20); // Reasonable default limit

      return {
        success: true,
        data: {
          creators: creatorsList
        }
      };
    } catch (error) {
      fastify.log.error('Error fetching creators:', error);
      throw new Error('Failed to fetch creators');
    }
  });

  // Protected: Apply to become creator (auto-creates world, tribe, store)
  fastify.post('/apply', {
    preHandler: [authMiddleware, validateBody(applyCreatorSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { 
      bio, 
      pointsName, 
      worldName, 
      worldDescription,
      tribeName,
      tribeDescription,
      storeName,
      storeDescription 
    } = request.body as z.infer<typeof applyCreatorSchema>;

    try {
      // Check if user is already a creator
      const [existingCreator] = await db
        .select({ id: creators.id })
        .from(creators)
        .where(eq(creators.userId, request.user!.id))
        .limit(1);

      if (existingCreator) {
        return reply.code(409).send({
          error: {
            code: 'ALREADY_CREATOR',
            message: 'User is already a creator',
            statusCode: 409
          }
        });
      }

      // Start database transaction for atomic creator setup
      const result = await db.transaction(async (tx) => {
        // 1. Create creator profile
        const [newCreator] = await tx
          .insert(creators)
          .values({
            userId: request.user!.id,
            bio,
            pointsName
          })
          .returning({
            id: creators.id,
            publicId: creators.publicId,
            bio: creators.bio,
            pointsName: creators.pointsName,
            createdAt: creators.createdAt
          });

        // 2. Auto-create world
        const defaultWorldName = worldName || `${request.user!.firstName || 'Creator'}'s World`;
        const [newWorld] = await tx
          .insert(worlds)
          .values({
            creatorId: newCreator.id,
            name: defaultWorldName,
            description: worldDescription || `Welcome to ${defaultWorldName}`
          })
          .returning({
            id: worlds.publicId,
            name: worlds.name,
            description: worlds.description,
            createdAt: worlds.createdAt
          });

        // 3. Auto-create tribe
        const defaultTribeName = tribeName || `${request.user!.firstName || 'Creator'}'s Tribe`;
        const [newTribe] = await tx
          .insert(tribes)
          .values({
            creatorId: newCreator.id,
            name: defaultTribeName,
            description: tribeDescription || `Join ${defaultTribeName} for exclusive content and perks`,
            perks: ['Early access to content', 'Exclusive events', 'Community access'],
            joinCost: 0 // Default free tribe
          })
          .returning({
            id: tribes.publicId,
            name: tribes.name,
            description: tribes.description,
            perks: tribes.perks,
            joinCost: tribes.joinCost,
            createdAt: tribes.createdAt
          });

        // 4. Auto-create store
        const defaultStoreName = storeName || `${request.user!.firstName || 'Creator'}'s Store`;
        const [newStore] = await tx
          .insert(creatorStores)
          .values({
            creatorId: newCreator.id,
            storeName: defaultStoreName,
            description: storeDescription || `Shop exclusive items from ${defaultStoreName}`
          })
          .returning({
            id: creatorStores.publicId,
            storeName: creatorStores.storeName,
            description: creatorStores.description,
            isActive: creatorStores.isActive,
            createdAt: creatorStores.createdAt
          });

        return {
          creator: newCreator,
          world: newWorld,
          tribe: newTribe,
          store: newStore
        };
      });

      return reply.code(201).send({
        success: true,
        data: {
          message: 'Creator application successful! Your world, tribe, and store have been created.',
          ...result
        }
      });

    } catch (error) {
      fastify.log.error('Error applying for creator:', error);
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process creator application',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Remove creator status (admin or self-removal)
  fastify.delete('/:creatorId', {
    preHandler: [authMiddleware, validateParams(creatorParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { creatorId } = request.params as z.infer<typeof creatorParamsSchema>;

    try {
      // Get creator and verify ownership (or admin access)
      const [creator] = await db
        .select({
          id: creators.id,
          userId: creators.userId,
          publicId: creators.publicId
        })
        .from(creators)
        .where(eq(creators.publicId, creatorId))
        .limit(1);

      if (!creator) {
        return reply.code(404).send({
          error: {
            code: 'CREATOR_NOT_FOUND',
            message: 'Creator not found',
            statusCode: 404
          }
        });
      }

      // Check permissions: only creator themselves or admin can remove
      const isOwnProfile = creator.userId === request.user!.id;
      const isAdmin = request.user!.role === 'admin';
      
      if (!isOwnProfile && !isAdmin) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Can only remove your own creator status or admin access required',
            statusCode: 403
          }
        });
      }

      // Delete creator (will cascade delete world, tribe, store due to FK constraints)
      await db
        .delete(creators)
        .where(eq(creators.id, creator.id));

      return {
        success: true,
        data: {
          message: 'Creator status removed successfully. Associated world, tribe, and store have been deleted.'
        }
      };

    } catch (error) {
      fastify.log.error('Error removing creator:', error);
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to remove creator status',
          statusCode: 500
        }
      });
    }
  });

  // Public: Get creator profile
  fastify.get('/:creatorId', {
    preHandler: [optionalAuthMiddleware, validateParams(creatorParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { creatorId } = request.params as z.infer<typeof creatorParamsSchema>;

    try {
      const [creator] = await db
        .select({
          id: creators.publicId,
          bio: creators.bio,
          pointsName: creators.pointsName,
          createdAt: creators.createdAt,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            userName: user.userName,
            image: user.image
          }
        })
        .from(creators)
        .innerJoin(user, eq(creators.userId, user.id))
        .where(eq(creators.publicId, creatorId))
        .limit(1);

      if (!creator) {
        throw new NotFoundError('Creator not found');
      }

      return {
        success: true,
        data: { creator }
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      fastify.log.error('Error fetching creator:', error);
      throw new Error('Failed to fetch creator');
    }
  });

  // Public: Get creator's world
  fastify.get('/:creatorId/world', {
    preHandler: [optionalAuthMiddleware, validateParams(creatorParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { creatorId } = request.params as z.infer<typeof creatorParamsSchema>;

    try {
      const [creatorWorld] = await db
        .select({
          world: {
            id: worlds.publicId,
            name: worlds.name,
            description: worlds.description,
            createdAt: worlds.createdAt
          }
        })
        .from(creators)
        .innerJoin(worlds, eq(creators.id, worlds.creatorId))
        .where(eq(creators.publicId, creatorId))
        .limit(1);

      if (!creatorWorld) {
        throw new NotFoundError('Creator world not found');
      }

      return {
        success: true,
        data: creatorWorld
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      fastify.log.error('Error fetching creator world:', error);
      throw new Error('Failed to fetch creator world');
    }
  });

  // Public: Get creator's tribe
  fastify.get('/:creatorId/tribe', {
    preHandler: [optionalAuthMiddleware, validateParams(creatorParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { creatorId } = request.params as z.infer<typeof creatorParamsSchema>;

    try {
      const [creatorTribe] = await db
        .select({
          tribe: {
            id: tribes.publicId,
            name: tribes.name,
            description: tribes.description,
            perks: tribes.perks,
            joinCost: tribes.joinCost,
            createdAt: tribes.createdAt
          }
        })
        .from(creators)
        .innerJoin(tribes, eq(creators.id, tribes.creatorId))
        .where(eq(creators.publicId, creatorId))
        .limit(1);

      if (!creatorTribe) {
        throw new NotFoundError('Creator tribe not found');
      }

      return {
        success: true,
        data: creatorTribe
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      fastify.log.error('Error fetching creator tribe:', error);
      throw new Error('Failed to fetch creator tribe');
    }
  });


  // Protected: Update creator profile (own profile only)
  fastify.patch('/:creatorId', {
    preHandler: [authMiddleware, validateParams(creatorParamsSchema), validateBody(updateCreatorSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { creatorId } = request.params as z.infer<typeof creatorParamsSchema>;
    const updates = request.body as z.infer<typeof updateCreatorSchema>;

    try {
      // Get creator and verify ownership
      const [creator] = await db
        .select({
          id: creators.id,
          userId: creators.userId,
          publicId: creators.publicId
        })
        .from(creators)
        .where(eq(creators.publicId, creatorId))
        .limit(1);

      if (!creator) {
        throw new NotFoundError('Creator not found');
      }

      if (creator.userId !== request.user!.id) {
        throw new ForbiddenError('Can only update your own creator profile');
      }

      // Update creator profile
      const [updatedCreator] = await db
        .update(creators)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(creators.id, creator.id))
        .returning({
          id: creators.publicId,
          bio: creators.bio,
          pointsName: creators.pointsName,
          updatedAt: creators.updatedAt
        });

      return {
        success: true,
        data: { creator: updatedCreator }
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) throw error;
      fastify.log.error('Error updating creator:', error);
      throw new Error('Failed to update creator profile');
    }
  });
}