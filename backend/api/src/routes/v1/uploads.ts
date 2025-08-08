import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { 
  generatePresignedUploadUrl, 
  deleteFile, 
  fileExists,
  UPLOAD_CATEGORIES,
  FILE_LIMITS,
  generateCdnUrl,
  type UploadCategory
} from '../../services/r2';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validation';
import { publicIdSchema } from '../../schemas/common';

// Validation schemas
const presignedUrlRequestSchema = z.object({
  category: z.enum(UPLOAD_CATEGORIES, {
    errorMap: () => ({ message: `Category must be one of: ${UPLOAD_CATEGORIES.join(', ')}` })
  }),
  entityId: publicIdSchema.or(z.string().min(1, 'Entity ID is required')),
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
  fileSize: z.number().int().positive('File size must be positive').max(
    Math.max(...Object.values(FILE_LIMITS).map(l => l.maxSize)),
    'File too large'
  ),
  expiresIn: z.number().int().min(60).max(3600).optional().default(900) // 1 min to 1 hour, default 15 min
});

const deleteFileSchema = z.object({
  filePath: z.string().min(1, 'File path is required')
});

const fileParamsSchema = z.object({
  category: z.enum(UPLOAD_CATEGORIES),
  entityId: z.string().min(1),
  filename: z.string().min(1)
});

export async function v1UploadsRoutes(fastify: FastifyInstance) {
  
  // Generate presigned URL for upload
  fastify.post('/presigned', {
    preHandler: [authMiddleware, validateBody(presignedUrlRequestSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { category, entityId, filename, fileSize, expiresIn } = 
        request.body as z.infer<typeof presignedUrlRequestSchema>;

      // Generate presigned URL
      const result = await generatePresignedUploadUrl(
        category, 
        entityId, 
        filename, 
        fileSize, 
        expiresIn
      );

      return {
        success: true,
        data: {
          uploadUrl: result.uploadUrl,
          cdnUrl: result.cdnUrl,
          filePath: result.filePath,
          expiresIn
        }
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Generate presigned URL error');
      return reply.code(400).send({
        error: {
          code: 'PRESIGNED_URL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate upload URL',
          statusCode: 400
        }
      });
    }
  });

  // Delete uploaded file
  fastify.delete('/file', {
    preHandler: [authMiddleware, validateBody(deleteFileSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { filePath } = request.body as z.infer<typeof deleteFileSchema>;

      // Check if file exists
      const exists = await fileExists(filePath);
      if (!exists) {
        return reply.code(404).send({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found',
            statusCode: 404
          }
        });
      }

      // Delete file
      const deleted = await deleteFile(filePath);
      if (!deleted) {
        return reply.code(500).send({
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete file',
            statusCode: 500
          }
        });
      }

      return {
        success: true,
        data: {
          message: 'File deleted successfully',
          filePath
        }
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Delete file error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete file',
          statusCode: 500
        }
      });
    }
  });

  // Get file info (check if exists, get CDN URL)
  fastify.get('/file/:category/:entityId/:filename', {
    preHandler: [validateParams(fileParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { category, entityId, filename } = 
        request.params as z.infer<typeof fileParamsSchema>;

      const filePath = `${category}/${entityId}/${filename}`;
      const exists = await fileExists(filePath);

      if (!exists) {
        return reply.code(404).send({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found',
            statusCode: 404
          }
        });
      }

      const cdnUrl = generateCdnUrl(filePath);

      return {
        success: true,
        data: {
          filePath,
          cdnUrl,
          exists: true
        }
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Get file info error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get file information',
          statusCode: 500
        }
      });
    }
  });

  // Get upload configuration (file limits, supported types, etc.)
  fastify.get('/config', async (request, reply) => {
    return {
      success: true,
      data: {
        categories: UPLOAD_CATEGORIES,
        fileLimits: FILE_LIMITS,
        supportedTypes: Object.values(FILE_LIMITS).flatMap(config => config.types),
        maxFileSizes: Object.fromEntries(
          Object.entries(FILE_LIMITS).map(([category, config]) => [
            category,
            {
              maxSize: config.maxSize,
              maxSizeMB: Math.round(config.maxSize / 1024 / 1024)
            }
          ])
        )
      }
    };
  });

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    try {
      // Test R2 connection by checking if we can generate a presigned URL
      const testResult = await generatePresignedUploadUrl(
        'temp',
        'health-check',
        'test.jpg',
        1024,
        60
      );

      return {
        success: true,
        data: {
          message: 'Upload service is healthy',
          r2Connection: 'ok',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Upload health check failed');
      return reply.code(503).send({
        error: {
          code: 'SERVICE_UNHEALTHY',
          message: 'Upload service is not available',
          statusCode: 503
        }
      });
    }
  });
}