import { config } from 'dotenv';
import { resolve } from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { auth } from '@triberspace/auth';
import { v1Routes } from './routes/v1';
import { errorHandler } from './middleware/error';

// Load .env from root directory
config({ path: resolve(__dirname, '../../../.env') });

const fastify = Fastify({
  logger: true
});

// Set error handler
fastify.setErrorHandler(errorHandler);

// Start server
const start = async () => {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL || 'http://localhost:3000'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    });

    // Health check route
    fastify.get('/', async function (request, reply) {
      return { message: 'Triberspace API is running', status: 'healthy' };
    });

    // Auth routes
    fastify.route({
      method: ["GET", "POST"],
      url: "/api/auth/*",
      async handler(request, reply) {
        try {
          const url = new URL(request.url, `http://${request.headers.host}`);
          
          const headers = new Headers();
          Object.entries(request.headers).forEach(([key, value]) => {
            if (value) headers.append(key, Array.isArray(value) ? value[0] : value);
          });

          const req = new Request(url.toString(), {
            method: request.method,
            headers,
            body: request.body ? JSON.stringify(request.body) : undefined,
          });

          const response = await auth.handler(req);

          reply.status(response.status);
          response.headers.forEach((value, key) => reply.header(key, value));
          
          const responseBody = response.body ? await response.text() : null;
          return responseBody;

        } catch (error) {
          fastify.log.error("Authentication Error:", error);
          reply.status(500);
          return { error: "Internal authentication error" };
        }
      }
    });

    // Register v1 API routes
    await fastify.register(v1Routes, { prefix: '/api/v1' });

    // Protected route example (keeping for backward compatibility)
    fastify.get('/protected', async (request, reply) => {
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, Array.isArray(value) ? value[0] : value);
      });

      const session = await auth.api.getSession({
        headers: headers
      });

      if (!session) {
        reply.code(401);
        return { error: 'Unauthorized' };
      }

      return { 
        message: 'This is a protected route',
        user: session.user 
      };
    });

    await fastify.listen({ 
      port: parseInt(process.env.PORT || '3001'),
      host: '0.0.0.0'
    });
    fastify.log.info('Server started successfully');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();