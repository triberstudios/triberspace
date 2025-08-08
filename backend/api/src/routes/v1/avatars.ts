import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { 
  db, 
  avatarBaseModels, 
  avatarItems, 
  userAvatars, 
  avatarEquippedItems,
  userAvatarInventory,
  avatarSlots,
  userInventory,
  products
} from '@triberspace/database';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authMiddleware, optionalAuthMiddleware, creatorOnlyMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery, validateBody } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';

// Avatar management schemas
const avatarParamsSchema = z.object({
  avatarId: publicIdSchema
});

const avatarQuerySchema = paginationSchema.extend({
  baseModelId: publicIdSchema.optional(),
  search: z.string().optional()
});

const createAvatarSchema = z.object({
  name: z.string().min(1, 'Avatar name is required').max(50),
  baseModelId: publicIdSchema
});

const updateAvatarSchema = z.object({
  name: z.string().min(1, 'Avatar name is required').max(50).optional(),
  isActive: z.boolean().optional()
});

// Equipment schemas  
const equipItemSchema = z.object({
  slotName: z.string().min(1, 'Slot name is required'),
  itemId: publicIdSchema,
  colorVariant: z.record(z.any()).optional()
});

const unequipItemSchema = z.object({
  slotName: z.string().min(1, 'Slot name is required')
});

// Avatar items schemas
const itemsQuerySchema = paginationSchema.extend({
  slotName: z.string().optional(),
  baseModelId: publicIdSchema.optional(),
  compatible: z.coerce.boolean().optional()
});

const createAvatarItemSchema = z.object({
  baseModelId: publicIdSchema,
  slotName: z.string().min(1, 'Slot name is required'),
  meshUrl: z.string().url().optional(),
  textureUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url('Thumbnail URL is required'),
  metadata: z.record(z.any()).optional(),
  incompatibleWith: z.array(publicIdSchema).optional()
});

export async function v1AvatarsRoutes(fastify: FastifyInstance) {
  
  // ===================================================================
  // PUBLIC AVATAR BASE MODELS & ITEMS
  // ===================================================================

  // Public: Get available avatar base models
  fastify.get('/base-models', {
    preHandler: [optionalAuthMiddleware, validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;

    try {
      const baseModels = await db
        .select({
          id: avatarBaseModels.publicId,
          name: avatarBaseModels.name,
          meshUrl: avatarBaseModels.meshUrl,
          skeletonUrl: avatarBaseModels.skeletonUrl,
          thumbnailUrl: avatarBaseModels.thumbnailUrl,
          rigType: avatarBaseModels.rigType,
          createdAt: avatarBaseModels.createdAt
        })
        .from(avatarBaseModels)
        .orderBy(desc(avatarBaseModels.createdAt))
        .limit(limit)
        .offset(offset);

      // Get slot information for each base model
      const baseModelsWithSlots = await Promise.all(
        baseModels.map(async (baseModel) => {
          const slots = await db
            .select({
              slotName: avatarSlots.slotName,
              slotType: avatarSlots.slotType,
              maxItems: avatarSlots.maxItems,
              displayOrder: avatarSlots.displayOrder
            })
            .from(avatarSlots)
            .innerJoin(avatarBaseModels, eq(avatarSlots.baseModelId, avatarBaseModels.id))
            .where(eq(avatarBaseModels.publicId, baseModel.id))
            .orderBy(avatarSlots.displayOrder);

          return {
            ...baseModel,
            slots
          };
        })
      );

      return {
        success: true,
        data: {
          baseModels: baseModelsWithSlots,
          pagination: {
            page,
            limit,
            hasMore: baseModels.length === limit
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching avatar base models');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch avatar base models',
          statusCode: 500
        }
      });
    }
  });

  // Public: Browse avatar items with filtering
  fastify.get('/items', {
    preHandler: [optionalAuthMiddleware, validateQuery(itemsQuerySchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit, slotName, baseModelId, compatible } = request.query as z.infer<typeof itemsQuerySchema>;
    const offset = (page - 1) * limit;

    try {
      // Build where conditions - always include at least one condition
      const conditions = [sql`1=1`]; // Always true condition as base
      
      if (slotName) {
        conditions.push(eq(avatarItems.slotName, slotName));
      }
      
      if (baseModelId) {
        conditions.push(eq(avatarBaseModels.publicId, baseModelId));
      }

      const items = await db
        .select({
          id: avatarItems.publicId,
          baseModelId: avatarBaseModels.publicId,
          slotName: avatarItems.slotName,
          meshUrl: avatarItems.meshUrl,
          textureUrl: avatarItems.textureUrl,
          thumbnailUrl: avatarItems.thumbnailUrl,
          metadata: avatarItems.metadata,
          createdAt: avatarItems.createdAt,
          baseModel: {
            name: avatarBaseModels.name,
            rigType: avatarBaseModels.rigType
          }
        })
        .from(avatarItems)
        .innerJoin(avatarBaseModels, eq(avatarItems.baseModelId, avatarBaseModels.id))
        .where(and(...conditions))
        .orderBy(desc(avatarItems.createdAt))
        .limit(limit)
        .offset(offset);

      // Add ownership info for authenticated users
      const itemsWithOwnership = request.user ? await Promise.all(
        items.map(async (item) => {
          // Check if user owns this item via avatar inventory OR general inventory
          const [avatarInventory] = await db
            .select({ id: userAvatarInventory.id })
            .from(userAvatarInventory)
            .innerJoin(avatarItems, eq(userAvatarInventory.itemId, avatarItems.id))
            .where(and(
              eq(avatarItems.publicId, item.id),
              eq(userAvatarInventory.userId, request.user!.id)
            ))
            .limit(1);

          return {
            ...item,
            owned: !!avatarInventory
          };
        })
      ) : items.map(item => ({
        ...item,
        owned: false
      }));

      return {
        success: true,
        data: {
          items: itemsWithOwnership,
          pagination: {
            page,
            limit,
            hasMore: items.length === limit
          },
          filters: {
            slotName: slotName || null,
            baseModelId: baseModelId || null,
            compatible: compatible ?? null
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching avatar items');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch avatar items',
          statusCode: 500
        }
      });
    }
  });

  // ===================================================================
  // USER AVATAR MANAGEMENT
  // ===================================================================

  // Protected: Get user's avatars
  fastify.get('/my-avatars', {
    preHandler: [authMiddleware, validateQuery(avatarQuerySchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit, baseModelId, search } = request.query as z.infer<typeof avatarQuerySchema>;
    const offset = (page - 1) * limit;

    try {
      // Build where conditions
      const conditions = [eq(userAvatars.userId, request.user!.id)];
      
      if (baseModelId) {
        conditions.push(eq(avatarBaseModels.publicId, baseModelId));
      }
      
      if (search) {
        conditions.push(sql`${userAvatars.name} ILIKE ${'%' + search + '%'}`);
      }

      const avatars = await db
        .select({
          id: userAvatars.publicId,
          name: userAvatars.name,
          isActive: userAvatars.isActive,
          createdAt: userAvatars.createdAt,
          updatedAt: userAvatars.updatedAt,
          baseModel: {
            id: avatarBaseModels.publicId,
            name: avatarBaseModels.name,
            thumbnailUrl: avatarBaseModels.thumbnailUrl,
            rigType: avatarBaseModels.rigType
          }
        })
        .from(userAvatars)
        .innerJoin(avatarBaseModels, eq(userAvatars.baseModelId, avatarBaseModels.id))
        .where(and(...conditions))
        .orderBy(desc(userAvatars.isActive), desc(userAvatars.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        data: {
          avatars,
          pagination: {
            page,
            limit,
            hasMore: avatars.length === limit
          },
          filters: {
            baseModelId: baseModelId || null,
            search: search || null
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching user avatars');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch avatars',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Get user's current active avatar
  fastify.get('/my-avatar', {
    preHandler: [authMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      // Get user's active avatar
      const [userAvatar] = await db
        .select({
          id: userAvatars.publicId,
          name: userAvatars.name,
          isActive: userAvatars.isActive,
          createdAt: userAvatars.createdAt,
          updatedAt: userAvatars.updatedAt,
          baseModel: {
            id: avatarBaseModels.publicId,
            name: avatarBaseModels.name,
            meshUrl: avatarBaseModels.meshUrl,
            skeletonUrl: avatarBaseModels.skeletonUrl,
            thumbnailUrl: avatarBaseModels.thumbnailUrl,
            rigType: avatarBaseModels.rigType
          }
        })
        .from(userAvatars)
        .innerJoin(avatarBaseModels, eq(userAvatars.baseModelId, avatarBaseModels.id))
        .where(and(
          eq(userAvatars.userId, request.user!.id),
          eq(userAvatars.isActive, true)
        ))
        .limit(1);

      if (!userAvatar) {
        return {
          success: true,
          data: {
            avatar: null,
            message: 'No active avatar found'
          }
        };
      }

      // Get equipped items
      const equippedItems = await db
        .select({
          slotName: avatarEquippedItems.slotName,
          colorVariant: avatarEquippedItems.colorVariant,
          equippedAt: avatarEquippedItems.equippedAt,
          item: {
            id: avatarItems.publicId,
            meshUrl: avatarItems.meshUrl,
            textureUrl: avatarItems.textureUrl,
            thumbnailUrl: avatarItems.thumbnailUrl,
            metadata: avatarItems.metadata
          }
        })
        .from(avatarEquippedItems)
        .innerJoin(avatarItems, eq(avatarEquippedItems.itemId, avatarItems.id))
        .innerJoin(userAvatars, eq(avatarEquippedItems.userAvatarId, userAvatars.id))
        .where(eq(userAvatars.publicId, userAvatar.id));

      return {
        success: true,
        data: {
          avatar: {
            ...userAvatar,
            equippedItems
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching user avatar');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch active avatar',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Create new avatar
  fastify.post('/my-avatars', {
    preHandler: [authMiddleware, validateBody(createAvatarSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { name, baseModelId } = request.body as z.infer<typeof createAvatarSchema>;
    const userId = request.user!.id;

    try {
      // Verify base model exists
      const [baseModel] = await db
        .select({ internalId: avatarBaseModels.id })
        .from(avatarBaseModels)
        .where(eq(avatarBaseModels.publicId, baseModelId))
        .limit(1);

      if (!baseModel) {
        return reply.code(404).send({
          error: {
            code: 'BASE_MODEL_NOT_FOUND',
            message: 'Avatar base model not found',
            statusCode: 404
          }
        });
      }

      // If this is the user's first avatar, make it active
      const [existingAvatar] = await db
        .select({ id: userAvatars.id })
        .from(userAvatars)
        .where(eq(userAvatars.userId, userId))
        .limit(1);

      const isFirstAvatar = !existingAvatar;

      // Create the avatar
      const [newAvatar] = await db
        .insert(userAvatars)
        .values({
          userId,
          baseModelId: baseModel.internalId,
          name,
          isActive: isFirstAvatar
        })
        .returning({
          id: userAvatars.publicId,
          name: userAvatars.name,
          isActive: userAvatars.isActive,
          createdAt: userAvatars.createdAt
        });

      return reply.code(201).send({
        success: true,
        data: {
          message: 'Avatar created successfully',
          avatar: newAvatar
        }
      });

    } catch (error) {
      fastify.log.error(error as Error, 'Create avatar error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create avatar',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Update avatar
  fastify.put('/my-avatars/:avatarId', {
    preHandler: [authMiddleware, validateParams(avatarParamsSchema), validateBody(updateAvatarSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { avatarId } = request.params as z.infer<typeof avatarParamsSchema>;
    const updates = request.body as z.infer<typeof updateAvatarSchema>;
    const userId = request.user!.id;

    try {
      // Verify avatar ownership
      const [avatarInfo] = await db
        .select({ internalId: userAvatars.id })
        .from(userAvatars)
        .where(and(
          eq(userAvatars.userId, userId),
          eq(userAvatars.publicId, avatarId)
        ))
        .limit(1);

      if (!avatarInfo) {
        return reply.code(404).send({
          error: {
            code: 'AVATAR_NOT_FOUND',
            message: 'Avatar not found or not owned by user',
            statusCode: 404
          }
        });
      }

      // If setting avatar as active, deactivate other avatars
      if (updates.isActive === true) {
        await db
          .update(userAvatars)
          .set({ isActive: false })
          .where(and(
            eq(userAvatars.userId, userId),
            eq(userAvatars.isActive, true)
          ));
      }

      // Update the avatar
      const [updatedAvatar] = await db
        .update(userAvatars)
        .set(updates)
        .where(eq(userAvatars.id, avatarInfo.internalId))
        .returning({
          id: userAvatars.publicId,
          name: userAvatars.name,
          isActive: userAvatars.isActive,
          createdAt: userAvatars.createdAt,
          updatedAt: userAvatars.updatedAt
        });

      return {
        success: true,
        data: {
          message: 'Avatar updated successfully',
          avatar: updatedAvatar
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Update avatar error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update avatar',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Delete avatar
  fastify.delete('/my-avatars/:avatarId', {
    preHandler: [authMiddleware, validateParams(avatarParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { avatarId } = request.params as z.infer<typeof avatarParamsSchema>;
    const userId = request.user!.id;

    try {
      // Verify avatar ownership and get info
      const [avatarInfo] = await db
        .select({ 
          internalId: userAvatars.id,
          isActive: userAvatars.isActive
        })
        .from(userAvatars)
        .where(and(
          eq(userAvatars.userId, userId),
          eq(userAvatars.publicId, avatarId)
        ))
        .limit(1);

      if (!avatarInfo) {
        return reply.code(404).send({
          error: {
            code: 'AVATAR_NOT_FOUND',
            message: 'Avatar not found or not owned by user',
            statusCode: 404
          }
        });
      }

      // Delete the avatar (equipped items will be cascade deleted)
      await db
        .delete(userAvatars)
        .where(eq(userAvatars.id, avatarInfo.internalId));

      // If deleted avatar was active, activate another avatar if available
      if (avatarInfo.isActive) {
        const [nextAvatar] = await db
          .select({ id: userAvatars.id })
          .from(userAvatars)
          .where(eq(userAvatars.userId, userId))
          .limit(1);

        if (nextAvatar) {
          await db
            .update(userAvatars)
            .set({ isActive: true })
            .where(eq(userAvatars.id, nextAvatar.id));
        }
      }

      return {
        success: true,
        data: {
          message: 'Avatar deleted successfully'
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Delete avatar error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete avatar',
          statusCode: 500
        }
      });
    }
  });

  // ===================================================================
  // AVATAR EQUIPMENT SYSTEM
  // ===================================================================

  // Protected: Get avatar equipment
  fastify.get('/my-avatars/:avatarId/equipment', {
    preHandler: [authMiddleware, validateParams(avatarParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { avatarId } = request.params as z.infer<typeof avatarParamsSchema>;
    const userId = request.user!.id;

    try {
      // Verify avatar ownership
      const [avatarInfo] = await db
        .select({ internalId: userAvatars.id })
        .from(userAvatars)
        .where(and(
          eq(userAvatars.userId, userId),
          eq(userAvatars.publicId, avatarId)
        ))
        .limit(1);

      if (!avatarInfo) {
        return reply.code(404).send({
          error: {
            code: 'AVATAR_NOT_FOUND',
            message: 'Avatar not found or not owned by user',
            statusCode: 404
          }
        });
      }

      // Get equipped items
      const equippedItems = await db
        .select({
          slotName: avatarEquippedItems.slotName,
          colorVariant: avatarEquippedItems.colorVariant,
          equippedAt: avatarEquippedItems.equippedAt,
          item: {
            id: avatarItems.publicId,
            meshUrl: avatarItems.meshUrl,
            textureUrl: avatarItems.textureUrl,
            thumbnailUrl: avatarItems.thumbnailUrl,
            metadata: avatarItems.metadata
          }
        })
        .from(avatarEquippedItems)
        .innerJoin(avatarItems, eq(avatarEquippedItems.itemId, avatarItems.id))
        .where(eq(avatarEquippedItems.userAvatarId, avatarInfo.internalId));

      return {
        success: true,
        data: {
          equipment: equippedItems
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching avatar equipment');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch avatar equipment',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Equip item to avatar
  fastify.post('/my-avatars/:avatarId/equip', {
    preHandler: [authMiddleware, validateParams(avatarParamsSchema), validateBody(equipItemSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { avatarId } = request.params as z.infer<typeof avatarParamsSchema>;
    const { slotName, itemId, colorVariant } = request.body as z.infer<typeof equipItemSchema>;
    const userId = request.user!.id;

    try {
      // Verify avatar ownership
      const [avatarInfo] = await db
        .select({ internalId: userAvatars.id })
        .from(userAvatars)
        .where(and(
          eq(userAvatars.userId, userId),
          eq(userAvatars.publicId, avatarId)
        ))
        .limit(1);

      if (!avatarInfo) {
        return reply.code(404).send({
          error: {
            code: 'AVATAR_NOT_FOUND',
            message: 'Avatar not found or not owned by user',
            statusCode: 404
          }
        });
      }

      // Verify user owns the item
      const [itemInfo] = await db
        .select({ 
          internalId: avatarItems.id,
          slotName: avatarItems.slotName 
        })
        .from(avatarItems)
        .innerJoin(userAvatarInventory, eq(avatarItems.id, userAvatarInventory.itemId))
        .where(and(
          eq(avatarItems.publicId, itemId),
          eq(userAvatarInventory.userId, userId)
        ))
        .limit(1);

      if (!itemInfo) {
        return reply.code(404).send({
          error: {
            code: 'ITEM_NOT_OWNED',
            message: 'Avatar item not found in user inventory',
            statusCode: 404
          }
        });
      }

      // Verify slot compatibility
      if (itemInfo.slotName !== slotName) {
        return reply.code(400).send({
          error: {
            code: 'SLOT_MISMATCH',
            message: `Item is for slot '${itemInfo.slotName}', cannot equip to slot '${slotName}'`,
            statusCode: 400
          }
        });
      }

      // Equip the item (replace existing item in slot if any)
      await db
        .insert(avatarEquippedItems)
        .values({
          userAvatarId: avatarInfo.internalId,
          slotName,
          itemId: itemInfo.internalId,
          colorVariant
        })
        .onConflictDoUpdate({
          target: [avatarEquippedItems.userAvatarId, avatarEquippedItems.slotName],
          set: {
            itemId: itemInfo.internalId,
            colorVariant,
            equippedAt: new Date()
          }
        });

      return reply.code(201).send({
        success: true,
        data: {
          message: `Item equipped to ${slotName} slot successfully`
        }
      });

    } catch (error) {
      fastify.log.error(error as Error, 'Equip item error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to equip item',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Unequip item from avatar
  fastify.post('/my-avatars/:avatarId/unequip', {
    preHandler: [authMiddleware, validateParams(avatarParamsSchema), validateBody(unequipItemSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { avatarId } = request.params as z.infer<typeof avatarParamsSchema>;
    const { slotName } = request.body as z.infer<typeof unequipItemSchema>;
    const userId = request.user!.id;

    try {
      // Verify avatar ownership
      const [avatarInfo] = await db
        .select({ internalId: userAvatars.id })
        .from(userAvatars)
        .where(and(
          eq(userAvatars.userId, userId),
          eq(userAvatars.publicId, avatarId)
        ))
        .limit(1);

      if (!avatarInfo) {
        return reply.code(404).send({
          error: {
            code: 'AVATAR_NOT_FOUND',
            message: 'Avatar not found or not owned by user',
            statusCode: 404
          }
        });
      }

      // Remove equipped item from slot
      await db
        .delete(avatarEquippedItems)
        .where(and(
          eq(avatarEquippedItems.userAvatarId, avatarInfo.internalId),
          eq(avatarEquippedItems.slotName, slotName)
        ));

      return {
        success: true,
        data: {
          message: `Item unequipped from ${slotName} slot successfully`
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Unequip item error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to unequip item',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Get user's avatar inventory
  fastify.get('/inventory', {
    preHandler: [authMiddleware, validateQuery(paginationSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit } = request.query as z.infer<typeof paginationSchema>;
    const offset = (page - 1) * limit;

    try {
      const inventory = await db
        .select({
          acquiredAt: userAvatarInventory.acquiredAt,
          source: userAvatarInventory.source,
          item: {
            id: avatarItems.publicId,
            slotName: avatarItems.slotName,
            meshUrl: avatarItems.meshUrl,
            textureUrl: avatarItems.textureUrl,
            thumbnailUrl: avatarItems.thumbnailUrl,
            metadata: avatarItems.metadata
          }
        })
        .from(userAvatarInventory)
        .innerJoin(avatarItems, eq(userAvatarInventory.itemId, avatarItems.id))
        .where(eq(userAvatarInventory.userId, request.user!.id))
        .orderBy(desc(userAvatarInventory.acquiredAt))
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
      fastify.log.error(error as Error, 'Error fetching avatar inventory');
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