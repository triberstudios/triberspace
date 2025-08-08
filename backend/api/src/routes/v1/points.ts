import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { 
  db, 
  pointBalances,
  pointsPackages,
  pointsPurchases,
  pointTransactions,
  creatorPointsConfig,
  creators,
  user
} from '@triberspace/database';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authMiddleware, optionalAuthMiddleware, creatorOnlyMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery, validateBody } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';

const creatorParamsSchema = z.object({
  creatorId: publicIdSchema
});

const pointsQuerySchema = paginationSchema.extend({
  type: z.enum(['earn', 'spend', 'purchase']).optional()
});

const purchasePackageSchema = z.object({
  packageId: publicIdSchema,
  paymentProvider: z.enum(['stripe', 'paypal']).default('stripe'),
  paymentId: z.string().min(1)
});

// Creator package management schemas
const createPackageSchema = z.object({
  name: z.string().min(1, 'Package name is required').max(100),
  pointsAmount: z.number().int().min(1, 'Points amount must be at least 1'),
  priceUSD: z.number().min(0.01, 'Price must be at least $0.01'),
  bonusPoints: z.number().int().min(0).default(0),
  displayOrder: z.number().int().min(0).default(0)
});

const updatePackageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  pointsAmount: z.number().int().min(1).optional(),
  priceUSD: z.number().min(0.01).optional(),
  bonusPoints: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional()
});

const packageParamsSchema = z.object({
  packageId: publicIdSchema
});

export async function v1PointsRoutes(fastify: FastifyInstance) {
  // Protected: Get user's points balance for a creator
  fastify.get('/balance/:creatorId', {
    preHandler: [authMiddleware, validateParams(creatorParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { creatorId } = request.params as z.infer<typeof creatorParamsSchema>;

    try {
      // Get creator info and points config
      const [creator] = await db
        .select({
          id: creators.id,
          publicId: creators.publicId,
          pointsName: creators.pointsName,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            userName: user.userName
          }
        })
        .from(creators)
        .innerJoin(user, eq(creators.userId, user.id))
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

      // Get points config (includes custom points name and symbol)
      const [pointsConfig] = await db
        .select({
          pointsName: creatorPointsConfig.pointsName,
          pointsSymbol: creatorPointsConfig.pointsSymbol
        })
        .from(creatorPointsConfig)
        .where(eq(creatorPointsConfig.creatorId, creator.id))
        .limit(1);

      // Get user's current balance
      const [balance] = await db
        .select({
          balance: pointBalances.balance,
          lastUpdated: pointBalances.lastUpdated
        })
        .from(pointBalances)
        .where(and(
          eq(pointBalances.userId, request.user!.id),
          eq(pointBalances.creatorId, creator.id)
        ))
        .limit(1);

      // Get recent transactions summary
      const recentActivity = await db
        .select({
          type: pointTransactions.type,
          amount: pointTransactions.amount,
          createdAt: pointTransactions.createdAt,
          description: pointTransactions.description
        })
        .from(pointTransactions)
        .where(and(
          eq(pointTransactions.userId, request.user!.id),
          eq(pointTransactions.creatorId, creator.id)
        ))
        .orderBy(desc(pointTransactions.createdAt))
        .limit(5);

      return {
        success: true,
        data: {
          creator: {
            id: creator.publicId,
            name: `${creator.user.firstName} ${creator.user.lastName}`,
            userName: creator.user.userName
          },
          pointsSystem: {
            pointsName: pointsConfig?.pointsName || creator.pointsName,
            pointsSymbol: pointsConfig?.pointsSymbol || '🪙'
          },
          balance: {
            current: balance?.balance || 0,
            lastUpdated: balance?.lastUpdated || null
          },
          recentActivity
        }
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching points balance');
      return reply.code(500).send({
        error: {
          code: 'BALANCE_FETCH_ERROR',
          message: 'Failed to fetch points balance',
          statusCode: 500
        }
      });
    }
  });

  // Public: Get available points packages for a creator
  fastify.get('/packages/:creatorId', {
    preHandler: [optionalAuthMiddleware, validateParams(creatorParamsSchema), validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { creatorId } = request.params as z.infer<typeof creatorParamsSchema>;
    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;

    try {
      // Verify creator exists
      const [creator] = await db
        .select({ 
          id: creators.id,
          pointsName: creators.pointsName
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

      // Get points config
      const [pointsConfig] = await db
        .select({
          pointsName: creatorPointsConfig.pointsName,
          pointsSymbol: creatorPointsConfig.pointsSymbol
        })
        .from(creatorPointsConfig)
        .where(eq(creatorPointsConfig.creatorId, creator.id))
        .limit(1);

      // Get active points packages
      const packages = await db
        .select({
          id: pointsPackages.publicId,
          name: pointsPackages.name,
          pointsAmount: pointsPackages.pointsAmount,
          priceUSD: pointsPackages.priceUSD,
          bonusPoints: pointsPackages.bonusPoints,
          displayOrder: pointsPackages.displayOrder,
          createdAt: pointsPackages.createdAt
        })
        .from(pointsPackages)
        .where(and(
          eq(pointsPackages.creatorId, creator.id),
          eq(pointsPackages.isActive, true)
        ))
        .orderBy(pointsPackages.displayOrder, pointsPackages.pointsAmount)
        .limit(limit)
        .offset(offset);

      // Calculate value propositions for each package
      const enhancedPackages = packages.map(pkg => {
        const totalPoints = pkg.pointsAmount + (pkg.bonusPoints || 0);
        const pointsPerDollar = totalPoints / parseFloat(pkg.priceUSD);
        const bonusPercentage = pkg.bonusPoints ? Math.round((pkg.bonusPoints / pkg.pointsAmount) * 100) : 0;

        return {
          ...pkg,
          totalPoints,
          pointsPerDollar: Math.round(pointsPerDollar * 100) / 100,
          bonusPercentage,
          priceUSD: parseFloat(pkg.priceUSD)
        };
      });

      return {
        success: true,
        data: {
          pointsSystem: {
            pointsName: pointsConfig?.pointsName || creator.pointsName,
            pointsSymbol: pointsConfig?.pointsSymbol || '🪙'
          },
          packages: enhancedPackages,
          pagination: {
            page,
            limit,
            hasMore: packages.length === limit
          }
        }
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching points packages');
      return {
        success: true,
        data: {
          pointsSystem: {
            pointsName: 'Points',
            pointsSymbol: '🪙'
          },
          packages: [],
          pagination: {
            page,
            limit,
            hasMore: false
          },
          message: 'No points packages available (database might be empty)'
        }
      };
    }
  });

  // Protected: Purchase a points package
  fastify.post('/purchase-package', {
    preHandler: [authMiddleware, validateBody(purchasePackageSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { packageId, paymentProvider, paymentId } = request.body as z.infer<typeof purchasePackageSchema>;

    try {
      // Get package details
      const [pointsPackage] = await db
        .select({
          id: pointsPackages.id,
          creatorId: pointsPackages.creatorId,
          name: pointsPackages.name,
          pointsAmount: pointsPackages.pointsAmount,
          priceUSD: pointsPackages.priceUSD,
          bonusPoints: pointsPackages.bonusPoints,
          isActive: pointsPackages.isActive
        })
        .from(pointsPackages)
        .where(eq(pointsPackages.publicId, packageId))
        .limit(1);

      if (!pointsPackage) {
        return reply.code(404).send({
          error: {
            code: 'PACKAGE_NOT_FOUND',
            message: 'Points package not found',
            statusCode: 404
          }
        });
      }

      if (!pointsPackage.isActive) {
        return reply.code(400).send({
          error: {
            code: 'PACKAGE_INACTIVE',
            message: 'Points package is not available for purchase',
            statusCode: 400
          }
        });
      }

      const totalPointsReceived = pointsPackage.pointsAmount + (pointsPackage.bonusPoints || 0);

      // Create purchase record
      const [purchase] = await db
        .insert(pointsPurchases)
        .values({
          userId: request.user!.id,
          creatorId: pointsPackage.creatorId,
          packageId: pointsPackage.id,
          pointsReceived: totalPointsReceived,
          amountUSD: pointsPackage.priceUSD,
          paymentProvider,
          paymentId,
          status: 'completed' // In real implementation, this would be 'pending' until payment confirmed
        })
        .returning({
          transactionId: pointsPurchases.transactionId,
          pointsReceived: pointsPurchases.pointsReceived,
          amountUSD: pointsPurchases.amountUSD,
          purchasedAt: pointsPurchases.purchasedAt
        });

      // Get current balance or create new one
      const [currentBalance] = await db
        .select({ balance: pointBalances.balance })
        .from(pointBalances)
        .where(and(
          eq(pointBalances.userId, request.user!.id),
          eq(pointBalances.creatorId, pointsPackage.creatorId)
        ))
        .limit(1);

      const oldBalance = currentBalance?.balance || 0;
      const newBalance = oldBalance + totalPointsReceived;

      // Create transaction record
      const [transaction] = await db
        .insert(pointTransactions)
        .values({
          userId: request.user!.id,
          creatorId: pointsPackage.creatorId,
          amount: totalPointsReceived,
          balance: newBalance,
          type: 'purchase',
          source: 'package_purchase',
          referenceType: 'points_purchase',
          referenceId: parseInt(String(purchase.transactionId)),
          description: `Purchased ${pointsPackage.name}`
        })
        .returning({
          transactionId: pointTransactions.transactionId,
          amount: pointTransactions.amount,
          balance: pointTransactions.balance,
          createdAt: pointTransactions.createdAt
        });

      // Update or create balance record
      if (currentBalance) {
        await db
          .update(pointBalances)
          .set({
            balance: newBalance,
            lastUpdated: new Date()
          })
          .where(and(
            eq(pointBalances.userId, request.user!.id),
            eq(pointBalances.creatorId, pointsPackage.creatorId)
          ));
      } else {
        await db
          .insert(pointBalances)
          .values({
            userId: request.user!.id,
            creatorId: pointsPackage.creatorId,
            balance: newBalance
          });
      }

      return reply.code(201).send({
        success: true,
        data: {
          purchase,
          transaction,
          balance: {
            previous: oldBalance,
            current: newBalance,
            added: totalPointsReceived
          },
          message: 'Points package purchased successfully'
        }
      });
    } catch (error) {
      fastify.log.error(error as Error, 'Error purchasing points package');
      return reply.code(500).send({
        error: {
          code: 'PURCHASE_FAILED',
          message: 'Failed to purchase points package',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Get user's points transaction history
  fastify.get('/transactions', {
    preHandler: [authMiddleware, validateQuery(pointsQuerySchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit, type } = request.query as z.infer<typeof pointsQuerySchema>;
    const offset = (page - 1) * limit;

    try {
      // Build query with optional type filter
      let query = db
        .select({
          id: pointTransactions.transactionId,
          amount: pointTransactions.amount,
          balance: pointTransactions.balance,
          type: pointTransactions.type,
          source: pointTransactions.source,
          description: pointTransactions.description,
          createdAt: pointTransactions.createdAt,
          creator: {
            id: creators.publicId,
            name: sql<string>`${user.firstName} || ' ' || ${user.lastName}`,
            pointsName: creators.pointsName
          }
        })
        .from(pointTransactions)
        .innerJoin(creators, eq(pointTransactions.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .where(eq(pointTransactions.userId, request.user!.id))
        .orderBy(desc(pointTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      // Apply type filter if provided
      if (type) {
        query = db
          .select({
            id: pointTransactions.transactionId,
            amount: pointTransactions.amount,
            balance: pointTransactions.balance,
            type: pointTransactions.type,
            source: pointTransactions.source,
            description: pointTransactions.description,
            createdAt: pointTransactions.createdAt,
            creator: {
              id: creators.publicId,
              name: sql<string>`${user.firstName} || ' ' || ${user.lastName}`,
              pointsName: creators.pointsName
            }
          })
          .from(pointTransactions)
          .innerJoin(creators, eq(pointTransactions.creatorId, creators.id))
          .innerJoin(user, eq(creators.userId, user.id))
          .where(and(
            eq(pointTransactions.userId, request.user!.id),
            eq(pointTransactions.type, type)
          ))
          .orderBy(desc(pointTransactions.createdAt))
          .limit(limit)
          .offset(offset);
      }

      const transactions = await query;

      // Get summary stats
      const stats = await db
        .select({
          totalEarned: sql<number>`sum(case when ${pointTransactions.amount} > 0 then ${pointTransactions.amount} else 0 end)`,
          totalSpent: sql<number>`sum(case when ${pointTransactions.amount} < 0 then abs(${pointTransactions.amount}) else 0 end)`,
          transactionCount: sql<number>`count(*)`
        })
        .from(pointTransactions)
        .where(eq(pointTransactions.userId, request.user!.id));

      return {
        success: true,
        data: {
          transactions,
          stats: stats[0] || { totalEarned: 0, totalSpent: 0, transactionCount: 0 },
          pagination: {
            page,
            limit,
            hasMore: transactions.length === limit
          }
        }
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching points transactions');
      return {
        success: true,
        data: {
          transactions: [],
          stats: { totalEarned: 0, totalSpent: 0, transactionCount: 0 },
          pagination: {
            page,
            limit,
            hasMore: false
          },
          message: 'No transactions found (database might be empty)'
        }
      };
    }
  });

  // Protected: Get all points balances for user (across all creators)
  fastify.get('/balances', {
    preHandler: [authMiddleware, validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;

    try {
      const balances = await db
        .select({
          balance: pointBalances.balance,
          lastUpdated: pointBalances.lastUpdated,
          creator: {
            id: creators.publicId,
            name: sql<string>`${user.firstName} || ' ' || ${user.lastName}`,
            userName: user.userName,
            pointsName: creators.pointsName
          }
        })
        .from(pointBalances)
        .innerJoin(creators, eq(pointBalances.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .where(eq(pointBalances.userId, request.user!.id))
        .orderBy(desc(pointBalances.balance))
        .limit(limit)
        .offset(offset);

      // Get total points across all creators
      const [totalStats] = await db
        .select({
          totalPoints: sql<number>`sum(${pointBalances.balance})`,
          creatorCount: sql<number>`count(*)`
        })
        .from(pointBalances)
        .where(eq(pointBalances.userId, request.user!.id));

      return {
        success: true,
        data: {
          balances,
          summary: {
            totalPoints: totalStats?.totalPoints || 0,
            creatorsWithPoints: totalStats?.creatorCount || 0
          },
          pagination: {
            page,
            limit,
            hasMore: balances.length === limit
          }
        }
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching points balances');
      return {
        success: true,
        data: {
          balances: [],
          summary: { totalPoints: 0, creatorsWithPoints: 0 },
          pagination: {
            page,
            limit,
            hasMore: false
          },
          message: 'No balances found (database might be empty)'
        }
      };
    }
  });

  // ===================================================================
  // CREATOR PACKAGE MANAGEMENT
  // ===================================================================

  // Protected: Get creator's point packages for management
  fastify.get('/my-packages', {
    preHandler: [creatorOnlyMiddleware, validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;
    const creatorId = request.creator!.id;

    try {
      const packages = await db
        .select({
          id: pointsPackages.publicId,
          name: pointsPackages.name,
          pointsAmount: pointsPackages.pointsAmount,
          priceUSD: pointsPackages.priceUSD,
          bonusPoints: pointsPackages.bonusPoints,
          isActive: pointsPackages.isActive,
          displayOrder: pointsPackages.displayOrder,
          createdAt: pointsPackages.createdAt
        })
        .from(pointsPackages)
        .where(eq(pointsPackages.creatorId, creatorId))
        .orderBy(pointsPackages.displayOrder, pointsPackages.pointsAmount)
        .limit(limit)
        .offset(offset);

      // Get sales stats for each package
      const packagesWithStats = await Promise.all(
        packages.map(async (pkg) => {
          const [stats] = await db
            .select({
              totalSales: sql<number>`count(*)`,
              totalRevenue: sql<number>`sum(${pointsPurchases.amountUSD})`,
              totalPoints: sql<number>`sum(${pointsPurchases.pointsReceived})`
            })
            .from(pointsPurchases)
            .innerJoin(pointsPackages, eq(pointsPurchases.packageId, pointsPackages.id))
            .where(eq(pointsPackages.publicId, pkg.id));

          return {
            ...pkg,
            priceUSD: parseFloat(pkg.priceUSD),
            stats: {
              totalSales: stats.totalSales || 0,
              totalRevenue: parseFloat(String(stats.totalRevenue || '0')),
              totalPointsSold: stats.totalPoints || 0
            }
          };
        })
      );

      return {
        success: true,
        data: {
          packages: packagesWithStats,
          pagination: {
            page,
            limit,
            hasMore: packages.length === limit
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching creator packages');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch packages',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Create new points package
  fastify.post('/packages', {
    preHandler: [creatorOnlyMiddleware, validateBody(createPackageSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const packageData = request.body as z.infer<typeof createPackageSchema>;
    const creatorId = request.creator!.id;

    try {
      const [newPackage] = await db
        .insert(pointsPackages)
        .values({
          creatorId,
          ...packageData,
          priceUSD: packageData.priceUSD.toFixed(2)
        })
        .returning({
          id: pointsPackages.publicId,
          name: pointsPackages.name,
          pointsAmount: pointsPackages.pointsAmount,
          priceUSD: pointsPackages.priceUSD,
          bonusPoints: pointsPackages.bonusPoints,
          displayOrder: pointsPackages.displayOrder,
          createdAt: pointsPackages.createdAt
        });

      return reply.code(201).send({
        success: true,
        data: {
          message: 'Points package created successfully',
          package: {
            ...newPackage,
            priceUSD: parseFloat(newPackage.priceUSD)
          }
        }
      });

    } catch (error) {
      fastify.log.error(error as Error, 'Error creating package');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create package',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Update points package
  fastify.put('/packages/:packageId', {
    preHandler: [creatorOnlyMiddleware, validateParams(packageParamsSchema), validateBody(updatePackageSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { packageId } = request.params as z.infer<typeof packageParamsSchema>;
    const updates = request.body as z.infer<typeof updatePackageSchema>;
    const creatorId = request.creator!.id;

    try {
      // Verify package ownership
      const [packageInfo] = await db
        .select({ internalId: pointsPackages.id })
        .from(pointsPackages)
        .where(and(
          eq(pointsPackages.creatorId, creatorId),
          eq(pointsPackages.publicId, packageId)
        ))
        .limit(1);

      if (!packageInfo) {
        return reply.code(404).send({
          error: {
            code: 'PACKAGE_NOT_FOUND',
            message: 'Package not found or not owned by creator',
            statusCode: 404
          }
        });
      }

      // Prepare updates
      const dbUpdates: any = { ...updates };
      if (updates.priceUSD) {
        dbUpdates.priceUSD = updates.priceUSD.toFixed(2);
      }

      const [updatedPackage] = await db
        .update(pointsPackages)
        .set(dbUpdates)
        .where(eq(pointsPackages.id, packageInfo.internalId))
        .returning({
          id: pointsPackages.publicId,
          name: pointsPackages.name,
          pointsAmount: pointsPackages.pointsAmount,
          priceUSD: pointsPackages.priceUSD,
          bonusPoints: pointsPackages.bonusPoints,
          isActive: pointsPackages.isActive,
          displayOrder: pointsPackages.displayOrder
        });

      return {
        success: true,
        data: {
          message: 'Package updated successfully',
          package: {
            ...updatedPackage,
            priceUSD: parseFloat(updatedPackage.priceUSD)
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error updating package');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update package',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Delete points package
  fastify.delete('/packages/:packageId', {
    preHandler: [creatorOnlyMiddleware, validateParams(packageParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { packageId } = request.params as z.infer<typeof packageParamsSchema>;
    const creatorId = request.creator!.id;

    try {
      // Verify package ownership
      const [packageInfo] = await db
        .select({ internalId: pointsPackages.id })
        .from(pointsPackages)
        .where(and(
          eq(pointsPackages.creatorId, creatorId),
          eq(pointsPackages.publicId, packageId)
        ))
        .limit(1);

      if (!packageInfo) {
        return reply.code(404).send({
          error: {
            code: 'PACKAGE_NOT_FOUND',
            message: 'Package not found or not owned by creator',
            statusCode: 404
          }
        });
      }

      // Soft delete by setting inactive
      await db
        .update(pointsPackages)
        .set({ isActive: false })
        .where(eq(pointsPackages.id, packageInfo.internalId));

      return {
        success: true,
        data: {
          message: 'Package deleted successfully'
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error deleting package');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete package',
          statusCode: 500
        }
      });
    }
  });
}