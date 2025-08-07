import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { auth } from '@triberspace/auth';
import { db, user } from '@triberspace/database';
import { eq } from 'drizzle-orm';

export async function v1AuthRoutes(fastify: FastifyInstance) {
  // Get current user session with extended info
  fastify.get('/me', {
    preHandler: authMiddleware
  }, async (request: AuthenticatedRequest, reply) => {
    return {
      success: true,
      data: {
        user: request.user,
        session: {
          id: request.session?.session.id,
          expiresAt: request.session?.session.expiresAt
        }
      }
    };
  });

  // Extended user profile endpoint
  fastify.get('/profile', {
    preHandler: authMiddleware
  }, async (request: AuthenticatedRequest, reply) => {
    // This could be extended to fetch additional user data
    // like creator status, tribe memberships, etc.
    return {
      success: true,
      data: {
        user: request.user,
        // Future: Add creator profile, tribe memberships, etc.
      }
    };
  });

  // Validation schemas
  const signupFullSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    userName: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  });

  const completeProfileSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    userName: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  });

  const checkUsernameSchema = z.object({
    userName: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  });

  // Complete signup with profile info
  fastify.post('/signup-full', {
    preHandler: validateBody(signupFullSchema)
  }, async (request, reply) => {
    const { email, password, firstName, lastName, userName } = request.body as z.infer<typeof signupFullSchema>;

    try {
      // Check if username is already taken
      const [existingUsername] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.userName, userName))
        .limit(1);

      if (existingUsername) {
        return reply.code(409).send({
          error: {
            code: 'USERNAME_TAKEN',
            message: 'Username is already taken',
            statusCode: 409
          }
        });
      }

      // Create user with Better Auth
      const signUpResponse = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: `${firstName} ${lastName}`,
        }
      });

      if (!signUpResponse) {
        return reply.code(400).send({
          error: {
            code: 'SIGNUP_FAILED',
            message: 'Failed to create account',
            statusCode: 400
          }
        });
      }

      // Update user with additional profile fields
      const userId = (signUpResponse as any).user?.id;
      if (userId) {
        await db
          .update(user)
          .set({
            firstName,
            lastName,
            userName,
            updatedAt: new Date()
          })
          .where(eq(user.id, userId));
      }

      return reply.code(201).send({
        success: true,
        data: {
          message: 'Account created successfully',
          user: {
            id: userId,
            email,
            firstName,
            lastName,
            userName
          }
        }
      });

    } catch (error: any) {
      fastify.log.error('Signup error:', error);
      
      if (error.message?.includes('unique constraint')) {
        return reply.code(409).send({
          error: {
            code: 'EMAIL_TAKEN',
            message: 'An account with this email already exists',
            statusCode: 409
          }
        });
      }

      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create account',
          statusCode: 500
        }
      });
    }
  });

  // Complete profile for users who signed up with minimal info
  fastify.post('/complete-profile', {
    preHandler: [authMiddleware, validateBody(completeProfileSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { firstName, lastName, userName } = request.body as z.infer<typeof completeProfileSchema>;

    try {
      // Check if username is already taken by another user
      const [existingUsername] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.userName, userName))
        .limit(1);

      if (existingUsername && existingUsername.id !== request.user!.id) {
        return reply.code(409).send({
          error: {
            code: 'USERNAME_TAKEN',
            message: 'Username is already taken',
            statusCode: 409
          }
        });
      }

      // Update user profile
      await db
        .update(user)
        .set({
          firstName,
          lastName,
          userName,
          updatedAt: new Date()
        })
        .where(eq(user.id, request.user!.id));

      return {
        success: true,
        data: {
          message: 'Profile completed successfully',
          user: {
            ...request.user,
            firstName,
            lastName,
            userName
          }
        }
      };

    } catch (error) {
      fastify.log.error('Complete profile error:', error);
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to complete profile',
          statusCode: 500
        }
      });
    }
  });

  // Check username availability
  fastify.post('/check-username', {
    preHandler: validateBody(checkUsernameSchema)
  }, async (request, reply) => {
    const { userName } = request.body as z.infer<typeof checkUsernameSchema>;

    try {
      const [existingUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.userName, userName))
        .limit(1);

      return {
        success: true,
        data: {
          available: !existingUser,
          userName
        }
      };

    } catch (error) {
      fastify.log.error('Check username error:', error);
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check username availability',
          statusCode: 500
        }
      });
    }
  });

  // Get profile completion status
  fastify.get('/profile-status', {
    preHandler: authMiddleware
  }, async (request: AuthenticatedRequest, reply) => {
    const { firstName, lastName, userName } = request.user!;
    const missingFields = [];

    if (!firstName) missingFields.push('firstName');
    if (!lastName) missingFields.push('lastName');  
    if (!userName) missingFields.push('userName');

    return {
      success: true,
      data: {
        profileComplete: missingFields.length === 0,
        missingFields,
        user: request.user
      }
    };
  });
}