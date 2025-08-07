import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, spaces, worlds, creators, user } from '@triberspace/database';
import { eq, desc, sql, and } from 'drizzle-orm';
import { optionalAuthMiddleware, creatorOnlyMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery, validateBody } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';

// Validation schemas
const spaceParamsSchema = z.object({
  spaceId: publicIdSchema
});

const spacesQuerySchema = paginationSchema.extend({
  spaceType: z.enum(['gallery', 'theater', 'meetup', 'store', 'custom']).optional(),
  worldId: publicIdSchema.optional()
});

const createSpaceSchema = z.object({
  name: z.string().min(1, 'Space name is required').max(100),
  spaceType: z.enum(['gallery', 'theater', 'meetup', 'store', 'custom'], {
    errorMap: () => ({ message: 'Space type must be one of: gallery, theater, meetup, store, custom' })
  }),
  worldId: publicIdSchema.optional() // If not provided, uses creator's world
});

const updateSpaceSchema = z.object({
  name: z.string().min(1, 'Space name is required').max(100).optional(),
  spaceType: z.enum(['gallery', 'theater', 'meetup', 'store', 'custom']).optional(),
  isActive: z.boolean().optional()
});

export async function v1SpacesRoutes(fastify: FastifyInstance) {
  
  // ===================================================================
  // PUBLIC SPACE ENDPOINTS
  // ===================================================================

  // Public: List all spaces with filters
  fastify.get('/', {
    preHandler: [optionalAuthMiddleware, validateQuery(spacesQuerySchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit, spaceType, worldId } = request.query as z.infer<typeof spacesQuerySchema>;
    const offset = (page - 1) * limit;

    try {
      // Build where conditions
      const conditions = [
        eq(spaces.isActive, true) // Base condition for public viewing
      ];
      
      if (spaceType) {
        conditions.push(eq(spaces.spaceType, spaceType));
      }
      
      if (worldId) {
        conditions.push(eq(worlds.publicId, worldId));
      }

      // Build the query with optional filters
      const spacesList = await db
        .select({
          id: spaces.publicId,
          name: spaces.name,
          spaceType: spaces.spaceType,
          isActive: spaces.isActive,
          createdAt: spaces.createdAt,
          world: {
            id: worlds.publicId,
            name: worlds.name
          },
          creator: {
            id: creators.publicId,
            userName: user.userName
          }
        })
        .from(spaces)
        .innerJoin(worlds, eq(spaces.worldId, worlds.id))
        .innerJoin(creators, eq(worlds.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .where(and(...conditions))
        .orderBy(desc(spaces.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        data: {
          spaces: spacesList,
          pagination: {
            page,
            limit,
            hasMore: spacesList.length === limit
          },
          filters: {
            spaceType: spaceType || null,
            worldId: worldId || null
          }
        }
      };

    } catch (error) {
      fastify.log.error('Error fetching spaces:', error);
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
          spaceType: spaces.spaceType,
          isActive: spaces.isActive,
          createdAt: spaces.createdAt,
          world: {
            id: worlds.publicId,
            name: worlds.name,
            description: worlds.description
          },
          creator: {
            id: creators.publicId,
            userName: user.userName,
            bio: creators.bio
          }
        })
        .from(spaces)
        .innerJoin(worlds, eq(spaces.worldId, worlds.id))
        .innerJoin(creators, eq(worlds.creatorId, creators.id))
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

      // Only show inactive spaces to their creator or admins
      if (!space.isActive) {
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

      return {
        success: true,
        data: { space }
      };

    } catch (error) {
      fastify.log.error('Error fetching space:', error);
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
    const { name, spaceType, worldId } = request.body as z.infer<typeof createSpaceSchema>;
    const creatorId = request.creator!.id;

    try {
      let targetWorldId: number;

      if (worldId) {
        // Verify the specified world belongs to the creator
        const [world] = await db
          .select({ internalId: worlds.id })
          .from(worlds)
          .where(sql`${eq(worlds.creatorId, creatorId)} AND ${eq(worlds.publicId, worldId)}`)
          .limit(1);

        if (!world) {
          return reply.code(404).send({
            error: {
              code: 'WORLD_NOT_FOUND',
              message: 'Specified world not found or not owned by creator',
              statusCode: 404
            }
          });
        }
        targetWorldId = world.internalId;
      } else {
        // Use creator's default world
        const [world] = await db
          .select({ id: worlds.id })
          .from(worlds)
          .where(eq(worlds.creatorId, creatorId))
          .limit(1);

        if (!world) {
          return reply.code(404).send({
            error: {
              code: 'WORLD_NOT_FOUND',
              message: 'Creator must have a world before creating spaces',
              statusCode: 404
            }
          });
        }
        targetWorldId = world.id;
      }

      // Create the space
      const [newSpace] = await db
        .insert(spaces)
        .values({
          worldId: targetWorldId,
          name,
          spaceType
        })
        .returning({
          id: spaces.publicId,
          name: spaces.name,
          spaceType: spaces.spaceType,
          isActive: spaces.isActive,
          createdAt: spaces.createdAt
        });

      return reply.code(201).send({
        success: true,
        data: {
          message: 'Space created successfully',
          space: newSpace
        }
      });

    } catch (error) {
      fastify.log.error('Create space error:', error);
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
      // Verify space ownership through world ownership
      const [spaceInfo] = await db
        .select({ internalId: spaces.id })
        .from(spaces)
        .innerJoin(worlds, eq(spaces.worldId, worlds.id))
        .where(sql`${eq(worlds.creatorId, creatorId)} AND ${eq(spaces.publicId, spaceId)}`)
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

      // Update the space
      const [updatedSpace] = await db
        .update(spaces)
        .set(updates)
        .where(eq(spaces.id, spaceInfo.internalId))
        .returning({
          id: spaces.publicId,
          name: spaces.name,
          spaceType: spaces.spaceType,
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
      fastify.log.error('Update space error:', error);
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
      // Verify space ownership through world ownership
      const [spaceInfo] = await db
        .select({ internalId: spaces.id })
        .from(spaces)
        .innerJoin(worlds, eq(spaces.worldId, worlds.id))
        .where(sql`${eq(worlds.creatorId, creatorId)} AND ${eq(spaces.publicId, spaceId)}`)
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

      // Delete the space
      await db
        .delete(spaces)
        .where(eq(spaces.id, spaceInfo.internalId));

      return {
        success: true,
        data: {
          message: 'Space deleted successfully'
        }
      };

    } catch (error) {
      fastify.log.error('Delete space error:', error);
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