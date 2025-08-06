import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { 
  db, 
  creatorStores,
  products,
  orders,
  orderItems,
  userInventory,
  pointTransactions,
  pointBalances,
  creators,
  user,
  avatarItems
} from '@triberspace/database';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery, validateBody } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';

const creatorParamsSchema = z.object({
  creatorId: publicIdSchema
});

const storeQuerySchema = paginationSchema.extend({
  productType: z.string().optional(),
  priceRange: z.enum(['low', 'medium', 'high']).optional()
});

const purchaseSchema = z.object({
  productId: publicIdSchema,
  quantity: z.number().int().min(1).max(10).default(1)
});

export async function v1StoreRoutes(fastify: FastifyInstance) {
  // Public: Get creator's store info
  fastify.get('/:creatorId', {
    preHandler: [optionalAuthMiddleware, validateParams(creatorParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { creatorId } = request.params as z.infer<typeof creatorParamsSchema>;

    try {
      // Get creator info first
      const [creator] = await db
        .select({
          id: creators.id,
          publicId: creators.publicId,
          bio: creators.bio,
          pointsName: creators.pointsName,
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
        return reply.code(404).send({
          error: {
            code: 'CREATOR_NOT_FOUND',
            message: 'Creator not found',
            statusCode: 404
          }
        });
      }

      // Get store info
      const [store] = await db
        .select({
          id: creatorStores.publicId,
          storeName: creatorStores.storeName,
          description: creatorStores.description,
          bannerUrl: creatorStores.bannerUrl,
          logoUrl: creatorStores.logoUrl,
          isActive: creatorStores.isActive,
          settings: creatorStores.settings,
          createdAt: creatorStores.createdAt
        })
        .from(creatorStores)
        .where(eq(creatorStores.creatorId, creator.id))
        .limit(1);

      // Get basic product stats
      const productStats = await db
        .select({
          totalProducts: sql<number>`count(*)`,
          activeProducts: sql<number>`count(*) filter (where ${products.isActive} = true)`
        })
        .from(products)
        .where(eq(products.creatorId, creator.id));

      return {
        success: true,
        data: {
          creator,
          store: store || null,
          stats: productStats[0] || { totalProducts: 0, activeProducts: 0 }
        }
      };
    } catch (error) {
      fastify.log.error('Error fetching creator store:', error);
      return reply.code(500).send({
        error: {
          code: 'STORE_FETCH_ERROR',
          message: 'Failed to fetch store information',
          statusCode: 500
        }
      });
    }
  });

  // Public: Browse creator's store products
  fastify.get('/:creatorId/products', {
    preHandler: [optionalAuthMiddleware, validateParams(creatorParamsSchema), validateQuery(storeQuerySchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { creatorId } = request.params as z.infer<typeof creatorParamsSchema>;
    const { page, limit, productType, priceRange } = request.query as z.infer<typeof storeQuerySchema>;
    const offset = (page - 1) * limit;

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
            code: 'CREATOR_NOT_FOUND',
            message: 'Creator not found',
            statusCode: 404
          }
        });
      }

      // Build base query
      let query = db
        .select({
          id: products.publicId,
          name: products.name,
          description: products.description,
          productType: products.productType,
          digitalAssetUrl: products.digitalAssetUrl,
          pricePoints: products.pricePoints,
          isActive: products.isActive,
          maxQuantity: products.maxQuantity,
          currentStock: products.currentStock,
          releaseDate: products.releaseDate,
          metadata: products.metadata,
          displayOrder: products.displayOrder,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt
        })
        .from(products)
        .where(and(
          eq(products.creatorId, creator.id),
          eq(products.isActive, true) // Only show active products publicly
        ))
        .orderBy(desc(products.displayOrder), desc(products.createdAt))
        .limit(limit)
        .offset(offset);

      // TODO: Add filtering by productType and priceRange when needed
      const productsList = await query;

      // Enhance products with avatar item info if applicable
      const enhancedProducts = await Promise.all(
        productsList.map(async (product) => {
          let avatarItem = null;
          
          // If this product is linked to an avatar item, get the item details
          if (product.productType === 'avatar_item' && product.digitalAssetUrl) {
            try {
              const [item] = await db
                .select({
                  id: avatarItems.publicId,
                  slotName: avatarItems.slotName,
                  thumbnailUrl: avatarItems.thumbnailUrl,
                  metadata: avatarItems.metadata
                })
                .from(avatarItems)
                .where(eq(avatarItems.id, parseInt(product.digitalAssetUrl || '0')))
                .limit(1);
              
              avatarItem = item || null;
            } catch (itemError) {
              // Ignore item fetch errors
            }
          }

          return {
            ...product,
            avatarItem
          };
        })
      );

      return {
        success: true,
        data: {
          products: enhancedProducts,
          pagination: {
            page,
            limit,
            hasMore: productsList.length === limit
          }
        }
      };
    } catch (error) {
      fastify.log.error('Error fetching store products:', error);
      return {
        success: true,
        data: {
          products: [],
          pagination: {
            page,
            limit,
            hasMore: false
          },
          message: 'No products available (database might be empty)'
        }
      };
    }
  });

  // Protected: Purchase a product
  fastify.post('/purchase', {
    preHandler: [authMiddleware, validateBody(purchaseSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { productId, quantity } = request.body as z.infer<typeof purchaseSchema>;

    try {
      // Get product details
      const [product] = await db
        .select({
          id: products.id,
          name: products.name,
          creatorId: products.creatorId,
          productType: products.productType,
          pricePoints: products.pricePoints,
          isActive: products.isActive,
          maxQuantity: products.maxQuantity,
          currentStock: products.currentStock,
          itemId: products.itemId
        })
        .from(products)
        .where(eq(products.publicId, productId))
        .limit(1);

      if (!product) {
        return reply.code(404).send({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found',
            statusCode: 404
          }
        });
      }

      if (!product.isActive) {
        return reply.code(400).send({
          error: {
            code: 'PRODUCT_INACTIVE',
            message: 'Product is not available for purchase',
            statusCode: 400
          }
        });
      }

      // Check stock availability
      if (product.currentStock !== null && product.currentStock < quantity) {
        return reply.code(400).send({
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Only ${product.currentStock} items available`,
            statusCode: 400
          }
        });
      }

      const totalPoints = product.pricePoints * quantity;

      // Check user's points balance for this creator
      const [balance] = await db
        .select({ balance: pointBalances.balance })
        .from(pointBalances)
        .where(and(
          eq(pointBalances.userId, request.user!.id),
          eq(pointBalances.creatorId, product.creatorId)
        ))
        .limit(1);

      const currentBalance = balance?.balance || 0;
      if (currentBalance < totalPoints) {
        return reply.code(400).send({
          error: {
            code: 'INSUFFICIENT_POINTS',
            message: `Insufficient points. Need ${totalPoints}, have ${currentBalance}`,
            statusCode: 400
          }
        });
      }

      // Create order
      const [order] = await db
        .insert(orders)
        .values({
          userId: request.user!.id,
          creatorId: product.creatorId,
          totalPoints,
          status: 'pending'
        })
        .returning({
          id: orders.id,
          orderNumber: orders.orderNumber,
          totalPoints: orders.totalPoints,
          status: orders.status,
          createdAt: orders.createdAt
        });

      // Create order item
      const [orderItem] = await db
        .insert(orderItems)
        .values({
          orderId: order.id,
          productId: product.id,
          quantity,
          pointsPerItem: product.pricePoints,
          totalPoints,
          metadata: { purchasedAt: new Date().toISOString() }
        })
        .returning({
          quantity: orderItems.quantity,
          pointsPerItem: orderItems.pointsPerItem,
          totalPoints: orderItems.totalPoints
        });

      // Deduct points (create transaction)
      const [transaction] = await db
        .insert(pointTransactions)
        .values({
          userId: request.user!.id,
          creatorId: product.creatorId,
          amount: -totalPoints,
          balance: currentBalance - totalPoints,
          type: 'purchase',
          source: 'store',
          referenceType: 'order',
          referenceId: order.id,
          description: `Purchase: ${product.name} x${quantity}`
        })
        .returning({
          transactionId: pointTransactions.transactionId,
          amount: pointTransactions.amount,
          balance: pointTransactions.balance
        });

      // Update points balance
      await db
        .update(pointBalances)
        .set({
          balance: currentBalance - totalPoints,
          lastUpdated: new Date()
        })
        .where(and(
          eq(pointBalances.userId, request.user!.id),
          eq(pointBalances.creatorId, product.creatorId)
        ));

      // Update product stock if limited
      if (product.currentStock !== null) {
        await db
          .update(products)
          .set({
            currentStock: product.currentStock - quantity,
            updatedAt: new Date()
          })
          .where(eq(products.id, product.id));
      }

      // Add to user inventory
      await db
        .insert(userInventory)
        .values({
          userId: request.user!.id,
          productId: product.id,
          orderId: order.id,
          quantity,
          metadata: { 
            purchasePrice: product.pricePoints,
            purchaseDate: new Date().toISOString()
          }
        });

      // Mark order as completed
      await db
        .update(orders)
        .set({
          status: 'completed',
          paymentTransactionId: parseInt(String(transaction.transactionId)),
          updatedAt: new Date()
        })
        .where(eq(orders.id, order.id));

      return reply.code(201).send({
        success: true,
        data: {
          order: {
            ...order,
            status: 'completed'
          },
          transaction,
          message: 'Purchase completed successfully'
        }
      });
    } catch (error) {
      fastify.log.error('Error processing purchase:', error);
      return reply.code(500).send({
        error: {
          code: 'PURCHASE_FAILED',
          message: 'Failed to process purchase',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Get user's orders
  fastify.get('/my-orders', {
    preHandler: [authMiddleware, validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;

    try {
      const userOrders = await db
        .select({
          id: orders.orderNumber,
          totalPoints: orders.totalPoints,
          status: orders.status,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          creator: {
            id: creators.publicId,
            name: sql<string>`${user.firstName} || ' ' || ${user.lastName}`,
            pointsName: creators.pointsName
          }
        })
        .from(orders)
        .innerJoin(creators, eq(orders.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .where(eq(orders.userId, request.user!.id))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        data: {
          orders: userOrders,
          pagination: {
            page,
            limit,
            hasMore: userOrders.length === limit
          }
        }
      };
    } catch (error) {
      fastify.log.error('Error fetching user orders:', error);
      return {
        success: true,
        data: {
          orders: [],
          pagination: {
            page,
            limit,
            hasMore: false
          },
          message: 'No orders found (database might be empty)'
        }
      };
    }
  });

  // Protected: Get user's inventory
  fastify.get('/my-inventory', {
    preHandler: [authMiddleware, validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;

    try {
      const inventory = await db
        .select({
          quantity: userInventory.quantity,
          acquiredAt: userInventory.acquiredAt,
          metadata: userInventory.metadata,
          product: {
            id: products.publicId,
            name: products.name,
            productType: products.productType,
            digitalAssetUrl: products.digitalAssetUrl,
            metadata: products.metadata
          },
          creator: {
            id: creators.publicId,
            pointsName: creators.pointsName
          }
        })
        .from(userInventory)
        .innerJoin(products, eq(userInventory.productId, products.id))
        .innerJoin(creators, eq(products.creatorId, creators.id))
        .where(eq(userInventory.userId, request.user!.id))
        .orderBy(desc(userInventory.acquiredAt))
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        data: {
          inventory,
          pagination: {
            page,
            limit,
            hasMore: inventory.length === limit
          }
        }
      };
    } catch (error) {
      fastify.log.error('Error fetching user inventory:', error);
      return {
        success: true,
        data: {
          inventory: [],
          pagination: {
            page,
            limit,
            hasMore: false
          },
          message: 'No items in inventory (database might be empty)'
        }
      };
    }
  });
}