import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, worlds, spaces, spaceWorlds, creators, user } from '@triberspace/database';
import { eq, desc, sql, ilike, or } from 'drizzle-orm';
import { optionalAuthMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery, validateBody } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';

// Validation schemas
const worldSlugSchema = z.object({
  slug: z.string().min(1, 'World slug is required')
});

const worldsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  isVerified: z.boolean().optional()
});

const worldSearchSchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters')
});

const ensureWorldsSchema = z.object({
  worldNames: z.array(z.string().min(1).max(100)).min(1, 'At least one world name is required')
});

// Helper: Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .substring(0, 100);         // Limit length
}

export async function v1WorldsRoutes(fastify: FastifyInstance) {
  // ===================================================================
  // PUBLIC WORLD ENDPOINTS
  // ===================================================================

  // Public: List all worlds with filters
  fastify.get('/', {
    preHandler: [optionalAuthMiddleware, validateQuery(worldsQuerySchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit, search, isVerified } = request.query as z.infer<typeof worldsQuerySchema>;
    const offset = (page - 1) * limit;

    try {
      // Build where conditions
      const conditions = [];

      if (search) {
        conditions.push(ilike(worlds.name, `%${search}%`));
      }

      if (isVerified !== undefined) {
        // For now, all worlds can be considered public (isVerified = false)
        // This will be used later when we add verified world applications
      }

      // Query worlds
      const worldsList = conditions.length > 0
        ? await db
            .select({
              id: worlds.publicId,
              slug: worlds.slug,
              name: worlds.name,
              description: worlds.description,
              thumbnail_url: worlds.thumbnail_url,
              spaceCount: worlds.spaceCount,
              memberCount: worlds.memberCount,
              createdAt: worlds.createdAt
            })
            .from(worlds)
            .where(or(...conditions))
            .orderBy(desc(worlds.spaceCount), desc(worlds.createdAt))
            .limit(limit)
            .offset(offset)
        : await db
            .select({
              id: worlds.publicId,
              slug: worlds.slug,
              name: worlds.name,
              description: worlds.description,
              thumbnail_url: worlds.thumbnail_url,
              spaceCount: worlds.spaceCount,
              memberCount: worlds.memberCount,
              createdAt: worlds.createdAt
            })
            .from(worlds)
            .orderBy(desc(worlds.spaceCount), desc(worlds.createdAt))
            .limit(limit)
            .offset(offset);

      return {
        success: true,
        data: {
          worlds: worldsList,
          pagination: {
            page,
            limit,
            hasMore: worldsList.length === limit
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching worlds');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch worlds',
          statusCode: 500
        }
      });
    }
  });

  // Public: Search worlds (for autocomplete)
  fastify.get('/search', {
    preHandler: [optionalAuthMiddleware, validateQuery(worldSearchSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { q } = request.query as z.infer<typeof worldSearchSchema>;

    try {
      // Search for worlds matching the query
      const worldsList = await db
        .select({
          id: worlds.publicId,
          slug: worlds.slug,
          name: worlds.name,
          spaceCount: worlds.spaceCount
        })
        .from(worlds)
        .where(ilike(worlds.name, `%${q}%`))
        .orderBy(desc(worlds.spaceCount))
        .limit(10);

      return {
        success: true,
        data: { worlds: worldsList }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error searching worlds');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search worlds',
          statusCode: 500
        }
      });
    }
  });

  // Public: Ensure worlds exist (auto-create if needed)
  fastify.post('/ensure', {
    preHandler: [optionalAuthMiddleware, validateBody(ensureWorldsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { worldNames } = request.body as z.infer<typeof ensureWorldsSchema>;

    try {
      const results = await Promise.all(
        worldNames.map(async (name) => {
          const slug = generateSlug(name);

          // Check if world exists
          const [existingWorld] = await db
            .select({
              id: worlds.id,
              publicId: worlds.publicId,
              slug: worlds.slug,
              name: worlds.name
            })
            .from(worlds)
            .where(eq(worlds.slug, slug))
            .limit(1);

          if (existingWorld) {
            return {
              id: existingWorld.publicId,
              slug: existingWorld.slug,
              name: existingWorld.name,
              isNew: false,
              canPublishTo: true // Public worlds allow anyone to publish
            };
          }

          // Create new public world
          const [newWorld] = await db
            .insert(worlds)
            .values({
              slug,
              name,
              governanceType: 'public'
              // founderId is null for public worlds
            })
            .returning({
              id: worlds.publicId,
              slug: worlds.slug,
              name: worlds.name
            });

          return {
            id: newWorld.id,
            slug: newWorld.slug,
            name: newWorld.name,
            isNew: true,
            canPublishTo: true
          };
        })
      );

      return {
        success: true,
        data: { worlds: results }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error ensuring worlds');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to ensure worlds exist',
          statusCode: 500
        }
      });
    }
  });

  // Public: Get world details by slug
  fastify.get('/:slug', {
    preHandler: [optionalAuthMiddleware, validateParams(worldSlugSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { slug } = request.params as z.infer<typeof worldSlugSchema>;

    try {
      // Get world basic info
      const [world] = await db
        .select({
          id: worlds.publicId,
          slug: worlds.slug,
          name: worlds.name,
          description: worlds.description,
          thumbnail_url: worlds.thumbnail_url,
          banner_url: worlds.banner_url,
          governanceType: worlds.governanceType,
          pointsName: worlds.pointsName,
          spaceCount: worlds.spaceCount,
          memberCount: worlds.memberCount,
          createdAt: worlds.createdAt
        })
        .from(worlds)
        .where(eq(worlds.slug, slug))
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

      // Get founder info if world has one
      let founder = null;
      if (world.governanceType !== 'public') {
        // TODO: Get founder from founderId when we implement verified worlds
      }

      return {
        success: true,
        data: {
          world: {
            ...world,
            founder
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

  // Public: Get world spaces (via junction table)
  fastify.get('/:slug/spaces', {
    preHandler: [optionalAuthMiddleware, validateParams(worldSlugSchema), validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { slug } = request.params as z.infer<typeof worldSlugSchema>;
    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;

    try {
      // First verify world exists and get its internal ID
      const [worldInfo] = await db
        .select({
          id: worlds.id,
          publicId: worlds.publicId,
          name: worlds.name
        })
        .from(worlds)
        .where(eq(worlds.slug, slug))
        .limit(1);

      if (!worldInfo) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'World not found',
            statusCode: 404
          }
        });
      }

      // Get spaces via junction table
      const spacesList = await db
        .select({
          id: spaces.publicId,
          name: spaces.name,
          description: spaces.description,
          spaceType: spaces.spaceType,
          thumbnail_url: spaces.thumbnail_url,
          persistence: spaces.persistence,
          availability: spaces.availability,
          publishStatus: spaces.publishStatus,
          isActive: spaces.isActive,
          createdAt: spaces.createdAt
        })
        .from(spaces)
        .innerJoin(spaceWorlds, eq(spaces.id, spaceWorlds.spaceId))
        .where(eq(spaceWorlds.worldId, worldInfo.id))
        .orderBy(desc(spaces.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        data: {
          world: {
            id: worldInfo.publicId,
            name: worldInfo.name,
            slug
          },
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
}
