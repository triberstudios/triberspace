import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { db, user } from '@triberspace/database';
import { eq } from 'drizzle-orm';

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50).optional(),
  lastName: z.string().min(1, 'Last name is required').max(50).optional(),
  userName: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  socialLinks: z.union([z.string(), z.record(z.string())]).optional() // Accept JSON string or object
});

const updateAvatarSchema = z.object({
  avatar_url: z.string().url('Must be a valid URL').max(500)
});

export async function v1UsersRoutes(fastify: FastifyInstance) {
  // Get complete user profile
  fastify.get('/me', {
    preHandler: authMiddleware
  }, async (request: AuthenticatedRequest, reply) => {
    const { firstName, lastName, userName, avatar_url, socialLinks, role } = request.user!;
    const missingFields = [];

    if (!firstName) missingFields.push('firstName');
    if (!lastName) missingFields.push('lastName');
    if (!userName) missingFields.push('userName');

    return {
      success: true,
      data: {
        user: {
          id: request.user!.id,
          email: request.user!.email,
          firstName,
          lastName,
          userName,
          avatar_url,
          socialLinks: socialLinks, // Already a JSON object from JSONB
          role,
          emailVerified: request.user!.emailVerified,
          createdAt: request.user!.createdAt,
          updatedAt: request.user!.updatedAt
        },
        profileComplete: missingFields.length === 0,
        missingFields
      }
    };
  });

  // Update user profile
  fastify.put('/profile', {
    preHandler: [authMiddleware, validateBody(updateProfileSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const updates = request.body as z.infer<typeof updateProfileSchema>;

    try {
      // If updating username, check availability
      if (updates.userName) {
        const [existingUser] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.userName, updates.userName))
          .limit(1);

        if (existingUser && existingUser.id !== request.user!.id) {
          return reply.code(409).send({
            error: {
              code: 'USERNAME_TAKEN',
              message: 'Username is already taken',
              statusCode: 409
            }
          });
        }
      }

      // Prepare updates with proper socialLinks handling
      const dbUpdates: any = {
        ...updates,
        updatedAt: new Date()
      };
      
      // Handle socialLinks - convert to JSON object if it's a string
      if (updates.socialLinks) {
        if (typeof updates.socialLinks === 'string') {
          try {
            dbUpdates.socialLinks = JSON.parse(updates.socialLinks);
          } catch {
            return reply.code(400).send({
              error: {
                code: 'INVALID_JSON',
                message: 'socialLinks must be valid JSON string',
                statusCode: 400
              }
            });
          }
        } else {
          // It's already an object, use as-is
          dbUpdates.socialLinks = updates.socialLinks;
        }
      }

      // Update user profile
      const [updatedUser] = await db
        .update(user)
        .set(dbUpdates)
        .where(eq(user.id, request.user!.id))
        .returning({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userName: user.userName,
          avatar_url: user.avatar_url,
          socialLinks: user.socialLinks,
          role: user.role,
          updatedAt: user.updatedAt
        });

      return {
        success: true,
        data: {
          message: 'Profile updated successfully',
          user: {
            ...updatedUser,
            socialLinks: updatedUser.socialLinks // Already a JSON object from JSONB
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Update profile error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update profile',
          statusCode: 500
        }
      });
    }
  });

  // Update avatar URL
  fastify.put('/avatar', {
    preHandler: [authMiddleware, validateBody(updateAvatarSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { avatar_url } = request.body as z.infer<typeof updateAvatarSchema>;

    try {
      const [updatedUser] = await db
        .update(user)
        .set({
          avatar_url,
          updatedAt: new Date()
        })
        .where(eq(user.id, request.user!.id))
        .returning({
          id: user.id,
          avatar_url: user.avatar_url,
          updatedAt: user.updatedAt
        });

      return {
        success: true,
        data: {
          message: 'Avatar updated successfully',
          user: updatedUser
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

  // Delete user account (soft delete - marks account as inactive)
  fastify.delete('/account', {
    preHandler: authMiddleware
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      // Note: This is a simplified delete. In production, you might want to:
      // 1. Anonymize user data instead of deleting
      // 2. Transfer creator content to another user
      // 3. Handle cascade deletes more carefully
      // 4. Send confirmation email first
      
      // For now, we'll just mark the user as deleted by setting email to deleted state
      await db
        .update(user)
        .set({
          email: `deleted_${request.user!.id}@triberspace.deleted`,
          firstName: undefined,
          lastName: undefined,
          userName: undefined,
          avatar_url: undefined,
          socialLinks: undefined,
          updatedAt: new Date()
        })
        .where(eq(user.id, request.user!.id));

      // Note: Better Auth sessions will be invalidated automatically
      // when the email changes, effectively logging the user out

      return {
        success: true,
        data: {
          message: 'Account deleted successfully'
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Delete account error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete account',
          statusCode: 500
        }
      });
    }
  });
}