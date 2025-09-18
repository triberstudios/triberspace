import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, tribes, creators, user, userTribeMemberships } from '@triberspace/database';
import { eq, desc, and, sql, count } from 'drizzle-orm';
import { optionalAuthMiddleware, authMiddleware, creatorOnlyMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery, validateBody } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';

// Validation schemas
const tribeParamsSchema = z.object({
  tribeId: publicIdSchema
});

const tribesQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  creatorId: publicIdSchema.optional()
});

const createTribeSchema = z.object({
  name: z.string().min(1, 'Tribe name is required').max(100),
  description: z.string().max(1000).optional(),
  logo_url: z.string().url().optional(),
  banner_url: z.string().url().optional(),
  perks: z.array(z.string().max(200)).max(10).optional(),
  joinCost: z.number().min(0).max(1000000).default(0)
});

const updateTribeSchema = z.object({
  name: z.string().min(1, 'Tribe name is required').max(100).optional(),
  description: z.string().max(1000).optional(),
  logo_url: z.string().url().optional(),
  banner_url: z.string().url().optional(),
  perks: z.array(z.string().max(200)).max(10).optional(),
  joinCost: z.number().min(0).max(1000000).optional()
});

export async function v1TribesRoutes(fastify: FastifyInstance) {
  
  // ===================================================================
  // PUBLIC TRIBE ENDPOINTS
  // ===================================================================

  // Public: List all tribes with search and filters
  fastify.get('/', {
    preHandler: [optionalAuthMiddleware, validateQuery(tribesQuerySchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit, search, creatorId } = request.query as z.infer<typeof tribesQuerySchema>;
    const offset = (page - 1) * limit;

    try {
      // Build where conditions
      const conditions = [];
      
      if (search) {
        conditions.push(sql`${tribes.name} ILIKE ${'%' + search + '%'}`);
      }
      
      if (creatorId) {
        conditions.push(eq(creators.publicId, creatorId));
      }

      // Get tribes with creator info  
      let tribesList;
      if (conditions.length > 0) {
        tribesList = await db
          .select({
            id: tribes.publicId,
            name: tribes.name,
            description: tribes.description,
            logo_url: tribes.logo_url,
            banner_url: tribes.banner_url,
            perks: tribes.perks,
            joinCost: tribes.joinCost,
            createdAt: tribes.createdAt,
            creator: {
              id: creators.publicId,
              username: user.username
            }
          })
          .from(tribes)
          .innerJoin(creators, eq(tribes.creatorId, creators.id))
          .innerJoin(user, eq(creators.userId, user.id))
          .where(and(...conditions))
          .orderBy(desc(tribes.createdAt))
          .limit(limit)
          .offset(offset);
      } else {
        tribesList = await db
          .select({
            id: tribes.publicId,
            name: tribes.name,
            description: tribes.description,
            logo_url: tribes.logo_url,
            banner_url: tribes.banner_url,
            perks: tribes.perks,
            joinCost: tribes.joinCost,
            createdAt: tribes.createdAt,
            creator: {
              id: creators.publicId,
              username: user.username
            }
          })
          .from(tribes)
          .innerJoin(creators, eq(tribes.creatorId, creators.id))
          .innerJoin(user, eq(creators.userId, user.id))
          .orderBy(desc(tribes.createdAt))
          .limit(limit)
          .offset(offset);
      }

      // Add member count to each tribe
      const tribesWithMemberCount = await Promise.all(
        tribesList.map(async (tribe) => {
          const [memberCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(userTribeMemberships)
            .innerJoin(tribes, eq(userTribeMemberships.tribeId, tribes.id))
            .where(eq(tribes.publicId, tribe.id));

          return {
            ...tribe,
            memberCount: memberCount.count || 0
          };
        })
      );

      // Check current user membership status for each tribe (if authenticated)
      const tribesWithMembership = request.user ? await Promise.all(
        tribesWithMemberCount.map(async (tribe) => {
          const [membership] = await db
            .select({ role: userTribeMemberships.role })
            .from(userTribeMemberships)
            .innerJoin(tribes, eq(userTribeMemberships.tribeId, tribes.id))
            .where(and(
              eq(tribes.publicId, tribe.id),
              eq(userTribeMemberships.userId, request.user!.id)
            ))
            .limit(1);

          return {
            ...tribe,
            isJoined: !!membership,
            memberRole: membership?.role || null
          };
        })
      ) : tribesWithMemberCount.map(tribe => ({
        ...tribe,
        isJoined: false,
        memberRole: null
      }));

      return {
        success: true,
        data: {
          tribes: tribesWithMembership,
          pagination: {
            page,
            limit,
            hasMore: tribesWithMembership.length === limit
          },
          filters: {
            search: search || null,
            creatorId: creatorId || null
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching tribes');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch tribes',
          statusCode: 500
        }
      });
    }
  });

  // Public: Get specific tribe details
  fastify.get('/:tribeId', {
    preHandler: [optionalAuthMiddleware, validateParams(tribeParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { tribeId } = request.params as z.infer<typeof tribeParamsSchema>;

    try {
      const [tribe] = await db
        .select({
          id: tribes.publicId,
          name: tribes.name,
          description: tribes.description,
          perks: tribes.perks,
          joinCost: tribes.joinCost,
          createdAt: tribes.createdAt,
          creator: {
            id: creators.publicId,
            username: user.username
          }
        })
        .from(tribes)
        .innerJoin(creators, eq(tribes.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .where(eq(tribes.publicId, tribeId))
        .limit(1);

      if (!tribe) {
        return reply.code(404).send({
          error: {
            code: 'TRIBE_NOT_FOUND',
            message: 'Tribe not found',
            statusCode: 404
          }
        });
      }

      // Get member count
      const [memberCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userTribeMemberships)
        .innerJoin(tribes, eq(userTribeMemberships.tribeId, tribes.id))
        .where(eq(tribes.publicId, tribeId));

      // Check if current user is a member (if authenticated)
      let membership = null;
      if (request.user) {
        const [userMembership] = await db
          .select({ 
            role: userTribeMemberships.role,
            joinedAt: userTribeMemberships.joinedAt
          })
          .from(userTribeMemberships)
          .innerJoin(tribes, eq(userTribeMemberships.tribeId, tribes.id))
          .where(and(
            eq(tribes.publicId, tribeId),
            eq(userTribeMemberships.userId, request.user.id)
          ))
          .limit(1);
        
        membership = userMembership || null;
      }

      return {
        success: true,
        data: {
          tribe: {
            ...tribe,
            memberCount: memberCount.count || 0,
            membership: membership
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching tribe');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch tribe details',
          statusCode: 500
        }
      });
    }
  });

  // ===================================================================
  // CREATOR TRIBE MANAGEMENT (CRUD OPERATIONS)
  // ===================================================================

  // Protected: Create tribe (creators only) - Override auto-created tribe
  fastify.post('/', {
    preHandler: [creatorOnlyMiddleware, validateBody(createTribeSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { name, description, perks, joinCost } = request.body as z.infer<typeof createTribeSchema>;
    const creatorId = request.creator!.id;

    try {
      // Check if creator already has a tribe
      const [existingTribe] = await db
        .select({ id: tribes.id })
        .from(tribes)
        .where(eq(tribes.creatorId, creatorId))
        .limit(1);

      if (existingTribe) {
        return reply.code(409).send({
          error: {
            code: 'TRIBE_ALREADY_EXISTS',
            message: 'Creator already has a tribe. Use PUT to update it.',
            statusCode: 409
          }
        });
      }

      // Create the tribe
      const [newTribe] = await db
        .insert(tribes)
        .values({
          creatorId,
          name,
          description,
          perks: perks || [],
          joinCost: joinCost || 0
        })
        .returning({
          id: tribes.publicId,
          name: tribes.name,
          description: tribes.description,
          perks: tribes.perks,
          joinCost: tribes.joinCost,
          createdAt: tribes.createdAt
        });

      return reply.code(201).send({
        success: true,
        data: {
          message: 'Tribe created successfully',
          tribe: newTribe
        }
      });

    } catch (error) {
      fastify.log.error(error as Error, 'Create tribe error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create tribe',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Update tribe (creator only, their own tribe)
  fastify.put('/:tribeId', {
    preHandler: [creatorOnlyMiddleware, validateParams(tribeParamsSchema), validateBody(updateTribeSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { tribeId } = request.params as z.infer<typeof tribeParamsSchema>;
    const updates = request.body as z.infer<typeof updateTribeSchema>;
    const creatorId = request.creator!.id;

    try {
      // Verify tribe ownership
      const [tribeInfo] = await db
        .select({ internalId: tribes.id })
        .from(tribes)
        .where(and(
          eq(tribes.creatorId, creatorId),
          eq(tribes.publicId, tribeId)
        ))
        .limit(1);

      if (!tribeInfo) {
        return reply.code(404).send({
          error: {
            code: 'TRIBE_NOT_FOUND',
            message: 'Tribe not found or not owned by creator',
            statusCode: 404
          }
        });
      }

      // Update the tribe
      const [updatedTribe] = await db
        .update(tribes)
        .set(updates)
        .where(eq(tribes.id, tribeInfo.internalId))
        .returning({
          id: tribes.publicId,
          name: tribes.name,
          description: tribes.description,
          perks: tribes.perks,
          joinCost: tribes.joinCost,
          createdAt: tribes.createdAt
        });

      return {
        success: true,
        data: {
          message: 'Tribe updated successfully',
          tribe: updatedTribe
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Update tribe error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update tribe',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Delete tribe (creator only, their own tribe)
  fastify.delete('/:tribeId', {
    preHandler: [creatorOnlyMiddleware, validateParams(tribeParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { tribeId } = request.params as z.infer<typeof tribeParamsSchema>;
    const creatorId = request.creator!.id;

    try {
      // Verify tribe ownership
      const [tribeInfo] = await db
        .select({ internalId: tribes.id })
        .from(tribes)
        .where(and(
          eq(tribes.creatorId, creatorId),
          eq(tribes.publicId, tribeId)
        ))
        .limit(1);

      if (!tribeInfo) {
        return reply.code(404).send({
          error: {
            code: 'TRIBE_NOT_FOUND',
            message: 'Tribe not found or not owned by creator',
            statusCode: 404
          }
        });
      }

      // Delete the tribe (memberships will be cascade deleted)
      await db
        .delete(tribes)
        .where(eq(tribes.id, tribeInfo.internalId));

      return {
        success: true,
        data: {
          message: 'Tribe deleted successfully'
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Delete tribe error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete tribe',
          statusCode: 500
        }
      });
    }
  });

  // ===================================================================
  // TRIBE MEMBERSHIP SYSTEM
  // ===================================================================

  // Protected: Join tribe (authenticated users only)
  fastify.post('/:tribeId/join', {
    preHandler: [authMiddleware, validateParams(tribeParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { tribeId } = request.params as z.infer<typeof tribeParamsSchema>;
    const userId = request.user!.id;

    try {
      // Verify tribe exists and get info
      const [tribe] = await db
        .select({ 
          internalId: tribes.id,
          name: tribes.name,
          joinCost: tribes.joinCost,
          creatorId: tribes.creatorId
        })
        .from(tribes)
        .where(eq(tribes.publicId, tribeId))
        .limit(1);

      if (!tribe) {
        return reply.code(404).send({
          error: {
            code: 'TRIBE_NOT_FOUND',
            message: 'Tribe not found',
            statusCode: 404
          }
        });
      }

      // Check if user is the creator (creators are automatically members)  
      const [userCreator] = await db
        .select({ id: creators.id })
        .from(creators)
        .where(eq(creators.userId, userId))
        .limit(1);

      if (userCreator && userCreator.id === tribe.creatorId) {
        return reply.code(409).send({
          error: {
            code: 'CREATOR_AUTO_MEMBER',
            message: 'Tribe creators are automatically members of their own tribe',
            statusCode: 409
          }
        });
      }

      // Check if already a member
      const [existingMembership] = await db
        .select({ id: userTribeMemberships.id })
        .from(userTribeMemberships)
        .where(and(
          eq(userTribeMemberships.tribeId, tribe.internalId),
          eq(userTribeMemberships.userId, userId)
        ))
        .limit(1);

      if (existingMembership) {
        return reply.code(409).send({
          error: {
            code: 'ALREADY_MEMBER',
            message: 'User is already a member of this tribe',
            statusCode: 409
          }
        });
      }

      // TODO: Handle tribe join cost and points deduction
      // For now, assume all joins are free or handled elsewhere

      // Add membership record
      await db
        .insert(userTribeMemberships)
        .values({
          tribeId: tribe.internalId,
          userId: userId,
          role: 'member'
        });

      return reply.code(201).send({
        success: true,
        data: {
          message: `Successfully joined tribe: ${tribe.name}`,
          tribe: {
            id: tribeId,
            name: tribe.name,
            joinCost: tribe.joinCost
          }
        }
      });

    } catch (error) {
      fastify.log.error(error as Error, 'Join tribe error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to join tribe',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Leave tribe (authenticated users only)
  fastify.post('/:tribeId/leave', {
    preHandler: [authMiddleware, validateParams(tribeParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { tribeId } = request.params as z.infer<typeof tribeParamsSchema>;
    const userId = request.user!.id;

    try {
      // Verify tribe exists and get membership
      const [membership] = await db
        .select({ 
          membershipId: userTribeMemberships.id,
          tribeName: tribes.name,
          creatorId: tribes.creatorId
        })
        .from(userTribeMemberships)
        .innerJoin(tribes, eq(userTribeMemberships.tribeId, tribes.id))
        .where(and(
          eq(tribes.publicId, tribeId),
          eq(userTribeMemberships.userId, userId)
        ))
        .limit(1);

      if (!membership) {
        return reply.code(404).send({
          error: {
            code: 'MEMBERSHIP_NOT_FOUND',
            message: 'User is not a member of this tribe',
            statusCode: 404
          }
        });
      }

      // Prevent creator from leaving their own tribe
      const [userCreator] = await db
        .select({ id: creators.id })
        .from(creators)
        .where(eq(creators.userId, userId))
        .limit(1);

      if (userCreator && userCreator.id === membership.creatorId) {
        return reply.code(409).send({
          error: {
            code: 'CREATOR_CANNOT_LEAVE',
            message: 'Tribe creators cannot leave their own tribe',
            statusCode: 409
          }
        });
      }

      // Remove membership
      await db
        .delete(userTribeMemberships)
        .where(eq(userTribeMemberships.id, membership.membershipId));

      return {
        success: true,
        data: {
          message: `Successfully left tribe: ${membership.tribeName}`
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Leave tribe error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to leave tribe',
          statusCode: 500
        }
      });
    }
  });

  // Public: Get tribe members (with privacy controls)
  fastify.get('/:tribeId/members', {
    preHandler: [optionalAuthMiddleware, validateParams(tribeParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { tribeId } = request.params as z.infer<typeof tribeParamsSchema>;

    try {
      // Verify tribe exists
      const [tribe] = await db
        .select({ 
          internalId: tribes.id,
          name: tribes.name
        })
        .from(tribes)
        .where(eq(tribes.publicId, tribeId))
        .limit(1);

      if (!tribe) {
        return reply.code(404).send({
          error: {
            code: 'TRIBE_NOT_FOUND',
            message: 'Tribe not found',
            statusCode: 404
          }
        });
      }

      // Get member list with limited user info for privacy
      const members = await db
        .select({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          image: user.image,
          role: userTribeMemberships.role,
          joinedAt: userTribeMemberships.joinedAt
        })
        .from(userTribeMemberships)
        .innerJoin(user, eq(userTribeMemberships.userId, user.id))
        .where(eq(userTribeMemberships.tribeId, tribe.internalId))
        .orderBy(desc(userTribeMemberships.joinedAt));

      return {
        success: true,
        data: {
          tribe: {
            id: tribeId,
            name: tribe.name
          },
          members: members.map(member => ({
            id: member.id,
            name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username,
            username: member.username,
            image: member.image,
            role: member.role,
            joinedAt: member.joinedAt
          })),
          totalCount: members.length
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Get tribe members error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch tribe members',
          statusCode: 500
        }
      });
    }
  });
}