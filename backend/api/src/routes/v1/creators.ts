import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, creators, user, tribes, worlds } from '@triberspace/database';
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

export async function v1CreatorsRoutes(fastify: FastifyInstance) {
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

  // Protected: Apply to become a creator
  fastify.post('/', {
    preHandler: [authMiddleware, validateBody(createCreatorSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { bio, pointsName } = request.body as z.infer<typeof createCreatorSchema>;

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

      // Create creator profile
      const [newCreator] = await db
        .insert(creators)
        .values({
          userId: request.user!.id,
          bio,
          pointsName
        })
        .returning({
          id: creators.publicId,
          bio: creators.bio,
          pointsName: creators.pointsName,
          createdAt: creators.createdAt
        });

      return reply.code(201).send({
        success: true,
        data: { creator: newCreator }
      });
    } catch (error) {
      fastify.log.error('Error creating creator:', error);
      throw new Error('Failed to create creator profile');
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