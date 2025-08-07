import { FastifyRequest, FastifyReply } from 'fastify';
import { auth, User } from '@triberspace/auth';
import { db, creators } from '@triberspace/database';
import { eq } from 'drizzle-orm';

// Extended user type that includes custom fields
export interface ExtendedUser extends User {
  firstName?: string;
  lastName?: string;
  userName?: string;
  role: string | null | undefined; // Match Better Auth type
  socialLinks?: any;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: ExtendedUser;
  session?: {
    user: ExtendedUser;
    session: any;
  };
  creator?: { id: number; publicId: string };
}

export async function authMiddleware(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const headers = new Headers();
    Object.entries(request.headers).forEach(([key, value]) => {
      if (value) headers.append(key, Array.isArray(value) ? value[0] : value);
    });

    const session = await auth.api.getSession({ headers });

    if (!session) {
      return reply.code(401).send({ 
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401
        }
      });
    }

    request.user = session.user as ExtendedUser;
    request.session = { ...session, user: session.user as ExtendedUser };
  } catch (error) {
    request.log.error('Auth middleware error:', error);
    return reply.code(500).send({ 
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error',
        statusCode: 500
      }
    });
  }
}

export async function optionalAuthMiddleware(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const headers = new Headers();
    Object.entries(request.headers).forEach(([key, value]) => {
      if (value) headers.append(key, Array.isArray(value) ? value[0] : value);
    });

    const session = await auth.api.getSession({ headers });
    
    if (session) {
      request.user = session.user as ExtendedUser;
      request.session = { ...session, user: session.user as ExtendedUser };
    }
  } catch (error) {
    request.log.error('Optional auth middleware error:', error);
  }
}

export async function adminMiddleware(request: AuthenticatedRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.code(401).send({ 
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        statusCode: 401
      }
    });
  }

  if (request.user.role !== 'admin') {
    return reply.code(403).send({ 
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
        statusCode: 403
      }
    });
  }
}

export async function requireCompleteProfile(request: AuthenticatedRequest, reply: FastifyReply) {
  if (!request.user) {
    await authMiddleware(request, reply);
  }
  
  if (!request.user) return;

  const { firstName, lastName, userName } = request.user;
  
  if (!firstName || !lastName || !userName) {
    return reply.code(403).send({
      error: {
        code: 'INCOMPLETE_PROFILE',
        message: 'Please complete your profile to access this feature',
        statusCode: 403,
        details: {
          missingFields: [
            !firstName && 'firstName',
            !lastName && 'lastName', 
            !userName && 'userName'
          ].filter(Boolean)
        }
      }
    });
  }
}

export async function creatorOnlyMiddleware(request: AuthenticatedRequest, reply: FastifyReply) {
  await requireCompleteProfile(request, reply);
  
  if (!request.user) return;

  try {
    const [creator] = await db
      .select({ id: creators.id, publicId: creators.publicId })
      .from(creators)
      .where(eq(creators.userId, request.user.id))
      .limit(1);

    if (!creator) {
      return reply.code(403).send({
        error: {
          code: 'NOT_CREATOR',
          message: 'Creator access required. Please apply to become a creator first.',
          statusCode: 403
        }
      });
    }

    request.creator = creator;
  } catch (error) {
    request.log.error('Creator middleware error:', error);
    return reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify creator status',
        statusCode: 500
      }
    });
  }
}