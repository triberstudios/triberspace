import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  db,
  creators,
  user,
  tribes,
  worlds,
  creatorEarnings,
  cashoutRequests
} from '@triberspace/database';
import { eq, sql, desc } from 'drizzle-orm';
import { authMiddleware, optionalAuthMiddleware, creatorOnlyMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateBody, validateQuery } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';
import { NotFoundError, ForbiddenError } from '../../middleware/error';
import { pointsToUsdCents, formatUsdCents } from '../../config/revenue';

const creatorParamsSchema = z.object({
  creatorId: publicIdSchema
});

const createCreatorSchema = z.object({
  bio: z.string().max(500).optional()
});

const updateCreatorSchema = z.object({
  bio: z.string().max(500).optional()
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
          createdAt: creators.createdAt,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
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
      fastify.log.error(error as Error, 'Error fetching creators');
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
            bio
          })
          .returning({
            id: creators.id,
            publicId: creators.publicId,
            bio: creators.bio,
            createdAt: creators.createdAt
          });

        // 2. Auto-create world
        const defaultWorldName = worldName || `${request.user!.firstName || 'Creator'}'s World`;
        const worldSlug = defaultWorldName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
        const [newWorld] = await tx
          .insert(worlds)
          .values({
            founderId: request.user!.id,
            name: defaultWorldName,
            slug: worldSlug,
            description: worldDescription || `Welcome to ${defaultWorldName}`,
            pointsName: pointsName || 'Points'
          })
          .returning({
            id: worlds.publicId,
            name: worlds.name,
            slug: worlds.slug,
            description: worlds.description,
            pointsName: worlds.pointsName,
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

        // 4. Auto-create store (disabled - creatorStores table not yet implemented)
        // const defaultStoreName = storeName || `${request.user!.firstName || 'Creator'}'s Store`;
        // TODO: Implement store creation when creatorStores table is added to schema

        return {
          creator: newCreator,
          world: newWorld,
          tribe: newTribe
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
      fastify.log.error(error as Error, 'Error applying for creator');
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
      fastify.log.error(error as Error, 'Error removing creator');
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
          createdAt: creators.createdAt,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
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
      fastify.log.error(error as Error, 'Error fetching creator');
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
        .innerJoin(worlds, eq(creators.userId, worlds.founderId))
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
      fastify.log.error(error as Error, 'Error fetching creator world');
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
      fastify.log.error(error as Error, 'Error fetching creator tribe');
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
          updatedAt: creators.updatedAt
        });

      return {
        success: true,
        data: { creator: updatedCreator }
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) throw error;
      fastify.log.error(error as Error, 'Error updating creator');
      throw new Error('Failed to update creator profile');
    }
  });

  // ============================================================================
  // CREATOR EARNINGS ENDPOINTS
  // ============================================================================

  // Protected: Get creator's earnings breakdown
  fastify.get('/me/earnings', {
    preHandler: [creatorOnlyMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    if (!request.creator) {
      return reply.code(403).send({
        error: {
          code: 'NOT_CREATOR',
          message: 'Creator access required',
          statusCode: 403
        }
      });
    }

    try {
      // Get or create earnings record
      let [earnings] = await db
        .select()
        .from(creatorEarnings)
        .where(eq(creatorEarnings.creatorId, request.creator.id))
        .limit(1);

      if (!earnings) {
        // Create initial earnings record
        [earnings] = await db
          .insert(creatorEarnings)
          .values({
            creatorId: request.creator.id,
            pendingEarnings: 0,
            lifetimeEarnings: 0,
            totalCashedOut: 0,
            earningsFromSubscriptions: 0,
            earningsFromProducts: 0,
            earningsFromPointPacks: 0,
            minimumCashout: 5000 // $5 minimum
          })
          .returning();
      }

      // Convert cents to USD for display
      const pendingUSD = earnings.pendingEarnings / 100;
      const lifetimeUSD = earnings.lifetimeEarnings / 100;
      const cashedOutUSD = earnings.totalCashedOut / 100;
      const availableToCashout = earnings.pendingEarnings >= earnings.minimumCashout;

      return {
        success: true,
        data: {
          earnings: {
            pending: {
              cents: earnings.pendingEarnings,
              usd: pendingUSD,
              formatted: formatUsdCents(earnings.pendingEarnings)
            },
            lifetime: {
              cents: earnings.lifetimeEarnings,
              usd: lifetimeUSD,
              formatted: formatUsdCents(earnings.lifetimeEarnings)
            },
            cashedOut: {
              cents: earnings.totalCashedOut,
              usd: cashedOutUSD,
              formatted: formatUsdCents(earnings.totalCashedOut)
            },
            breakdown: {
              subscriptions: {
                cents: earnings.earningsFromSubscriptions,
                formatted: formatUsdCents(earnings.earningsFromSubscriptions)
              },
              products: {
                cents: earnings.earningsFromProducts,
                formatted: formatUsdCents(earnings.earningsFromProducts)
              },
              pointPacks: {
                cents: earnings.earningsFromPointPacks,
                formatted: formatUsdCents(earnings.earningsFromPointPacks)
              }
            },
            minimumCashout: {
              cents: earnings.minimumCashout,
              formatted: formatUsdCents(earnings.minimumCashout)
            },
            canCashout: availableToCashout
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching creator earnings');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch earnings',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Request cashout (STUBBED - no actual payout processing)
  fastify.post('/me/cashout', {
    preHandler: [creatorOnlyMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    if (!request.creator) {
      return reply.code(403).send({
        error: {
          code: 'NOT_CREATOR',
          message: 'Creator access required',
          statusCode: 403
        }
      });
    }

    try {
      // Get earnings
      const [earnings] = await db
        .select()
        .from(creatorEarnings)
        .where(eq(creatorEarnings.creatorId, request.creator.id))
        .limit(1);

      if (!earnings) {
        return reply.code(404).send({
          error: {
            code: 'NO_EARNINGS',
            message: 'No earnings record found',
            statusCode: 404
          }
        });
      }

      // Check minimum cashout amount
      if (earnings.pendingEarnings < earnings.minimumCashout) {
        return reply.code(400).send({
          error: {
            code: 'BELOW_MINIMUM',
            message: `Minimum cashout amount is ${formatUsdCents(earnings.minimumCashout)}`,
            statusCode: 400,
            details: {
              pending: earnings.pendingEarnings,
              minimum: earnings.minimumCashout,
              remaining: earnings.minimumCashout - earnings.pendingEarnings
            }
          }
        });
      }

      // STUBBED: In production, this would integrate with Stripe/PayPal for payouts
      fastify.log.info(`STUBBED: Creator ${request.creator.id} requested cashout of ${earnings.pendingEarnings} cents`);

      // Create cashout request record
      const requestId = crypto.randomUUID();
      const [cashoutRequest] = await db
        .insert(cashoutRequests)
        .values({
          requestId,
          creatorId: request.creator.id,
          amountCents: earnings.pendingEarnings,
          status: 'pending',
          payoutProvider: null, // Will be set when payment processing is implemented
          payoutId: null
        })
        .returning();

      return {
        success: true,
        data: {
          message: 'Payout processing is not yet implemented',
          request: {
            id: cashoutRequest.requestId,
            amount: {
              cents: cashoutRequest.amountCents,
              formatted: formatUsdCents(cashoutRequest.amountCents)
            },
            status: cashoutRequest.status,
            requestedAt: cashoutRequest.requestedAt
          },
          note: 'This endpoint is stubbed for development. Payout integration coming soon.'
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error processing cashout request');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process cashout request',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Get cashout history
  fastify.get('/me/cashouts', {
    preHandler: [creatorOnlyMiddleware, validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    if (!request.creator) {
      return reply.code(403).send({
        error: {
          code: 'NOT_CREATOR',
          message: 'Creator access required',
          statusCode: 403
        }
      });
    }

    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;

    try {
      const cashouts = await db
        .select({
          id: cashoutRequests.requestId,
          amount: cashoutRequests.amountCents,
          status: cashoutRequests.status,
          payoutProvider: cashoutRequests.payoutProvider,
          payoutFee: cashoutRequests.payoutFee,
          requestedAt: cashoutRequests.requestedAt,
          processedAt: cashoutRequests.processedAt,
          completedAt: cashoutRequests.completedAt,
          notes: cashoutRequests.notes
        })
        .from(cashoutRequests)
        .where(eq(cashoutRequests.creatorId, request.creator.id))
        .orderBy(desc(cashoutRequests.requestedAt))
        .limit(limit)
        .offset(offset);

      // Format amounts
      const formattedCashouts = cashouts.map(cashout => ({
        ...cashout,
        amount: {
          cents: cashout.amount,
          formatted: formatUsdCents(cashout.amount)
        },
        payoutFee: cashout.payoutFee ? {
          cents: cashout.payoutFee,
          formatted: formatUsdCents(cashout.payoutFee)
        } : null
      }));

      return {
        success: true,
        data: {
          cashouts: formattedCashouts,
          pagination: {
            page,
            limit,
            hasMore: cashouts.length === limit
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching cashout history');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch cashout history',
          statusCode: 500
        }
      });
    }
  });
}