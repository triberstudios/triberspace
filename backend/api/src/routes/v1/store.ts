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
import { eq, desc, and, sql, gte, lte } from 'drizzle-orm';
import { authMiddleware, optionalAuthMiddleware, creatorOnlyMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery, validateBody } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';

const creatorParamsSchema = z.object({
  creatorId: publicIdSchema
});

const productParamsSchema = z.object({
  productId: publicIdSchema
});

const storeParamsSchema = z.object({
  storeId: publicIdSchema
});

// Enhanced query schemas for global product discovery
const globalProductsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  productType: z.enum(['avatar', 'collectible', 'digital_asset', 'merchandise', 'access_pass', 'custom']).optional(),
  creatorId: publicIdSchema.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.coerce.boolean().optional(),
  sortBy: z.enum(['newest', 'oldest', 'price_low', 'price_high', 'popular']).default('newest')
});

const storeQuerySchema = paginationSchema.extend({
  productType: z.string().optional(),
  priceRange: z.enum(['low', 'medium', 'high']).optional()
});

// Product management schemas
const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(2000).optional(),
  productType: z.enum(['avatar', 'collectible', 'digital_asset', 'merchandise', 'access_pass', 'custom'], {
    errorMap: () => ({ message: 'Product type must be one of: avatar, collectible, digital_asset, merchandise, access_pass, custom' })
  }),
  pricePoints: z.number().min(0, 'Price must be at least 0 points'),
  digitalAssetUrl: z.string().url().optional(),
  maxQuantity: z.number().min(1).optional(),
  currentStock: z.number().min(0).optional(),
  releaseDate: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
  displayOrder: z.number().min(0).optional()
});

const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200).optional(),
  description: z.string().max(2000).optional(),
  pricePoints: z.number().min(0, 'Price must be at least 0 points').optional(),
  digitalAssetUrl: z.string().url().optional(),
  maxQuantity: z.number().min(1).optional(),
  currentStock: z.number().min(0).optional(),
  releaseDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
  displayOrder: z.number().min(0).optional()
});

// Store management schemas
const updateStoreSchema = z.object({
  storeName: z.string().min(1, 'Store name is required').max(100).optional(),
  description: z.string().max(1000).optional(),
  bannerUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.any()).optional()
});

const purchaseSchema = z.object({
  productId: publicIdSchema,
  quantity: z.number().int().min(1).max(10).default(1)
});

export async function v1StoreRoutes(fastify: FastifyInstance) {
  
  // ===================================================================
  // GLOBAL PRODUCT & STORE DISCOVERY (Phase 6 Enhancement)
  // ===================================================================

  // Public: Browse all products across all stores with advanced filtering
  fastify.get('/products', {
    preHandler: [optionalAuthMiddleware, validateQuery(globalProductsQuerySchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit, search, productType, creatorId, minPrice, maxPrice, inStock, sortBy } = 
      request.query as z.infer<typeof globalProductsQuerySchema>;
    const offset = (page - 1) * limit;

    try {
      // Build where conditions
      const conditions = [
        eq(products.isActive, true), // Only show active products
        eq(creatorStores.isActive, true) // Only from active stores
      ];
      
      if (search) {
        conditions.push(sql`${products.name} ILIKE ${'%' + search + '%'}`);
      }
      
      if (productType) {
        conditions.push(eq(products.productType, productType));
      }
      
      if (creatorId) {
        conditions.push(eq(creators.publicId, creatorId));
      }
      
      if (minPrice !== undefined) {
        conditions.push(gte(products.pricePoints, minPrice));
      }
      
      if (maxPrice !== undefined) {
        conditions.push(lte(products.pricePoints, maxPrice));
      }
      
      if (inStock === true) {
        conditions.push(sql`(${products.maxQuantity} IS NULL OR ${products.currentStock} > 0)`);
      }

      // Build sort order
      let orderBy;
      switch (sortBy) {
        case 'oldest':
          orderBy = products.createdAt;
          break;
        case 'price_low':
          orderBy = products.pricePoints;
          break;
        case 'price_high':
          orderBy = desc(products.pricePoints);
          break;
        case 'popular':
          // TODO: Add popularity based on sales when needed
          orderBy = desc(products.displayOrder);
          break;
        case 'newest':
        default:
          orderBy = desc(products.createdAt);
      }

      // Get products with creator and store info
      const productsList = await db
        .select({
          id: products.publicId,
          name: products.name,
          description: products.description,
          productType: products.productType,
          digitalAssetUrl: products.digitalAssetUrl,
          pricePoints: products.pricePoints,
          maxQuantity: products.maxQuantity,
          currentStock: products.currentStock,
          releaseDate: products.releaseDate,
          displayOrder: products.displayOrder,
          createdAt: products.createdAt,
          creator: {
            id: creators.publicId,
            userName: user.userName
          },
          store: {
            id: creatorStores.publicId,
            name: creatorStores.storeName
          }
        })
        .from(products)
        .innerJoin(creators, eq(products.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .innerJoin(creatorStores, eq(products.creatorId, creatorStores.creatorId))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      // Check ownership for authenticated users
      const productsWithOwnership = request.user ? await Promise.all(
        productsList.map(async (product) => {
          const [inventory] = await db
            .select({ quantity: userInventory.quantity })
            .from(userInventory)
            .innerJoin(products, eq(userInventory.productId, products.id))
            .where(and(
              eq(products.publicId, product.id),
              eq(userInventory.userId, request.user!.id)
            ))
            .limit(1);

          return {
            ...product,
            owned: !!inventory,
            ownedQuantity: inventory?.quantity || 0
          };
        })
      ) : productsList.map(product => ({
        ...product,
        owned: false,
        ownedQuantity: 0
      }));

      return {
        success: true,
        data: {
          products: productsWithOwnership,
          pagination: {
            page,
            limit,
            hasMore: productsList.length === limit
          },
          filters: {
            search: search || null,
            productType: productType || null,
            creatorId: creatorId || null,
            minPrice: minPrice || null,
            maxPrice: maxPrice || null,
            inStock: inStock || null,
            sortBy
          }
        }
      };

    } catch (error) {
      fastify.log.error('Error fetching global products:', error);
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch products',
          statusCode: 500
        }
      });
    }
  });

  // Public: Get specific product details (enhanced)
  fastify.get('/products/:productId', {
    preHandler: [optionalAuthMiddleware, validateParams(productParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { productId } = request.params as z.infer<typeof productParamsSchema>;

    try {
      const [product] = await db
        .select({
          id: products.publicId,
          name: products.name,
          description: products.description,
          productType: products.productType,
          digitalAssetUrl: products.digitalAssetUrl,
          pricePoints: products.pricePoints,
          maxQuantity: products.maxQuantity,
          currentStock: products.currentStock,
          releaseDate: products.releaseDate,
          metadata: products.metadata,
          displayOrder: products.displayOrder,
          createdAt: products.createdAt,
          creator: {
            id: creators.publicId,
            userName: user.userName
          },
          store: {
            id: creatorStores.publicId,
            name: creatorStores.storeName,
            description: creatorStores.description
          }
        })
        .from(products)
        .innerJoin(creators, eq(products.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .innerJoin(creatorStores, eq(products.creatorId, creatorStores.creatorId))
        .where(and(
          eq(products.publicId, productId),
          eq(products.isActive, true)
        ))
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

      // Check ownership for authenticated users
      let ownership = null;
      if (request.user) {
        const [inventory] = await db
          .select({ 
            quantity: userInventory.quantity,
            acquiredAt: userInventory.acquiredAt
          })
          .from(userInventory)
          .innerJoin(products, eq(userInventory.productId, products.id))
          .where(and(
            eq(products.publicId, productId),
            eq(userInventory.userId, request.user.id)
          ))
          .limit(1);
        
        ownership = inventory ? {
          owned: true,
          quantity: inventory.quantity,
          acquiredAt: inventory.acquiredAt
        } : {
          owned: false,
          quantity: 0,
          acquiredAt: null
        };
      }

      return {
        success: true,
        data: {
          product: {
            ...product,
            ownership
          }
        }
      };

    } catch (error) {
      fastify.log.error('Error fetching product:', error);
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch product details',
          statusCode: 500
        }
      });
    }
  });

  // Public: List all creator stores with enhanced info
  fastify.get('/stores', {
    preHandler: [optionalAuthMiddleware, validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;

    try {
      const storesList = await db
        .select({
          id: creatorStores.publicId,
          name: creatorStores.storeName,
          description: creatorStores.description,
          bannerUrl: creatorStores.bannerUrl,
          logoUrl: creatorStores.logoUrl,
          createdAt: creatorStores.createdAt,
          creator: {
            id: creators.publicId,
            userName: user.userName
          }
        })
        .from(creatorStores)
        .innerJoin(creators, eq(creatorStores.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .where(eq(creatorStores.isActive, true))
        .orderBy(desc(creatorStores.createdAt))
        .limit(limit)
        .offset(offset);

      // Add product count for each store
      const storesWithProductCount = await Promise.all(
        storesList.map(async (store) => {
          const [productCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .innerJoin(creators, eq(products.creatorId, creators.id))
            .where(and(
              eq(creators.publicId, store.creator.id),
              eq(products.isActive, true)
            ));

          return {
            ...store,
            productCount: productCount.count || 0
          };
        })
      );

      return {
        success: true,
        data: {
          stores: storesWithProductCount,
          pagination: {
            page,
            limit,
            hasMore: storesList.length === limit
          }
        }
      };

    } catch (error) {
      fastify.log.error('Error fetching stores:', error);
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch stores',
          statusCode: 500
        }
      });
    }
  });

  // ===================================================================
  // CREATOR STORE MANAGEMENT (Phase 6 Enhancement)  
  // ===================================================================

  // Protected: Update creator store settings
  fastify.put('/my-store', {
    preHandler: [creatorOnlyMiddleware, validateBody(updateStoreSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const updates = request.body as z.infer<typeof updateStoreSchema>;
    const creatorId = request.creator!.id;

    try {
      // Get current store info
      const [storeInfo] = await db
        .select({ internalId: creatorStores.id })
        .from(creatorStores)
        .where(eq(creatorStores.creatorId, creatorId))
        .limit(1);

      if (!storeInfo) {
        return reply.code(404).send({
          error: {
            code: 'STORE_NOT_FOUND',
            message: 'Creator store not found',
            statusCode: 404
          }
        });
      }

      // Update the store
      const [updatedStore] = await db
        .update(creatorStores)
        .set(updates)
        .where(eq(creatorStores.id, storeInfo.internalId))
        .returning({
          id: creatorStores.publicId,
          name: creatorStores.storeName,
          description: creatorStores.description,
          bannerUrl: creatorStores.bannerUrl,
          logoUrl: creatorStores.logoUrl,
          isActive: creatorStores.isActive,
          settings: creatorStores.settings,
          createdAt: creatorStores.createdAt
        });

      return {
        success: true,
        data: {
          message: 'Store updated successfully',
          store: updatedStore
        }
      };

    } catch (error) {
      fastify.log.error('Update store error:', error);
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update store',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Create new product
  fastify.post('/products', {
    preHandler: [creatorOnlyMiddleware, validateBody(createProductSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const productData = request.body as z.infer<typeof createProductSchema>;
    const creatorId = request.creator!.id;

    try {
      // Create the product
      const [newProduct] = await db
        .insert(products)
        .values({
          creatorId,
          ...productData,
          releaseDate: productData.releaseDate ? new Date(productData.releaseDate) : null,
          currentStock: productData.currentStock || productData.maxQuantity
        })
        .returning({
          id: products.publicId,
          name: products.name,
          description: products.description,
          productType: products.productType,
          digitalAssetUrl: products.digitalAssetUrl,
          pricePoints: products.pricePoints,
          maxQuantity: products.maxQuantity,
          currentStock: products.currentStock,
          releaseDate: products.releaseDate,
          isActive: products.isActive,
          createdAt: products.createdAt
        });

      return reply.code(201).send({
        success: true,
        data: {
          message: 'Product created successfully',
          product: newProduct
        }
      });

    } catch (error) {
      fastify.log.error('Create product error:', error);
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create product',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Update product
  fastify.put('/products/:productId', {
    preHandler: [creatorOnlyMiddleware, validateParams(productParamsSchema), validateBody(updateProductSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { productId } = request.params as z.infer<typeof productParamsSchema>;
    const updates = request.body as z.infer<typeof updateProductSchema>;
    const creatorId = request.creator!.id;

    try {
      // Verify product ownership
      const [productInfo] = await db
        .select({ internalId: products.id })
        .from(products)
        .where(and(
          eq(products.creatorId, creatorId),
          eq(products.publicId, productId)
        ))
        .limit(1);

      if (!productInfo) {
        return reply.code(404).send({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found or not owned by creator',
            statusCode: 404
          }
        });
      }

      // Prepare updates with date conversion
      const dbUpdates: any = { ...updates };
      if (updates.releaseDate) {
        dbUpdates.releaseDate = new Date(updates.releaseDate);
      }

      // Update the product
      const [updatedProduct] = await db
        .update(products)
        .set(dbUpdates)
        .where(eq(products.id, productInfo.internalId))
        .returning({
          id: products.publicId,
          name: products.name,
          description: products.description,
          productType: products.productType,
          digitalAssetUrl: products.digitalAssetUrl,
          pricePoints: products.pricePoints,
          maxQuantity: products.maxQuantity,
          currentStock: products.currentStock,
          releaseDate: products.releaseDate,
          isActive: products.isActive,
          createdAt: products.createdAt
        });

      return {
        success: true,
        data: {
          message: 'Product updated successfully',
          product: updatedProduct
        }
      };

    } catch (error) {
      fastify.log.error('Update product error:', error);
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update product',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Delete product (soft delete)
  fastify.delete('/products/:productId', {
    preHandler: [creatorOnlyMiddleware, validateParams(productParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { productId } = request.params as z.infer<typeof productParamsSchema>;
    const creatorId = request.creator!.id;

    try {
      // Verify product ownership
      const [productInfo] = await db
        .select({ internalId: products.id })
        .from(products)
        .where(and(
          eq(products.creatorId, creatorId),
          eq(products.publicId, productId)
        ))
        .limit(1);

      if (!productInfo) {
        return reply.code(404).send({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found or not owned by creator',
            statusCode: 404
          }
        });
      }

      // Soft delete the product by setting isActive to false
      await db
        .update(products)
        .set({ isActive: false })
        .where(eq(products.id, productInfo.internalId));

      return {
        success: true,
        data: {
          message: 'Product deleted successfully'
        }
      };

    } catch (error) {
      fastify.log.error('Delete product error:', error);
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete product',
          statusCode: 500
        }
      });
    }
  });

  // ===================================================================
  // EXISTING CREATOR-SPECIFIC STORE ROUTES (Legacy Support)
  // ===================================================================

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