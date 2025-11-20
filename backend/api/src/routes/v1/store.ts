import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  db,
  products,
  orders,
  orderItems,
  userInventory,
  pointTransactions,
  pointTransactionsNew,
  userPointBalances,
  creatorEarnings,
  revenueSplits,
  creators,
  user,
  avatarItems,
  worlds,
  userWorldPoints
} from '@triberspace/database';
import { eq, desc, and, sql, gte, lte } from 'drizzle-orm';
import { authMiddleware, optionalAuthMiddleware, creatorOnlyMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery, validateBody } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';
import { calculateRevenueSplit } from '../../config/revenue';

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
  thumbnail_url: z.string().url().optional(),
  gallery_urls: z.array(z.string().url()).optional(),
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
  thumbnail_url: z.string().url().optional(),
  gallery_urls: z.array(z.string().url()).optional(),
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
        eq(products.isActive, true) // Only show active products
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
          thumbnail_url: products.thumbnail_url,
          gallery_urls: products.gallery_urls,
          pricePoints: products.pricePoints,
          maxQuantity: products.maxQuantity,
          currentStock: products.currentStock,
          releaseDate: products.releaseDate,
          displayOrder: products.displayOrder,
          createdAt: products.createdAt,
          creator: {
            id: creators.publicId,
            username: user.username
          },
          world: {
            id: worlds.publicId,
            name: worlds.name
          }
        })
        .from(products)
        .innerJoin(creators, eq(products.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .innerJoin(worlds, eq(products.worldId, worlds.id))
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
      fastify.log.error(error as Error, 'Error fetching global products');
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
          thumbnail_url: products.thumbnail_url,
          gallery_urls: products.gallery_urls,
          pricePoints: products.pricePoints,
          maxQuantity: products.maxQuantity,
          currentStock: products.currentStock,
          releaseDate: products.releaseDate,
          metadata: products.metadata,
          displayOrder: products.displayOrder,
          createdAt: products.createdAt,
          creator: {
            id: creators.publicId,
            username: user.username
          },
          world: {
            id: worlds.publicId,
            name: worlds.name,
            description: worlds.description
          }
        })
        .from(products)
        .innerJoin(creators, eq(products.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .innerJoin(worlds, eq(products.worldId, worlds.id))
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
      fastify.log.error(error as Error, 'Error fetching product');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch product details',
          statusCode: 500
        }
      });
    }
  });

  // Public: List all creator worlds with stores (enhanced info)
  fastify.get('/stores', {
    preHandler: [optionalAuthMiddleware, validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;

    try {
      const worldsList = await db
        .select({
          id: worlds.publicId,
          name: worlds.name,
          description: worlds.description,
          thumbnailUrl: worlds.thumbnail_url,
          createdAt: worlds.createdAt,
          creator: {
            id: creators.publicId,
            username: user.username
          }
        })
        .from(worlds)
        .innerJoin(creators, eq(worlds.founderId, creators.userId))
        .innerJoin(user, eq(creators.userId, user.id))
        .orderBy(desc(worlds.createdAt))
        .limit(limit)
        .offset(offset);

      // Add product count for each world
      const worldsWithProductCount = await Promise.all(
        worldsList.map(async (world) => {
          const [productCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .innerJoin(worlds, eq(products.worldId, worlds.id))
            .where(and(
              eq(worlds.publicId, world.id),
              eq(products.isActive, true)
            ));

          return {
            ...world,
            productCount: productCount.count || 0
          };
        })
      );

      return {
        success: true,
        data: {
          stores: worldsWithProductCount,
          pagination: {
            page,
            limit,
            hasMore: worldsList.length === limit
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching stores');
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
      // Get current world info
      const [worldInfo] = await db
        .select({ internalId: worlds.id })
        .from(worlds)
        .innerJoin(creators, eq(worlds.founderId, creators.userId))
        .where(eq(creators.id, creatorId))
        .limit(1);

      if (!worldInfo) {
        return reply.code(404).send({
          error: {
            code: 'WORLD_NOT_FOUND',
            message: 'Creator world not found',
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
          thumbnailUrl: worlds.thumbnail_url,
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
      fastify.log.error(error as Error, 'Update store error');
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
      // Get creator's world
      const [creatorWorld] = await db
        .select({ worldId: worlds.id })
        .from(creators)
        .innerJoin(worlds, eq(creators.userId, worlds.founderId))
        .where(eq(creators.id, creatorId))
        .limit(1);

      if (!creatorWorld) {
        return reply.code(404).send({
          error: {
            code: 'WORLD_NOT_FOUND',
            message: 'Creator world not found',
            statusCode: 404
          }
        });
      }

      // Create the product
      const [newProduct] = await db
        .insert(products)
        .values({
          creatorId,
          worldId: creatorWorld.worldId,
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
          thumbnail_url: products.thumbnail_url,
          gallery_urls: products.gallery_urls,
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
      fastify.log.error(error as Error, 'Create product error');
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
          thumbnail_url: products.thumbnail_url,
          gallery_urls: products.gallery_urls,
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
      fastify.log.error(error as Error, 'Update product error');
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
      fastify.log.error(error as Error, 'Delete product error');
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
        return reply.code(404).send({
          error: {
            code: 'CREATOR_NOT_FOUND',
            message: 'Creator not found',
            statusCode: 404
          }
        });
      }

      // Get world info
      const [world] = await db
        .select({
          id: worlds.publicId,
          name: worlds.name,
          description: worlds.description,
          thumbnailUrl: worlds.thumbnail_url,
          createdAt: worlds.createdAt
        })
        .from(worlds)
        .innerJoin(creators, eq(worlds.founderId, creators.userId))
        .where(eq(creators.id, creator.id))
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
          world: world || null,
          stats: productStats[0] || { totalProducts: 0, activeProducts: 0 }
        }
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching creator store');
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
          thumbnail_url: products.thumbnail_url,
          gallery_urls: products.gallery_urls,
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
      fastify.log.error(error as Error, 'Error fetching store products');
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
          worldId: products.worldId,
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

      // Check user's universal points balance
      const [balance] = await db
        .select()
        .from(userPointBalances)
        .where(eq(userPointBalances.userId, request.user!.id))
        .limit(1);

      if (!balance) {
        return reply.code(400).send({
          error: {
            code: 'NO_BALANCE',
            message: 'No points balance found. Please purchase points first.',
            statusCode: 400
          }
        });
      }

      const currentBalance = balance.purchasedBalance + balance.earnedBalance;
      if (currentBalance < totalPoints) {
        return reply.code(400).send({
          error: {
            code: 'INSUFFICIENT_POINTS',
            message: `Insufficient points. Need ${totalPoints.toLocaleString()}, have ${currentBalance.toLocaleString()}`,
            statusCode: 400,
            details: {
              required: totalPoints,
              available: currentBalance,
              purchased: balance.purchasedBalance,
              earned: balance.earnedBalance
            }
          }
        });
      }

      // Create order
      const [order] = await db
        .insert(orders)
        .values({
          userId: request.user!.id,
          creatorId: product.creatorId,
          worldId: product.worldId,
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

      // Calculate revenue split
      const revenueSplit = calculateRevenueSplit(totalPoints);

      // Deduct points from user balance (purchased first, then earned)
      let purchasedDeducted = 0;
      let earnedDeducted = 0;
      let remainingToDeduct = totalPoints;

      // First use purchased points
      if (balance.purchasedBalance > 0) {
        purchasedDeducted = Math.min(balance.purchasedBalance, remainingToDeduct);
        remainingToDeduct -= purchasedDeducted;
      }

      // Then use earned points if needed
      if (remainingToDeduct > 0 && balance.earnedBalance > 0) {
        earnedDeducted = Math.min(balance.earnedBalance, remainingToDeduct);
      }

      const newPurchasedBalance = balance.purchasedBalance - purchasedDeducted;
      const newEarnedBalance = balance.earnedBalance - earnedDeducted;
      const newTotalBalance = newPurchasedBalance + newEarnedBalance;

      // Create universal points transaction
      const transactionId = crypto.randomUUID();
      const [transaction] = await db
        .insert(pointTransactionsNew)
        .values({
          transactionId,
          userId: request.user!.id,
          creatorId: product.creatorId,
          spaceId: null, // Product purchase, not space-specific
          amount: -totalPoints,
          balanceAfter: newTotalBalance,
          type: 'debit',
          pointType: purchasedDeducted > 0 ? 'purchased' : 'earned',
          source: 'store',
          referenceType: 'product',
          referenceId: product.id,
          description: `Purchase: ${product.name} x${quantity}`
        })
        .returning({
          transactionId: pointTransactionsNew.transactionId,
          amount: pointTransactionsNew.amount,
          balanceAfter: pointTransactionsNew.balanceAfter
        });

      // Update user points balance
      await db
        .update(userPointBalances)
        .set({
          purchasedBalance: newPurchasedBalance,
          earnedBalance: newEarnedBalance,
          earnedSpentThisMonth: balance.earnedSpentThisMonth + earnedDeducted,
          totalSpent: balance.totalSpent + totalPoints,
          updatedAt: new Date()
        })
        .where(eq(userPointBalances.userId, request.user!.id));

      // Record revenue split
      await db
        .insert(revenueSplits)
        .values({
          transactionId,
          pointsSpent: totalPoints,
          usdValue: revenueSplit.usdCents,
          platformShare: revenueSplit.platformShare,
          creatorShare: revenueSplit.creatorShare,
          managerShare: revenueSplit.managerShare,
          creatorId: product.creatorId,
          managerId: request.user!.id, // Buyer is considered manager in this context
          splitType: 'product_purchase'
        });

      // Update or create creator earnings
      const [existingEarnings] = await db
        .select()
        .from(creatorEarnings)
        .where(eq(creatorEarnings.creatorId, product.creatorId))
        .limit(1);

      if (existingEarnings) {
        await db
          .update(creatorEarnings)
          .set({
            pendingEarnings: existingEarnings.pendingEarnings + revenueSplit.creatorShare,
            lifetimeEarnings: existingEarnings.lifetimeEarnings + revenueSplit.creatorShare,
            earningsFromProducts: existingEarnings.earningsFromProducts + revenueSplit.creatorShare,
            updatedAt: new Date()
          })
          .where(eq(creatorEarnings.creatorId, product.creatorId));
      } else {
        await db
          .insert(creatorEarnings)
          .values({
            creatorId: product.creatorId,
            pendingEarnings: revenueSplit.creatorShare,
            lifetimeEarnings: revenueSplit.creatorShare,
            totalCashedOut: 0,
            earningsFromSubscriptions: 0,
            earningsFromProducts: revenueSplit.creatorShare,
            earningsFromPointPacks: 0,
            minimumCashout: 5000
          });
      }

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
          paymentTransactionId: null, // UUID transactions don't use integer IDs
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
          transaction: {
            id: transaction.transactionId,
            amount: transaction.amount,
            balanceAfter: transaction.balanceAfter
          },
          pointsUsed: {
            purchased: purchasedDeducted,
            earned: earnedDeducted,
            total: totalPoints
          },
          newBalance: {
            purchased: newPurchasedBalance,
            earned: newEarnedBalance,
            total: newTotalBalance
          },
          revenueSplit: {
            platform: revenueSplit.platformShare,
            creator: revenueSplit.creatorShare,
            manager: revenueSplit.managerShare,
            totalCents: revenueSplit.usdCents
          },
          message: 'Purchase completed successfully'
        }
      });
    } catch (error) {
      fastify.log.error(error as Error, 'Error processing purchase');
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
            name: sql<string>`${user.firstName} || ' ' || ${user.lastName}`
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
      fastify.log.error(error as Error, 'Error fetching user orders');
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
          thumbnail_url: products.thumbnail_url,
          gallery_urls: products.gallery_urls,
            metadata: products.metadata
          },
          creator: {
            id: creators.publicId
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
      fastify.log.error(error as Error, 'Error fetching user inventory');
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