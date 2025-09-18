import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, worlds, spaces, creators, user } from '@triberspace/database';
import { eq, desc, sql } from 'drizzle-orm';
import { optionalAuthMiddleware, creatorOnlyMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery, validateBody } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';
import { NotFoundError } from '../../middleware/error';

const worldParamsSchema = z.object({
  worldId: publicIdSchema
});

const worldsQuerySchema = paginationSchema.extend({
  search: z.string().optional()
});

// Creator world management schemas
const createWorldSchema = z.object({
  name: z.string().min(1, 'World name is required').max(100),
  description: z.string().max(500).optional(),
  thumbnail_url: z.string().url().optional(),
  model_url: z.string().url().optional()
});

const updateWorldSchema = z.object({
  name: z.string().min(1, 'World name is required').max(100).optional(),
  description: z.string().max(500).optional(),
  thumbnail_url: z.string().url().optional(),
  model_url: z.string().url().optional()
});

export async function v1WorldsRoutes(fastify: FastifyInstance) {
  // Public: List all worlds (enhanced from simple version)
  fastify.get('/', {
    preHandler: [optionalAuthMiddleware, validateQuery(worldsQuerySchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit, search } = request.query as z.infer<typeof worldsQuerySchema>;
    const offset = (page - 1) * limit;

    try {
      // Get worlds with or without search
      const worldsList = search 
        ? await db
            .select({
              id: worlds.publicId,
              name: worlds.name,
              description: worlds.description,
              thumbnail_url: worlds.thumbnail_url,
              model_url: worlds.model_url,
              createdAt: worlds.createdAt,
              creatorId: worlds.creatorId
            })
            .from(worlds)
            .where(sql`${worlds.name} ILIKE ${'%' + search + '%'}`)
            .orderBy(desc(worlds.createdAt))
            .limit(limit)
            .offset(offset)
        : await db
            .select({
              id: worlds.publicId,
              name: worlds.name,
              description: worlds.description,
              thumbnail_url: worlds.thumbnail_url,
              model_url: worlds.model_url,
              createdAt: worlds.createdAt,
              creatorId: worlds.creatorId
            })
            .from(worlds)
            .orderBy(desc(worlds.createdAt))
            .limit(limit)
            .offset(offset);

      // If no worlds found, return empty array instead of processing
      if (worldsList.length === 0) {
        return {
          success: true,
          data: {
            worlds: [],
            pagination: {
              page,
              limit,
              hasMore: false
            }
          }
        };
      }

      // Get creator info for each world
      const worldsWithCreators = await Promise.all(
        worldsList.map(async (world) => {
          try {
            const [creatorInfo] = await db
              .select({
                id: creators.publicId,
                name: sql<string>`${user.firstName} || ' ' || ${user.lastName}`,
                username: user.username
              })
              .from(creators)
              .innerJoin(user, eq(creators.userId, user.id))
              .where(eq(creators.id, world.creatorId))
              .limit(1);

            return {
              ...world,
              creator: creatorInfo || null
            };
          } catch (creatorError) {
            fastify.log.warn({ worldId: world.id }, 'Failed to fetch creator for world');
            return {
              ...world,
              creator: null
            };
          }
        })
      );

      return {
        success: true,
        data: {
          worlds: worldsWithCreators,
          pagination: {
            page,
            limit,
            hasMore: worldsList.length === limit
          }
        }
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching worlds');
      return {
        success: true,
        data: {
          worlds: [],
          pagination: {
            page,
            limit,
            hasMore: false
          },
          message: 'No worlds available (database might be empty)'
        }
      };
    }
  });

  // Public: Get world details
  fastify.get('/:worldId', {
    preHandler: [optionalAuthMiddleware, validateParams(worldParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { worldId } = request.params as z.infer<typeof worldParamsSchema>;

    try {
      // Get world basic info
      const [world] = await db
        .select({
          id: worlds.publicId,
          name: worlds.name,
          description: worlds.description,
          createdAt: worlds.createdAt,
          creatorId: worlds.creatorId
        })
        .from(worlds)
        .where(eq(worlds.publicId, worldId))
        .limit(1);

      if (!world) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'World not found',
            statusCode: 404
          }
        });
      }

      // Get creator info
      const [creatorInfo] = await db
        .select({
          id: creators.publicId,
          name: sql<string>`${user.firstName} || ' ' || ${user.lastName}`,
          username: user.username,
          bio: creators.bio
        })
        .from(creators)
        .innerJoin(user, eq(creators.userId, user.id))
        .where(eq(creators.id, world.creatorId))
        .limit(1);

      return {
        success: true,
        data: {
          world: {
            ...world,
            creator: creatorInfo || null
          }
        }
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching world');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch world details',
          statusCode: 500
        }
      });
    }
  });

  // Public: Get world spaces
  fastify.get('/:worldId/spaces', {
    preHandler: [optionalAuthMiddleware, validateParams(worldParamsSchema), validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { worldId } = request.params as z.infer<typeof worldParamsSchema>;
    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;

    try {
      // First verify world exists
      const [worldExists] = await db
        .select({ id: worlds.id })
        .from(worlds)
        .where(eq(worlds.publicId, worldId))
        .limit(1);

      if (!worldExists) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'World not found',
            statusCode: 404
          }
        });
      }

      // Get spaces for this world
      const spacesList = await db
        .select({
          id: spaces.publicId,
          name: spaces.name,
          spaceType: spaces.spaceType,
          isActive: spaces.isActive,
          createdAt: spaces.createdAt
        })
        .from(spaces)
        .where(eq(spaces.worldId, worldExists.id))
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
          }
        }
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching world spaces');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch world spaces',
          statusCode: 500
        }
      });
    }
  });

  // ===================================================================
  // CREATOR WORLD MANAGEMENT (CRUD OPERATIONS)
  // ===================================================================

  // Protected: Create world (creators only)
  fastify.post('/', {
    preHandler: [creatorOnlyMiddleware, validateBody(createWorldSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { name, description } = request.body as z.infer<typeof createWorldSchema>;
    const creatorId = request.creator!.id;

    try {
      // Check if creator already has a world (one world per creator rule)
      const [existingWorld] = await db
        .select({ id: worlds.id })
        .from(worlds)
        .where(eq(worlds.creatorId, creatorId))
        .limit(1);

      if (existingWorld) {
        return reply.code(409).send({
          error: {
            code: 'WORLD_EXISTS',
            message: 'Creator already has a world. Only one world per creator is allowed.',
            statusCode: 409
          }
        });
      }

      // Create the world
      const [newWorld] = await db
        .insert(worlds)
        .values({
          creatorId,
          name,
          description
        })
        .returning({
          id: worlds.publicId,
          name: worlds.name,
          description: worlds.description,
          createdAt: worlds.createdAt
        });

      return reply.code(201).send({
        success: true,
        data: {
          message: 'World created successfully',
          world: newWorld
        }
      });

    } catch (error) {
      fastify.log.error(error as Error, 'Create world error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create world',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Update world (creator only, their own world)
  fastify.put('/:worldId', {
    preHandler: [creatorOnlyMiddleware, validateParams(worldParamsSchema), validateBody(updateWorldSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { worldId } = request.params as z.infer<typeof worldParamsSchema>;
    const updates = request.body as z.infer<typeof updateWorldSchema>;
    const creatorId = request.creator!.id;

    try {
      // Verify world ownership
      const [worldInfo] = await db
        .select({ internalId: worlds.id })
        .from(worlds)
        .where(sql`${eq(worlds.creatorId, creatorId)} AND ${eq(worlds.publicId, worldId)}`)
        .limit(1);

      if (!worldInfo) {
        return reply.code(404).send({
          error: {
            code: 'WORLD_NOT_FOUND',
            message: 'World not found or not owned by creator',
            statusCode: 404
          }
        });
      }

      // Update the world
      const [updatedWorld] = await db
        .update(worlds)
        .set(updates)
        .where(eq(worlds.id, worldInfo.internalId))
        .returning({
          id: worlds.publicId,
          name: worlds.name,
          description: worlds.description,
          createdAt: worlds.createdAt
        });

      return {
        success: true,
        data: {
          message: 'World updated successfully',
          world: updatedWorld
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Update world error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update world',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Delete world (creator only, their own world)
  fastify.delete('/:worldId', {
    preHandler: [creatorOnlyMiddleware, validateParams(worldParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { worldId } = request.params as z.infer<typeof worldParamsSchema>;
    const creatorId = request.creator!.id;

    try {
      // Verify world ownership
      const [worldInfo] = await db
        .select({ internalId: worlds.id })
        .from(worlds)
        .where(sql`${eq(worlds.creatorId, creatorId)} AND ${eq(worlds.publicId, worldId)}`)
        .limit(1);

      if (!worldInfo) {
        return reply.code(404).send({
          error: {
            code: 'WORLD_NOT_FOUND',
            message: 'World not found or not owned by creator',
            statusCode: 404
          }
        });
      }

      // Delete the world (spaces will be cascade deleted)
      await db
        .delete(worlds)
        .where(eq(worlds.id, worldInfo.internalId));

      return {
        success: true,
        data: {
          message: 'World and all spaces deleted successfully'
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Delete world error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete world',
          statusCode: 500
        }
      });
    }
  });
}