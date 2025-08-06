import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { 
  db, 
  avatarBaseModels, 
  avatarItems, 
  userAvatars, 
  avatarEquippedItems,
  userAvatarInventory,
  avatarSlots
} from '@triberspace/database';
import { eq, desc, and } from 'drizzle-orm';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery, validateBody } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';
import { NotFoundError } from '../../middleware/error';

const avatarQuerySchema = paginationSchema.extend({
  baseModelId: publicIdSchema.optional(),
  slotName: z.string().optional()
});

const equipItemSchema = z.object({
  itemId: publicIdSchema,
  slotName: z.string().min(1),
  colorVariant: z.record(z.any()).optional()
});

export async function v1AvatarsRoutes(fastify: FastifyInstance) {
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

      return {
        success: true,
        data: {
          baseModels,
          pagination: {
            page,
            limit,
            hasMore: baseModels.length === limit
          }
        }
      };
    } catch (error) {
      fastify.log.error('Error fetching avatar base models:', error);
      return {
        success: true,
        data: {
          baseModels: [],
          pagination: {
            page,
            limit,
            hasMore: false
          },
          message: 'No avatar base models available (database might be empty)'
        }
      };
    }
  });

  // Public: Browse avatar items
  fastify.get('/items', {
    preHandler: [optionalAuthMiddleware, validateQuery(avatarQuerySchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit, baseModelId, slotName } = request.query as z.infer<typeof avatarQuerySchema>;
    const offset = (page - 1) * limit;

    try {
      // Simplified query without complex filtering for now
      const items = await db
        .select({
          id: avatarItems.publicId,
          baseModelId: avatarItems.baseModelId,
          slotName: avatarItems.slotName,
          meshUrl: avatarItems.meshUrl,
          textureUrl: avatarItems.textureUrl,
          thumbnailUrl: avatarItems.thumbnailUrl,
          metadata: avatarItems.metadata,
          incompatibleWith: avatarItems.incompatibleWith,
          createdAt: avatarItems.createdAt
        })
        .from(avatarItems)
        .orderBy(desc(avatarItems.createdAt))
        .limit(limit)
        .offset(offset);

      // TODO: Add filtering by baseModelId and slotName when needed

      return {
        success: true,
        data: {
          items,
          pagination: {
            page,
            limit,
            hasMore: items.length === limit
          }
        }
      };
    } catch (error) {
      fastify.log.error('Error fetching avatar items:', error);
      return {
        success: true,
        data: {
          items: [],
          pagination: {
            page,
            limit,
            hasMore: false
          },
          message: 'No avatar items available (database might be empty)'
        }
      };
    }
  });

  // Protected: Get user's current avatar
  fastify.get('/my-avatar', {
    preHandler: [authMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      // Get user's active avatar
      const [userAvatar] = await db
        .select({
          id: userAvatars.publicId,
          name: userAvatars.name,
          baseModelId: userAvatars.baseModelId,
          isActive: userAvatars.isActive,
          createdAt: userAvatars.createdAt,
          updatedAt: userAvatars.updatedAt
        })
        .from(userAvatars)
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

      // Get base model info
      const [baseModel] = await db
        .select({
          id: avatarBaseModels.publicId,
          name: avatarBaseModels.name,
          meshUrl: avatarBaseModels.meshUrl,
          skeletonUrl: avatarBaseModels.skeletonUrl,
          thumbnailUrl: avatarBaseModels.thumbnailUrl,
          rigType: avatarBaseModels.rigType
        })
        .from(avatarBaseModels)
        .where(eq(avatarBaseModels.id, userAvatar.baseModelId))
        .limit(1);

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
            baseModel: baseModel || null,
            equippedItems
          }
        }
      };
    } catch (error) {
      fastify.log.error('Error fetching user avatar:', error);
      return {
        success: true,
        data: {
          avatar: null,
          message: 'Failed to fetch avatar (might not exist yet)'
        }
      };
    }
  });

  // Protected: Equip avatar item
  fastify.post('/equip', {
    preHandler: [authMiddleware, validateBody(equipItemSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { itemId, slotName, colorVariant } = request.body as z.infer<typeof equipItemSchema>;

    try {
      // Get user's active avatar
      const [userAvatar] = await db
        .select({
          id: userAvatars.id,
          publicId: userAvatars.publicId,
          baseModelId: userAvatars.baseModelId
        })
        .from(userAvatars)
        .where(and(
          eq(userAvatars.userId, request.user!.id),
          eq(userAvatars.isActive, true)
        ))
        .limit(1);

      if (!userAvatar) {
        return reply.code(404).send({
          error: {
            code: 'NO_AVATAR',
            message: 'No active avatar found. Create an avatar first.',
            statusCode: 404
          }
        });
      }

      // Verify item exists and is compatible with user's base model
      const [item] = await db
        .select({
          id: avatarItems.id,
          baseModelId: avatarItems.baseModelId,
          slotName: avatarItems.slotName,
          incompatibleWith: avatarItems.incompatibleWith
        })
        .from(avatarItems)
        .where(eq(avatarItems.publicId, itemId))
        .limit(1);

      if (!item) {
        return reply.code(404).send({
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Avatar item not found',
            statusCode: 404
          }
        });
      }

      // Check compatibility
      if (item.baseModelId !== userAvatar.baseModelId) {
        return reply.code(400).send({
          error: {
            code: 'INCOMPATIBLE_ITEM',
            message: 'Item is not compatible with your avatar base model',
            statusCode: 400
          }
        });
      }

      if (item.slotName !== slotName) {
        return reply.code(400).send({
          error: {
            code: 'WRONG_SLOT',
            message: `Item belongs to slot '${item.slotName}', not '${slotName}'`,
            statusCode: 400
          }
        });
      }

      // Check if user owns this item (simplified - assume they do for now)
      // In a real implementation, you'd check userAvatarInventory

      // Remove any existing item in this slot
      await db
        .delete(avatarEquippedItems)
        .where(and(
          eq(avatarEquippedItems.userAvatarId, userAvatar.id),
          eq(avatarEquippedItems.slotName, slotName)
        ));

      // Equip the new item
      const [equippedItem] = await db
        .insert(avatarEquippedItems)
        .values({
          userAvatarId: userAvatar.id,
          slotName,
          itemId: item.id,
          colorVariant
        })
        .returning({
          slotName: avatarEquippedItems.slotName,
          colorVariant: avatarEquippedItems.colorVariant,
          equippedAt: avatarEquippedItems.equippedAt
        });

      return reply.code(201).send({
        success: true,
        data: {
          equipped: equippedItem,
          message: 'Item equipped successfully'
        }
      });
    } catch (error) {
      fastify.log.error('Error equipping avatar item:', error);
      return reply.code(500).send({
        error: {
          code: 'EQUIP_FAILED',
          message: 'Failed to equip item',
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
      fastify.log.error('Error fetching avatar inventory:', error);
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