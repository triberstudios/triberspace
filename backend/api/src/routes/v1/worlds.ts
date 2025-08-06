import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, worlds, spaces, creators, user } from '@triberspace/database';
import { eq, desc, sql } from 'drizzle-orm';
import { optionalAuthMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';
import { NotFoundError } from '../../middleware/error';

const worldParamsSchema = z.object({
  worldId: publicIdSchema
});

const worldsQuerySchema = paginationSchema.extend({
  search: z.string().optional()
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
                userName: user.userName
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
            fastify.log.warn('Failed to fetch creator for world:', world.id);
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
      fastify.log.error('Error fetching worlds:', error);
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
          userName: user.userName,
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
      fastify.log.error('Error fetching world:', error);
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
      fastify.log.error('Error fetching world spaces:', error);
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch world spaces',
          statusCode: 500
        }
      });
    }
  });
}