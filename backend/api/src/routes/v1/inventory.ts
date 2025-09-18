import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { 
  db, 
  userInventory,
  products,
  avatarItems,
  userAvatarInventory,
  creators,
  user,
  orders,
  creatorStores
} from '@triberspace/database';
import { eq, desc, and, sql, or, isNull } from 'drizzle-orm';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery, validateBody } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';

// ===================================================================
// UNIVERSAL INVENTORY SCHEMAS
// ===================================================================

const inventoryQuerySchema = paginationSchema.extend({
  productType: z.enum(['avatar', 'collectible', 'digital_asset', 'merchandise', 'access_pass', 'custom']).optional(),
  creatorId: publicIdSchema.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'name', 'type']).default('newest')
});

const inventoryItemSchema = z.object({
  inventoryId: z.coerce.number().int().positive()
});

const transferItemSchema = z.object({
  inventoryId: z.coerce.number().int().positive(),
  toUserId: z.string().min(1, 'Recipient user ID is required'),
  quantity: z.number().int().min(1).default(1),
  message: z.string().max(500).optional()
});

const consumeItemSchema = z.object({
  inventoryId: z.coerce.number().int().positive(),
  quantity: z.number().int().min(1).default(1)
});

const inventoryStatsSchema = z.object({
  groupBy: z.enum(['type', 'creator', 'month']).default('type')
});

export async function v1InventoryRoutes(fastify: FastifyInstance) {
  
  // ===================================================================
  // UNIVERSAL USER INVENTORY
  // ===================================================================

  // Protected: Get user's complete inventory with all digital assets
  fastify.get('/', {
    preHandler: [authMiddleware, validateQuery(inventoryQuerySchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit, productType, creatorId, search, sortBy } = 
      request.query as z.infer<typeof inventoryQuerySchema>;
    const offset = (page - 1) * limit;
    const userId = request.user!.id;

    try {
      // Build where conditions
      const conditions = [eq(userInventory.userId, userId)];
      
      if (productType) {
        conditions.push(eq(products.productType, productType));
      }
      
      if (creatorId) {
        conditions.push(eq(creators.publicId, creatorId));
      }
      
      if (search) {
        conditions.push(sql`${products.name} ILIKE ${'%' + search + '%'}`);
      }

      // Build sort order
      let orderBy;
      switch (sortBy) {
        case 'oldest':
          orderBy = userInventory.acquiredAt;
          break;
        case 'name':
          orderBy = products.name;
          break;
        case 'type':
          orderBy = products.productType;
          break;
        case 'newest':
        default:
          orderBy = desc(userInventory.acquiredAt);
      }

      // Get inventory items with full product and creator details
      const inventoryItems = await db
        .select({
          id: userInventory.id,
          quantity: userInventory.quantity,
          acquiredAt: userInventory.acquiredAt,
          metadata: userInventory.metadata,
          product: {
            id: products.publicId,
            name: products.name,
            description: products.description,
            productType: products.productType,
            digitalAssetUrl: products.digitalAssetUrl,
            metadata: products.metadata,
            itemId: products.itemId
          },
          creator: {
            id: creators.publicId,
            username: user.username,
            pointsName: creators.pointsName
          },
          store: {
            id: creatorStores.publicId,
            name: creatorStores.storeName
          }
        })
        .from(userInventory)
        .innerJoin(products, eq(userInventory.productId, products.id))
        .innerJoin(creators, eq(products.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .innerJoin(creatorStores, eq(products.creatorId, creatorStores.creatorId))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      // Enhance items with avatar-specific data if applicable
      const enhancedItems = await Promise.all(
        inventoryItems.map(async (item) => {
          let avatarItemDetails = null;
          
          // If this is an avatar product, get avatar item details
          if (item.product.productType === 'avatar' && item.product.itemId) {
            const [avatarItem] = await db
              .select({
                id: avatarItems.publicId,
                slotName: avatarItems.slotName,
                meshUrl: avatarItems.meshUrl,
                textureUrl: avatarItems.textureUrl,
                thumbnailUrl: avatarItems.thumbnailUrl,
                metadata: avatarItems.metadata
              })
              .from(avatarItems)
              .where(eq(avatarItems.id, item.product.itemId))
              .limit(1);
            
            if (avatarItem) {
              // Check if item is in avatar inventory too
              const [avatarInv] = await db
                .select({ 
                  source: userAvatarInventory.source,
                  acquiredAt: userAvatarInventory.acquiredAt 
                })
                .from(userAvatarInventory)
                .where(and(
                  eq(userAvatarInventory.userId, userId),
                  eq(userAvatarInventory.itemId, item.product.itemId)
                ))
                .limit(1);

              avatarItemDetails = {
                ...avatarItem,
                inAvatarInventory: !!avatarInv,
                avatarInventorySource: avatarInv?.source || null
              };
            }
          }

          return {
            ...item,
            avatarItemDetails
          };
        })
      );

      // Get total count for pagination info
      const [totalCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userInventory)
        .innerJoin(products, eq(userInventory.productId, products.id))
        .innerJoin(creators, eq(products.creatorId, creators.id))
        .where(and(...conditions));

      return {
        success: true,
        data: {
          inventory: enhancedItems,
          pagination: {
            page,
            limit,
            hasMore: inventoryItems.length === limit,
            total: totalCount.count || 0
          },
          filters: {
            productType: productType || null,
            creatorId: creatorId || null,
            search: search || null,
            sortBy
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching user inventory');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch inventory',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Get specific inventory item details
  fastify.get('/:inventoryId', {
    preHandler: [authMiddleware, validateParams(inventoryItemSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { inventoryId } = request.params as z.infer<typeof inventoryItemSchema>;
    const userId = request.user!.id;

    try {
      // Get inventory item with full details
      const [inventoryItem] = await db
        .select({
          id: userInventory.id,
          quantity: userInventory.quantity,
          acquiredAt: userInventory.acquiredAt,
          metadata: userInventory.metadata,
          orderId: userInventory.orderId,
          product: {
            id: products.publicId,
            name: products.name,
            description: products.description,
            productType: products.productType,
            digitalAssetUrl: products.digitalAssetUrl,
            pricePoints: products.pricePoints,
            metadata: products.metadata,
            itemId: products.itemId,
            createdAt: products.createdAt
          },
          creator: {
            id: creators.publicId,
            username: user.username,
            bio: creators.bio,
            pointsName: creators.pointsName
          },
          store: {
            id: creatorStores.publicId,
            name: creatorStores.storeName,
            description: creatorStores.description
          }
        })
        .from(userInventory)
        .innerJoin(products, eq(userInventory.productId, products.id))
        .innerJoin(creators, eq(products.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .innerJoin(creatorStores, eq(products.creatorId, creatorStores.creatorId))
        .where(and(
          eq(userInventory.id, inventoryId),
          eq(userInventory.userId, userId)
        ))
        .limit(1);

      if (!inventoryItem) {
        return reply.code(404).send({
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Inventory item not found',
            statusCode: 404
          }
        });
      }

      // Get order details if available
      let orderDetails = null;
      if (inventoryItem.orderId) {
        const [order] = await db
          .select({
            orderNumber: orders.orderNumber,
            totalPoints: orders.totalPoints,
            status: orders.status,
            createdAt: orders.createdAt
          })
          .from(orders)
          .where(eq(orders.id, inventoryItem.orderId))
          .limit(1);
        
        orderDetails = order || null;
      }

      // Get avatar item details if applicable
      let avatarItemDetails = null;
      if (inventoryItem.product.productType === 'avatar' && inventoryItem.product.itemId) {
        const [avatarItem] = await db
          .select({
            id: avatarItems.publicId,
            slotName: avatarItems.slotName,
            meshUrl: avatarItems.meshUrl,
            textureUrl: avatarItems.textureUrl,
            thumbnailUrl: avatarItems.thumbnailUrl,
            metadata: avatarItems.metadata
          })
          .from(avatarItems)
          .where(eq(avatarItems.id, inventoryItem.product.itemId))
          .limit(1);
        
        avatarItemDetails = avatarItem || null;
      }

      return {
        success: true,
        data: {
          inventoryItem: {
            ...inventoryItem,
            orderDetails,
            avatarItemDetails
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching inventory item');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch inventory item',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Get inventory statistics
  fastify.get('/stats/overview', {
    preHandler: [authMiddleware, validateQuery(inventoryStatsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { groupBy } = request.query as z.infer<typeof inventoryStatsSchema>;
    const userId = request.user!.id;

    try {
      // Get total inventory value and count
      const [totals] = await db
        .select({
          totalItems: sql<number>`sum(${userInventory.quantity})`,
          uniqueProducts: sql<number>`count(distinct ${userInventory.productId})`,
          totalValue: sql<number>`sum(${userInventory.quantity} * ${products.pricePoints})`
        })
        .from(userInventory)
        .innerJoin(products, eq(userInventory.productId, products.id))
        .where(eq(userInventory.userId, userId));

      // Get breakdown by grouping
      let breakdown;
      switch (groupBy) {
        case 'type':
          breakdown = await db
            .select({
              category: products.productType,
              count: sql<number>`sum(${userInventory.quantity})`,
              uniqueItems: sql<number>`count(distinct ${products.id})`,
              totalValue: sql<number>`sum(${userInventory.quantity} * ${products.pricePoints})`
            })
            .from(userInventory)
            .innerJoin(products, eq(userInventory.productId, products.id))
            .where(eq(userInventory.userId, userId))
            .groupBy(products.productType)
            .orderBy(desc(sql`sum(${userInventory.quantity})`));
          break;

        case 'creator':
          breakdown = await db
            .select({
              category: user.username,
              creatorId: creators.publicId,
              count: sql<number>`sum(${userInventory.quantity})`,
              uniqueItems: sql<number>`count(distinct ${products.id})`,
              totalValue: sql<number>`sum(${userInventory.quantity} * ${products.pricePoints})`
            })
            .from(userInventory)
            .innerJoin(products, eq(userInventory.productId, products.id))
            .innerJoin(creators, eq(products.creatorId, creators.id))
            .innerJoin(user, eq(creators.userId, user.id))
            .where(eq(userInventory.userId, userId))
            .groupBy(creators.publicId, user.username)
            .orderBy(desc(sql`sum(${userInventory.quantity})`));
          break;

        case 'month':
          breakdown = await db
            .select({
              category: sql<string>`to_char(${userInventory.acquiredAt}, 'YYYY-MM')`,
              count: sql<number>`sum(${userInventory.quantity})`,
              uniqueItems: sql<number>`count(distinct ${products.id})`,
              totalValue: sql<number>`sum(${userInventory.quantity} * ${products.pricePoints})`
            })
            .from(userInventory)
            .innerJoin(products, eq(userInventory.productId, products.id))
            .where(eq(userInventory.userId, userId))
            .groupBy(sql`to_char(${userInventory.acquiredAt}, 'YYYY-MM')`)
            .orderBy(desc(sql`to_char(${userInventory.acquiredAt}, 'YYYY-MM')`))
            .limit(12);
          break;
      }

      // Get recent acquisitions
      const recentItems = await db
        .select({
          id: userInventory.id,
          productName: products.name,
          productType: products.productType,
          quantity: userInventory.quantity,
          acquiredAt: userInventory.acquiredAt
        })
        .from(userInventory)
        .innerJoin(products, eq(userInventory.productId, products.id))
        .where(eq(userInventory.userId, userId))
        .orderBy(desc(userInventory.acquiredAt))
        .limit(5);

      return {
        success: true,
        data: {
          overview: {
            totalItems: totals.totalItems || 0,
            uniqueProducts: totals.uniqueProducts || 0,
            totalValue: totals.totalValue || 0
          },
          breakdown: {
            groupBy,
            data: breakdown || []
          },
          recentAcquisitions: recentItems
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching inventory stats');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch inventory statistics',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Transfer item to another user
  fastify.post('/transfer', {
    preHandler: [authMiddleware, validateBody(transferItemSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { inventoryId, toUserId, quantity, message } = 
      request.body as z.infer<typeof transferItemSchema>;
    const fromUserId = request.user!.id;

    try {
      // Verify sender owns the item and has enough quantity
      const [senderItem] = await db
        .select({
          internalId: userInventory.id,
          productId: userInventory.productId,
          currentQuantity: userInventory.quantity,
          productName: products.name,
          productType: products.productType
        })
        .from(userInventory)
        .innerJoin(products, eq(userInventory.productId, products.id))
        .where(and(
          eq(userInventory.id, inventoryId),
          eq(userInventory.userId, fromUserId)
        ))
        .limit(1);

      if (!senderItem) {
        return reply.code(404).send({
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Inventory item not found',
            statusCode: 404
          }
        });
      }

      if (senderItem.currentQuantity < quantity) {
        return reply.code(400).send({
          error: {
            code: 'INSUFFICIENT_QUANTITY',
            message: `You only have ${senderItem.currentQuantity} of this item`,
            statusCode: 400
          }
        });
      }

      // Verify recipient exists
      const [recipient] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, toUserId))
        .limit(1);

      if (!recipient) {
        return reply.code(404).send({
          error: {
            code: 'RECIPIENT_NOT_FOUND',
            message: 'Recipient user not found',
            statusCode: 404
          }
        });
      }

      // Cannot transfer to self
      if (fromUserId === toUserId) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_TRANSFER',
            message: 'Cannot transfer items to yourself',
            statusCode: 400
          }
        });
      }

      // Start transaction for atomic transfer
      await db.transaction(async (tx) => {
        // Reduce sender's quantity
        if (senderItem.currentQuantity === quantity) {
          // Remove item completely if transferring all
          await tx
            .delete(userInventory)
            .where(eq(userInventory.id, senderItem.internalId));
        } else {
          // Reduce quantity
          await tx
            .update(userInventory)
            .set({
              quantity: senderItem.currentQuantity - quantity,
              })
            .where(eq(userInventory.id, senderItem.internalId));
        }

        // Check if recipient already has this item
        const [recipientItem] = await tx
          .select({ 
            internalId: userInventory.id,
            currentQuantity: userInventory.quantity 
          })
          .from(userInventory)
          .where(and(
            eq(userInventory.userId, toUserId),
            eq(userInventory.productId, senderItem.productId)
          ))
          .limit(1);

        if (recipientItem) {
          // Update existing inventory entry
          await tx
            .update(userInventory)
            .set({
              quantity: recipientItem.currentQuantity + quantity,
              })
            .where(eq(userInventory.id, recipientItem.internalId));
        } else {
          // Create new inventory entry for recipient
          await tx
            .insert(userInventory)
            .values({
              userId: toUserId,
              productId: senderItem.productId,
              quantity,
              metadata: {
                source: 'transfer',
                fromUserId,
                message: message || null,
                transferDate: new Date().toISOString()
              }
            });
        }
      });

      return {
        success: true,
        data: {
          message: `Successfully transferred ${quantity} ${senderItem.productName} to recipient`,
          transfer: {
            productName: senderItem.productName,
            productType: senderItem.productType,
            quantity,
            toUserId,
            transferDate: new Date()
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error transferring item');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to transfer item',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Consume/use an item (for consumables)
  fastify.post('/consume', {
    preHandler: [authMiddleware, validateBody(consumeItemSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { inventoryId, quantity } = request.body as z.infer<typeof consumeItemSchema>;
    const userId = request.user!.id;

    try {
      // Get inventory item details
      const [inventoryItem] = await db
        .select({
          internalId: userInventory.id,
          currentQuantity: userInventory.quantity,
          productName: products.name,
          productType: products.productType,
          metadata: products.metadata
        })
        .from(userInventory)
        .innerJoin(products, eq(userInventory.productId, products.id))
        .where(and(
          eq(userInventory.id, inventoryId),
          eq(userInventory.userId, userId)
        ))
        .limit(1);

      if (!inventoryItem) {
        return reply.code(404).send({
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Inventory item not found',
            statusCode: 404
          }
        });
      }

      // Check if item is consumable
      const metadata = inventoryItem.metadata as any || {};
      const isConsumable = metadata.consumable === true || 
                          inventoryItem.productType === 'access_pass';

      if (!isConsumable) {
        return reply.code(400).send({
          error: {
            code: 'NOT_CONSUMABLE',
            message: 'This item cannot be consumed',
            statusCode: 400
          }
        });
      }

      if (inventoryItem.currentQuantity < quantity) {
        return reply.code(400).send({
          error: {
            code: 'INSUFFICIENT_QUANTITY',
            message: `You only have ${inventoryItem.currentQuantity} of this item`,
            statusCode: 400
          }
        });
      }

      // Consume the item
      if (inventoryItem.currentQuantity === quantity) {
        // Remove item completely if consuming all
        await db
          .delete(userInventory)
          .where(eq(userInventory.id, inventoryItem.internalId));
      } else {
        // Reduce quantity
        await db
          .update(userInventory)
          .set({
            quantity: inventoryItem.currentQuantity - quantity
          })
          .where(eq(userInventory.id, inventoryItem.internalId));
      }

      // TODO: Trigger any consumption effects (e.g., grant access, add points, etc.)
      // This would depend on the specific item type and metadata

      return {
        success: true,
        data: {
          message: `Successfully consumed ${quantity} ${inventoryItem.productName}`,
          consumed: {
            productName: inventoryItem.productName,
            quantity,
            remainingQuantity: Math.max(0, inventoryItem.currentQuantity - quantity)
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error consuming item');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to consume item',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Get inventory by product type
  fastify.get('/type/:productType', {
    preHandler: [authMiddleware, validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { productType } = request.params as { productType: string };
    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;
    const userId = request.user!.id;

    try {
      // Validate product type
      const validTypes = ['avatar', 'collectible', 'digital_asset', 'merchandise', 'access_pass', 'custom'];
      if (!validTypes.includes(productType)) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_TYPE',
            message: `Invalid product type. Must be one of: ${validTypes.join(', ')}`,
            statusCode: 400
          }
        });
      }

      const items = await db
        .select({
          id: userInventory.id,
          quantity: userInventory.quantity,
          acquiredAt: userInventory.acquiredAt,
          product: {
            id: products.publicId,
            name: products.name,
            description: products.description,
            digitalAssetUrl: products.digitalAssetUrl,
            metadata: products.metadata
          },
          creator: {
            id: creators.publicId,
            username: user.username
          }
        })
        .from(userInventory)
        .innerJoin(products, eq(userInventory.productId, products.id))
        .innerJoin(creators, eq(products.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .where(and(
          eq(userInventory.userId, userId),
          eq(products.productType, productType as any)
        ))
        .orderBy(desc(userInventory.acquiredAt))
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        data: {
          productType,
          items,
          pagination: {
            page,
            limit,
            hasMore: items.length === limit
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching inventory by type');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch inventory by type',
          statusCode: 500
        }
      });
    }
  });
}