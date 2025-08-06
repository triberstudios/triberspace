import { FastifyRequest, FastifyReply } from 'fastify';
import { auth, User } from '@triberspace/auth';

// Extended user type that includes custom fields
export interface ExtendedUser extends User {
  firstName?: string;
  lastName?: string;
  userName?: string;
  role?: string;
  socialLinks?: any;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: ExtendedUser;
  session?: {
    user: ExtendedUser;
    session: any;
  };
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