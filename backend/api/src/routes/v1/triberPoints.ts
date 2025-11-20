import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  db,
  pointPackages,
  userPointBalances,
  pointTransactionsNew,
  worldSubscriptions,
  triberPlusSubscriptions,
  pointPurchases,
  creators,
  user
} from '@triberspace/database';
import { eq, desc, sql, and } from 'drizzle-orm';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateQuery, validateBody, validateParams } from '../../middleware/validation';
import { paginationSchema } from '../../schemas/common';
import { REVENUE_SPLIT, POINT_TO_USD_RATE, EARNED_SPENDING_LIMIT, calculateRevenueSplit } from '../../config/revenue';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const purchasePackageSchema = z.object({
  packageId: z.string().length(12, 'Invalid package ID')
});

const subscribeWorldSchema = z.object({
  creatorId: z.string().length(12, 'Invalid creator ID')
});

const cancelWorldSchema = z.object({
  subscriptionId: z.number().int().positive('Invalid subscription ID')
});

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

export async function v1TriberPointsRoutes(fastify: FastifyInstance) {

  // Public: Get all active point packages
  fastify.get('/packages', {
    preHandler: [optionalAuthMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const packages = await db
        .select({
          id: pointPackages.publicId,
          name: pointPackages.name,
          basePoints: pointPackages.basePoints,
          bonusPoints: pointPackages.bonusPoints,
          bonusPercent: pointPackages.bonusPercent,
          totalPoints: sql<number>`${pointPackages.basePoints} + ${pointPackages.bonusPoints}`,
          priceUSD: pointPackages.priceUSD,
          displayOrder: pointPackages.displayOrder
        })
        .from(pointPackages)
        .where(eq(pointPackages.isActive, true))
        .orderBy(pointPackages.displayOrder);

      return {
        success: true,
        data: { packages }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching point packages');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch point packages',
          statusCode: 500
        }
      });
    }
  });

  // Public: Get points system configuration
  fastify.get('/config', {
    preHandler: [optionalAuthMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      return {
        success: true,
        data: {
          pointToUsdRate: POINT_TO_USD_RATE,
          worldSubscriptionCost: 5000, // 5,000 points/month
          triberPlusCost: 16500, // 16,500 points/month
          earnedSpendingLimit: EARNED_SPENDING_LIMIT,
          minimumCashout: 5000, // $5 minimum for creators
          revenueSplit: {
            platform: REVENUE_SPLIT.platformPercent,
            creator: REVENUE_SPLIT.creatorPercent,
            manager: REVENUE_SPLIT.managerPercent
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching points config');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch configuration',
          statusCode: 500
        }
      });
    }
  });

  // ============================================================================
  // PROTECTED ENDPOINTS - User Balance & Transactions
  // ============================================================================

  // Protected: Get user's point balance
  fastify.get('/balance', {
    preHandler: [authMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401
        }
      });
    }

    try {
      // Get or create user balance
      let [balance] = await db
        .select()
        .from(userPointBalances)
        .where(eq(userPointBalances.userId, request.user.id))
        .limit(1);

      if (!balance) {
        // Create initial balance
        [balance] = await db
          .insert(userPointBalances)
          .values({
            userId: request.user.id,
            purchasedBalance: 0,
            earnedBalance: 0,
            earnedSpentThisMonth: 0,
            earnedSpendingLimit: EARNED_SPENDING_LIMIT,
            lastMonthlyReset: new Date(),
            totalPurchased: 0,
            totalEarned: 0,
            totalSpent: 0
          })
          .returning();
      }

      // Check if monthly reset is needed (earned spending limit)
      const now = new Date();
      const lastReset = new Date(balance.lastMonthlyReset);
      const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceReset >= 30) {
        // Reset earned spending counter
        [balance] = await db
          .update(userPointBalances)
          .set({
            earnedSpentThisMonth: 0,
            lastMonthlyReset: now
          })
          .where(eq(userPointBalances.userId, request.user.id))
          .returning();
      }

      const totalBalance = balance.purchasedBalance + balance.earnedBalance;
      const earnedRemaining = balance.earnedSpendingLimit - balance.earnedSpentThisMonth;

      return {
        success: true,
        data: {
          balance: {
            total: totalBalance,
            purchased: balance.purchasedBalance,
            earned: balance.earnedBalance,
            earnedSpendingRemaining: earnedRemaining,
            earnedSpendingLimit: balance.earnedSpendingLimit,
            lastMonthlyReset: balance.lastMonthlyReset,
            lifetime: {
              purchased: balance.totalPurchased,
              earned: balance.totalEarned,
              spent: balance.totalSpent
            }
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching user balance');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch balance',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Get user's transaction history
  fastify.get('/transactions', {
    preHandler: [authMiddleware, validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401
        }
      });
    }

    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;

    try {
      const transactions = await db
        .select({
          id: pointTransactionsNew.transactionId,
          amount: pointTransactionsNew.amount,
          balanceAfter: pointTransactionsNew.balanceAfter,
          type: pointTransactionsNew.type,
          pointType: pointTransactionsNew.pointType,
          source: pointTransactionsNew.source,
          description: pointTransactionsNew.description,
          createdAt: pointTransactionsNew.createdAt
        })
        .from(pointTransactionsNew)
        .where(eq(pointTransactionsNew.userId, request.user.id))
        .orderBy(desc(pointTransactionsNew.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        data: {
          transactions,
          pagination: {
            page,
            limit,
            hasMore: transactions.length === limit
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching transactions');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch transactions',
          statusCode: 500
        }
      });
    }
  });

  // ============================================================================
  // PROTECTED ENDPOINTS - Point Purchases (STUBBED)
  // ============================================================================

  // Protected: Purchase point package (STUBBED - no actual payment)
  fastify.post('/purchase', {
    preHandler: [authMiddleware, validateBody(purchasePackageSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401
        }
      });
    }

    const { packageId } = request.body as z.infer<typeof purchasePackageSchema>;

    try {
      // Get package details
      const [pkg] = await db
        .select()
        .from(pointPackages)
        .where(and(
          eq(pointPackages.publicId, packageId),
          eq(pointPackages.isActive, true)
        ))
        .limit(1);

      if (!pkg) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Point package not found',
            statusCode: 404
          }
        });
      }

      // STUBBED: In production, this would integrate with Stripe/PayPal
      // For now, just return the package details and indicate payment is pending
      fastify.log.info(`STUBBED: User ${request.user.id} initiated purchase of ${pkg.name} for $${pkg.priceUSD}`);

      return {
        success: true,
        data: {
          message: 'Payment processing is not yet implemented',
          package: {
            id: pkg.publicId,
            name: pkg.name,
            basePoints: pkg.basePoints,
            bonusPoints: pkg.bonusPoints,
            totalPoints: pkg.basePoints + pkg.bonusPoints,
            priceUSD: pkg.priceUSD
          },
          status: 'pending',
          note: 'This endpoint is stubbed for development. Stripe integration coming soon.'
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error processing purchase');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process purchase',
          statusCode: 500
        }
      });
    }
  });

  // ============================================================================
  // PROTECTED ENDPOINTS - World Subscriptions
  // ============================================================================

  // Protected: Subscribe to a creator's world
  fastify.post('/subscribe-world', {
    preHandler: [authMiddleware, validateBody(subscribeWorldSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401
        }
      });
    }

    const { creatorId } = request.body as z.infer<typeof subscribeWorldSchema>;
    const subscriptionCost = 5000; // 5,000 points/month

    try {
      // Verify creator exists
      const [creator] = await db
        .select({ id: creators.id })
        .from(creators)
        .where(eq(creators.publicId, creatorId))
        .limit(1);

      if (!creator) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Creator not found',
            statusCode: 404
          }
        });
      }

      // Check if already subscribed
      const [existingSub] = await db
        .select()
        .from(worldSubscriptions)
        .where(and(
          eq(worldSubscriptions.userId, request.user.id),
          eq(worldSubscriptions.creatorId, creator.id),
          eq(worldSubscriptions.status, 'active')
        ))
        .limit(1);

      if (existingSub) {
        return reply.code(400).send({
          error: {
            code: 'ALREADY_SUBSCRIBED',
            message: 'You are already subscribed to this creator',
            statusCode: 400
          }
        });
      }

      // Get user balance
      const [balance] = await db
        .select()
        .from(userPointBalances)
        .where(eq(userPointBalances.userId, request.user.id))
        .limit(1);

      if (!balance || (balance.purchasedBalance + balance.earnedBalance) < subscriptionCost) {
        return reply.code(400).send({
          error: {
            code: 'INSUFFICIENT_POINTS',
            message: `Insufficient points. ${subscriptionCost.toLocaleString()} points required.`,
            statusCode: 400,
            details: {
              required: subscriptionCost,
              available: balance ? (balance.purchasedBalance + balance.earnedBalance) : 0
            }
          }
        });
      }

      // Create subscription
      const now = new Date();
      const nextBilling = new Date(now);
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      const [subscription] = await db
        .insert(worldSubscriptions)
        .values({
          userId: request.user.id,
          creatorId: creator.id,
          pricePoints: subscriptionCost,
          status: 'active',
          autoRenew: true,
          nextBillingDate: nextBilling,
          currentPeriodStart: now,
          currentPeriodEnd: nextBilling
        })
        .returning();

      // Deduct points (TODO: implement actual point deduction with transaction)
      // This would call a service function to handle the deduction + revenue split

      return {
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            creatorId,
            pricePoints: subscription.pricePoints,
            status: subscription.status,
            nextBillingDate: subscription.nextBillingDate,
            subscribedAt: subscription.subscribedAt
          },
          message: 'Successfully subscribed to creator'
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error subscribing to world');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create subscription',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Cancel world subscription
  fastify.post('/cancel-world', {
    preHandler: [authMiddleware, validateBody(cancelWorldSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401
        }
      });
    }

    const { subscriptionId } = request.body as z.infer<typeof cancelWorldSchema>;

    try {
      // Verify subscription belongs to user
      const [subscription] = await db
        .select()
        .from(worldSubscriptions)
        .where(and(
          eq(worldSubscriptions.id, subscriptionId),
          eq(worldSubscriptions.userId, request.user.id)
        ))
        .limit(1);

      if (!subscription) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Subscription not found',
            statusCode: 404
          }
        });
      }

      if (subscription.status !== 'active') {
        return reply.code(400).send({
          error: {
            code: 'NOT_ACTIVE',
            message: 'Subscription is not active',
            statusCode: 400
          }
        });
      }

      // Cancel subscription (remain active until period end)
      const [updated] = await db
        .update(worldSubscriptions)
        .set({
          status: 'cancelled',
          autoRenew: false,
          cancelledAt: new Date()
        })
        .where(eq(worldSubscriptions.id, subscriptionId))
        .returning();

      return {
        success: true,
        data: {
          subscription: {
            id: updated.id,
            status: updated.status,
            currentPeriodEnd: updated.currentPeriodEnd,
            cancelledAt: updated.cancelledAt
          },
          message: 'Subscription cancelled. Access continues until end of billing period.'
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error cancelling subscription');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel subscription',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Get user's active subscriptions
  fastify.get('/my-subscriptions', {
    preHandler: [authMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401
        }
      });
    }

    try {
      // Get world subscriptions with creator info
      const worldSubs = await db
        .select({
          id: worldSubscriptions.id,
          creatorId: creators.publicId,
          creatorName: user.displayUsername,
          pricePoints: worldSubscriptions.pricePoints,
          status: worldSubscriptions.status,
          autoRenew: worldSubscriptions.autoRenew,
          nextBillingDate: worldSubscriptions.nextBillingDate,
          currentPeriodEnd: worldSubscriptions.currentPeriodEnd,
          subscribedAt: worldSubscriptions.subscribedAt
        })
        .from(worldSubscriptions)
        .innerJoin(creators, eq(worldSubscriptions.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .where(eq(worldSubscriptions.userId, request.user.id))
        .orderBy(desc(worldSubscriptions.subscribedAt));

      // Get Triber Plus subscription
      const [plusSub] = await db
        .select({
          id: triberPlusSubscriptions.id,
          priceUSD: triberPlusSubscriptions.priceUSD,
          monthlyPoints: triberPlusSubscriptions.monthlyPoints,
          status: triberPlusSubscriptions.status,
          currentPeriodEnd: triberPlusSubscriptions.currentPeriodEnd,
          subscribedAt: triberPlusSubscriptions.subscribedAt
        })
        .from(triberPlusSubscriptions)
        .where(eq(triberPlusSubscriptions.userId, request.user.id))
        .limit(1);

      return {
        success: true,
        data: {
          worldSubscriptions: worldSubs,
          triberPlus: plusSub || null
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching subscriptions');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch subscriptions',
          statusCode: 500
        }
      });
    }
  });

  // ============================================================================
  // PROTECTED ENDPOINTS - Triber Plus (STUBBED)
  // ============================================================================

  // Protected: Subscribe to Triber Plus (STUBBED - no Stripe)
  fastify.post('/subscribe-plus', {
    preHandler: [authMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401
        }
      });
    }

    try {
      // Check if already subscribed
      const [existing] = await db
        .select()
        .from(triberPlusSubscriptions)
        .where(eq(triberPlusSubscriptions.userId, request.user.id))
        .limit(1);

      if (existing && existing.status === 'active') {
        return reply.code(400).send({
          error: {
            code: 'ALREADY_SUBSCRIBED',
            message: 'You already have an active Triber Plus subscription',
            statusCode: 400
          }
        });
      }

      // STUBBED: In production, this would create a Stripe subscription
      fastify.log.info(`STUBBED: User ${request.user.id} initiated Triber Plus subscription`);

      return {
        success: true,
        data: {
          message: 'Stripe integration is not yet implemented',
          subscription: {
            priceUSD: '15.00',
            monthlyPoints: 16500,
            status: 'pending'
          },
          note: 'This endpoint is stubbed for development. Stripe integration coming soon.'
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error subscribing to Triber Plus');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create subscription',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Cancel Triber Plus (STUBBED - no Stripe)
  fastify.post('/cancel-plus', {
    preHandler: [authMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401
        }
      });
    }

    try {
      const [subscription] = await db
        .select()
        .from(triberPlusSubscriptions)
        .where(eq(triberPlusSubscriptions.userId, request.user.id))
        .limit(1);

      if (!subscription || subscription.status !== 'active') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'No active Triber Plus subscription found',
            statusCode: 404
          }
        });
      }

      // STUBBED: In production, this would cancel via Stripe
      fastify.log.info(`STUBBED: User ${request.user.id} cancelled Triber Plus subscription`);

      return {
        success: true,
        data: {
          message: 'Stripe integration is not yet implemented',
          note: 'This endpoint is stubbed for development. Stripe integration coming soon.'
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error cancelling Triber Plus');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel subscription',
          statusCode: 500
        }
      });
    }
  });
}
