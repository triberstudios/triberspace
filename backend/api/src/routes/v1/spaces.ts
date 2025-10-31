import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, spaces, spaceWorlds, worlds, creators, user } from '@triberspace/database';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { optionalAuthMiddleware, creatorOnlyMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery, validateBody } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';

// Validation schemas
const spaceParamsSchema = z.object({
  spaceId: publicIdSchema
});

const spacesQuerySchema = paginationSchema.extend({
  spaceType: z.enum(['gallery', 'theater', 'meetup', 'store', 'custom']).optional(),
  creatorId: publicIdSchema.optional()
});

const createSpaceSchema = z.object({
  name: z.string().min(1, 'Space name is required').max(100),
  description: z.string().max(500).optional(),
  spaceType: z.enum(['gallery', 'theater', 'meetup', 'store', 'custom'], {
    errorMap: () => ({ message: 'Space type must be one of: gallery, theater, meetup, store, custom' })
  }),
  thumbnail_url: z.string().url().optional(),
  sceneDataUrl: z.string().url('Scene data URL must be a valid URL'),
  worldIds: z.array(publicIdSchema).min(1, 'At least one world is required'),

  // Persistence & Availability
  persistence: z.enum(['permanent', 'temporary']).default('permanent'),
  expiresAt: z.string().datetime().optional(),
  availability: z.enum(['always', 'scheduled']).default('always'),
  schedule: z.any().optional(), // JSONB - flexible structure
  capacity: z.number().int().positive().optional(),

  // Publishing
  publishStatus: z.enum(['draft', 'published']).default('published'),
  isPremium: z.boolean().default(false),
  accessCost: z.number().int().min(0).default(0)
});

const updateSpaceSchema = z.object({
  name: z.string().min(1, 'Space name is required').max(100).optional(),
  description: z.string().max(500).optional(),
  spaceType: z.enum(['gallery', 'theater', 'meetup', 'store', 'custom']).optional(),
  thumbnail_url: z.string().url().optional(),
  sceneDataUrl: z.string().url().optional(),
  worldIds: z.array(publicIdSchema).optional(),
  isActive: z.boolean().optional(),
  publishStatus: z.enum(['draft', 'published']).optional()
});

export async function v1SpacesRoutes(fastify: FastifyInstance) {

  // ===================================================================
  // PUBLIC SPACE ENDPOINTS
  // ===================================================================

  // Public: List all spaces with filters
  fastify.get('/', {
    preHandler: [optionalAuthMiddleware, validateQuery(spacesQuerySchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit, spaceType, creatorId } = request.query as z.infer<typeof spacesQuerySchema>;
    const offset = (page - 1) * limit;

    try {
      // Build where conditions
      const conditions = [
        eq(spaces.isActive, true),
        eq(spaces.publishStatus, 'published')
      ];

      if (spaceType) {
        conditions.push(eq(spaces.spaceType, spaceType));
      }

      if (creatorId) {
        // Need to join with creators to filter by publicId
        const [creatorInfo] = await db
          .select({ id: creators.id })
          .from(creators)
          .where(eq(creators.publicId, creatorId))
          .limit(1);

        if (creatorInfo) {
          conditions.push(eq(spaces.creatorId, creatorInfo.id));
        }
      }

      // Query spaces with creator info
      const spacesList = await db
        .select({
          id: spaces.publicId,
          name: spaces.name,
          description: spaces.description,
          spaceType: spaces.spaceType,
          thumbnail_url: spaces.thumbnail_url,
          persistence: spaces.persistence,
          availability: spaces.availability,
          isActive: spaces.isActive,
          createdAt: spaces.createdAt,
          creator: {
            id: creators.publicId,
            username: user.username
          }
        })
        .from(spaces)
        .innerJoin(creators, eq(spaces.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .where(and(...conditions))
        .orderBy(desc(spaces.createdAt))
        .limit(limit)
        .offset(offset);

      // For each space, get its worlds
      const spacesWithWorlds = await Promise.all(
        spacesList.map(async (space) => {
          const [spaceInfo] = await db
            .select({ internalId: spaces.id })
            .from(spaces)
            .where(eq(spaces.publicId, space.id))
            .limit(1);

          if (!spaceInfo) return { ...space, worlds: [] };

          const worldsList = await db
            .select({
              id: worlds.publicId,
              slug: worlds.slug,
              name: worlds.name
            })
            .from(worlds)
            .innerJoin(spaceWorlds, eq(worlds.id, spaceWorlds.worldId))
            .where(eq(spaceWorlds.spaceId, spaceInfo.internalId));

          return {
            ...space,
            worlds: worldsList
          };
        })
      );

      return {
        success: true,
        data: {
          spaces: spacesWithWorlds,
          pagination: {
            page,
            limit,
            hasMore: spacesList.length === limit
          },
          filters: {
            spaceType: spaceType || null,
            creatorId: creatorId || null
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching spaces');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch spaces',
          statusCode: 500
        }
      });
    }
  });

  // Public: Get specific space details
  fastify.get('/:spaceId', {
    preHandler: [optionalAuthMiddleware, validateParams(spaceParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { spaceId } = request.params as z.infer<typeof spaceParamsSchema>;

    try {
      const [space] = await db
        .select({
          id: spaces.publicId,
          name: spaces.name,
          description: spaces.description,
          spaceType: spaces.spaceType,
          thumbnail_url: spaces.thumbnail_url,
          sceneDataUrl: spaces.sceneDataUrl,
          sceneVersion: spaces.sceneVersion,
          persistence: spaces.persistence,
          expiresAt: spaces.expiresAt,
          availability: spaces.availability,
          schedule: spaces.schedule,
          capacity: spaces.capacity,
          currentOccupancy: spaces.currentOccupancy,
          isPremium: spaces.isPremium,
          accessCost: spaces.accessCost,
          publishStatus: spaces.publishStatus,
          publishedAt: spaces.publishedAt,
          isActive: spaces.isActive,
          createdAt: spaces.createdAt,
          internalId: spaces.id,
          creator: {
            id: creators.publicId,
            username: user.username,
            bio: creators.bio
          }
        })
        .from(spaces)
        .innerJoin(creators, eq(spaces.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .where(eq(spaces.publicId, spaceId))
        .limit(1);

      if (!space) {
        return reply.code(404).send({
          error: {
            code: 'SPACE_NOT_FOUND',
            message: 'Space not found',
            statusCode: 404
          }
        });
      }

      // Only show inactive/draft spaces to their creator or admins
      if (!space.isActive || space.publishStatus === 'draft') {
        const isCreator = request.user && request.creator?.publicId === space.creator.id;
        const isAdmin = request.user?.role === 'admin';

        if (!isCreator && !isAdmin) {
          return reply.code(404).send({
            error: {
              code: 'SPACE_NOT_FOUND',
              message: 'Space not found',
              statusCode: 404
            }
          });
        }
      }

      // Get worlds this space belongs to
      const worldsList = await db
        .select({
          id: worlds.publicId,
          slug: worlds.slug,
          name: worlds.name,
          description: worlds.description
        })
        .from(worlds)
        .innerJoin(spaceWorlds, eq(worlds.id, spaceWorlds.worldId))
        .where(eq(spaceWorlds.spaceId, space.internalId));

      const { internalId, ...spaceData } = space;

      return {
        success: true,
        data: {
          space: {
            ...spaceData,
            worlds: worldsList
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching space');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch space details',
          statusCode: 500
        }
      });
    }
  });

  // ===================================================================
  // CREATOR SPACE MANAGEMENT (CRUD OPERATIONS)
  // ===================================================================

  // Protected: Create space (creators only)
  fastify.post('/', {
    preHandler: [creatorOnlyMiddleware, validateBody(createSpaceSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const {
      name,
      description,
      spaceType,
      thumbnail_url,
      sceneDataUrl,
      worldIds,
      persistence,
      expiresAt,
      availability,
      schedule,
      capacity,
      publishStatus,
      isPremium,
      accessCost
    } = request.body as z.infer<typeof createSpaceSchema>;
    const creatorId = request.creator!.id;

    try {
      // Verify all worlds exist and get their internal IDs
      const worldsList = await db
        .select({
          publicId: worlds.publicId,
          internalId: worlds.id
        })
        .from(worlds)
        .where(inArray(worlds.publicId, worldIds));

      if (worldsList.length !== worldIds.length) {
        return reply.code(404).send({
          error: {
            code: 'WORLDS_NOT_FOUND',
            message: 'One or more specified worlds not found',
            statusCode: 404
          }
        });
      }

      // Create the space
      const [newSpace] = await db
        .insert(spaces)
        .values({
          creatorId,
          name,
          description,
          spaceType,
          thumbnail_url,
          sceneDataUrl,
          persistence,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          availability,
          schedule,
          capacity,
          publishStatus,
          publishedAt: publishStatus === 'published' ? new Date() : null,
          isPremium,
          accessCost
        })
        .returning({
          id: spaces.publicId,
          internalId: spaces.id,
          name: spaces.name,
          spaceType: spaces.spaceType,
          publishStatus: spaces.publishStatus,
          isActive: spaces.isActive,
          createdAt: spaces.createdAt
        });

      // Create space_worlds junction records
      await db
        .insert(spaceWorlds)
        .values(
          worldsList.map(world => ({
            spaceId: newSpace.internalId,
            worldId: world.internalId
          }))
        );

      // Update world space counts
      await Promise.all(
        worldsList.map(world =>
          db.update(worlds)
            .set({ spaceCount: sql`${worlds.spaceCount} + 1` })
            .where(eq(worlds.id, world.internalId))
        )
      );

      const { internalId, ...spaceData } = newSpace;

      return reply.code(201).send({
        success: true,
        data: {
          message: 'Space created successfully',
          space: {
            ...spaceData,
            worlds: worldsList.map(w => ({ id: w.publicId }))
          }
        }
      });

    } catch (error) {
      fastify.log.error(error as Error, 'Create space error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create space',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Update space (creator only, their own space)
  fastify.put('/:spaceId', {
    preHandler: [creatorOnlyMiddleware, validateParams(spaceParamsSchema), validateBody(updateSpaceSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { spaceId } = request.params as z.infer<typeof spaceParamsSchema>;
    const updates = request.body as z.infer<typeof updateSpaceSchema>;
    const creatorId = request.creator!.id;

    try {
      // Verify space ownership
      const [spaceInfo] = await db
        .select({ internalId: spaces.id })
        .from(spaces)
        .where(and(
          eq(spaces.creatorId, creatorId),
          eq(spaces.publicId, spaceId)
        ))
        .limit(1);

      if (!spaceInfo) {
        return reply.code(404).send({
          error: {
            code: 'SPACE_NOT_FOUND',
            message: 'Space not found or not owned by creator',
            statusCode: 404
          }
        });
      }

      // Handle world updates if provided
      if (updates.worldIds) {
        // Verify all new worlds exist
        const worldsList = await db
          .select({
            publicId: worlds.publicId,
            internalId: worlds.id
          })
          .from(worlds)
          .where(inArray(worlds.publicId, updates.worldIds));

        if (worldsList.length !== updates.worldIds.length) {
          return reply.code(404).send({
            error: {
              code: 'WORLDS_NOT_FOUND',
              message: 'One or more specified worlds not found',
              statusCode: 404
            }
          });
        }

        // Get old worlds to decrement their counts
        const oldWorlds = await db
          .select({ worldId: spaceWorlds.worldId })
          .from(spaceWorlds)
          .where(eq(spaceWorlds.spaceId, spaceInfo.internalId));

        // Delete old junction records
        await db
          .delete(spaceWorlds)
          .where(eq(spaceWorlds.spaceId, spaceInfo.internalId));

        // Create new junction records
        await db
          .insert(spaceWorlds)
          .values(
            worldsList.map(world => ({
              spaceId: spaceInfo.internalId,
              worldId: world.internalId
            }))
          );

        // Update world space counts (decrement old, increment new)
        await Promise.all([
          ...oldWorlds.map(w =>
            db.update(worlds)
              .set({ spaceCount: sql`${worlds.spaceCount} - 1` })
              .where(eq(worlds.id, w.worldId))
          ),
          ...worldsList.map(w =>
            db.update(worlds)
              .set({ spaceCount: sql`${worlds.spaceCount} + 1` })
              .where(eq(worlds.id, w.internalId))
          )
        ]);
      }

      // Remove worldIds from updates object (already handled above)
      const { worldIds, ...spaceUpdates } = updates;

      // Update the space
      const [updatedSpace] = await db
        .update(spaces)
        .set(spaceUpdates)
        .where(eq(spaces.id, spaceInfo.internalId))
        .returning({
          id: spaces.publicId,
          name: spaces.name,
          spaceType: spaces.spaceType,
          publishStatus: spaces.publishStatus,
          isActive: spaces.isActive,
          createdAt: spaces.createdAt
        });

      return {
        success: true,
        data: {
          message: 'Space updated successfully',
          space: updatedSpace
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Update space error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update space',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Delete space (creator only, their own space)
  fastify.delete('/:spaceId', {
    preHandler: [creatorOnlyMiddleware, validateParams(spaceParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { spaceId } = request.params as z.infer<typeof spaceParamsSchema>;
    const creatorId = request.creator!.id;

    try {
      // Verify space ownership
      const [spaceInfo] = await db
        .select({ internalId: spaces.id })
        .from(spaces)
        .where(and(
          eq(spaces.creatorId, creatorId),
          eq(spaces.publicId, spaceId)
        ))
        .limit(1);

      if (!spaceInfo) {
        return reply.code(404).send({
          error: {
            code: 'SPACE_NOT_FOUND',
            message: 'Space not found or not owned by creator',
            statusCode: 404
          }
        });
      }

      // Get worlds to decrement their counts
      const associatedWorlds = await db
        .select({ worldId: spaceWorlds.worldId })
        .from(spaceWorlds)
        .where(eq(spaceWorlds.spaceId, spaceInfo.internalId));

      // Delete the space (junction records will cascade)
      await db
        .delete(spaces)
        .where(eq(spaces.id, spaceInfo.internalId));

      // Update world space counts
      await Promise.all(
        associatedWorlds.map(w =>
          db.update(worlds)
            .set({ spaceCount: sql`${worlds.spaceCount} - 1` })
            .where(eq(worlds.id, w.worldId))
        )
      );

      return {
        success: true,
        data: {
          message: 'Space deleted successfully'
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Delete space error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete space',
          statusCode: 500
        }
      });
    }
  });
}
