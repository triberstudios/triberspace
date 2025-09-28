import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Temporary storage directory (in production, this would be in R2)
const TEMP_STORAGE_DIR = path.join(process.cwd(), 'temp-scenes');

// Ensure temp directory exists
const ensureTempDir = async () => {
  try {
    await fs.access(TEMP_STORAGE_DIR);
  } catch {
    await fs.mkdir(TEMP_STORAGE_DIR, { recursive: true });
  }
};

// Schema for scene upload - very permissive to accept editor JSON
const sceneUploadSchema = z.object({
  scene: z.any(), // Three.js scene JSON - accept any structure
  camera: z.any(), // Camera JSON - accept any structure
  compiledBehaviors: z.any().optional(), // Compiled behaviors - accept any structure
  interactionGraph: z.any().optional(), // Interaction graph - accept any structure
  environment: z.any().optional(), // Environment settings
  project: z.any().optional(), // Project settings
  metadata: z.any().optional(), // Metadata
  scripts: z.any().optional(), // Scripts from editor
  history: z.any().optional() // History from editor
}).passthrough(); // Allow any additional properties

// Schema for scene metadata
const sceneMetadataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  creator: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export async function v1RuntimeRoutes(fastify: FastifyInstance) {
  // Ensure temp directory exists on startup
  await ensureTempDir();

  // Upload scene for preview
  fastify.post('/scenes', async (request, reply) => {
    try {
      // Log request for debugging
      fastify.log.info('🗄️ Backend: Received scene upload request', {
        hasBody: !!request.body,
        bodyKeys: request.body ? Object.keys(request.body) : [],
        compiledBehaviorsDetail: request.body?.compiledBehaviors ? {
          behaviorCount: request.body.compiledBehaviors.behaviors?.length || 0,
          errorCount: request.body.compiledBehaviors.errors?.length || 0,
          behaviors: request.body.compiledBehaviors.behaviors?.map(b => ({
            objectName: b.objectName,
            objectUuid: b.objectUuid,
            behaviorCount: b.behaviors?.length || 0,
            hasUpdateFunction: !!b.updateFunction?.execute
          }))
        } : null,
        sceneChildrenCount: request.body?.scene?.children?.length || 0
      });

      // Validate the request body - use very permissive schema
      const validationResult = sceneUploadSchema.safeParse(request.body);

      if (!validationResult.success) {
        fastify.log.warn('🗄️ Backend: Scene validation failed', validationResult.error.errors);
        return reply.code(400).send({
          success: false,
          error: 'Invalid scene data',
          details: validationResult.error.errors
        });
      }

      const sceneData = validationResult.data;
      fastify.log.info('🗄️ Backend: Scene validation passed, preparing to store');
      const sceneId = randomUUID();
      const uploadedAt = new Date().toISOString();

      // Scenes expire after 24 hours for temporary preview
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Store scene data with metadata
      const sceneRecord = {
        id: sceneId,
        ...sceneData,
        uploadedAt,
        expiresAt
      };

      const filePath = path.join(TEMP_STORAGE_DIR, `${sceneId}.json`);
      await fs.writeFile(filePath, JSON.stringify(sceneRecord, null, 2));

      fastify.log.info(`🗄️ Backend: Scene stored successfully: ${sceneId}`, {
        sceneId,
        filePath,
        storedKeys: Object.keys(sceneRecord),
        behaviorCount: sceneRecord.compiledBehaviors?.behaviors?.length || 0
      });

      return {
        success: true,
        data: {
          sceneId,
          uploadedAt,
          expiresAt
        }
      };
    } catch (error) {
      fastify.log.error('Failed to upload scene:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to upload scene'
      });
    }
  });

  // Get scene by ID
  fastify.get('/scenes/:sceneId', async (request, reply) => {
    try {
      const { sceneId } = request.params as { sceneId: string };
      const filePath = path.join(TEMP_STORAGE_DIR, `${sceneId}.json`);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return reply.code(404).send({
          success: false,
          error: 'Scene not found'
        });
      }

      // Read scene data
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const sceneData = JSON.parse(fileContent);

      fastify.log.info(`🗄️ Backend: Scene data loaded from storage: ${sceneId}`, {
        sceneId,
        hasCompiledBehaviors: !!sceneData.compiledBehaviors,
        behaviorCount: sceneData.compiledBehaviors?.behaviors?.length || 0,
        errorCount: sceneData.compiledBehaviors?.errors?.length || 0,
        sceneChildrenCount: sceneData.scene?.children?.length || 0,
        dataKeys: Object.keys(sceneData)
      });

      // Check if scene has expired
      const now = new Date();
      const expiresAt = new Date(sceneData.expiresAt);

      if (now > expiresAt) {
        // Clean up expired scene
        await fs.unlink(filePath);
        return reply.code(404).send({
          success: false,
          error: 'Scene has expired'
        });
      }

      fastify.log.info(`🗄️ Backend: Returning scene data: ${sceneId}`);

      return sceneData;
    } catch (error) {
      fastify.log.error('Failed to retrieve scene:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve scene'
      });
    }
  });

  // Delete scene
  fastify.delete('/scenes/:sceneId', async (request, reply) => {
    try {
      const { sceneId } = request.params as { sceneId: string };
      const filePath = path.join(TEMP_STORAGE_DIR, `${sceneId}.json`);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return reply.code(404).send({
          success: false,
          error: 'Scene not found'
        });
      }

      // Delete scene file
      await fs.unlink(filePath);

      fastify.log.info(`Scene deleted: ${sceneId}`);

      return {
        success: true,
        message: 'Scene deleted successfully'
      };
    } catch (error) {
      fastify.log.error('Failed to delete scene:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete scene'
      });
    }
  });

  // List scenes (for development)
  fastify.get('/scenes', async (request, reply) => {
    try {
      const files = await fs.readdir(TEMP_STORAGE_DIR);
      const sceneFiles = files.filter(file => file.endsWith('.json'));

      const scenes = [];
      const now = new Date();

      for (const file of sceneFiles) {
        try {
          const filePath = path.join(TEMP_STORAGE_DIR, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const scene = JSON.parse(content);

          // Check if expired
          const expiresAt = new Date(scene.expiresAt);
          if (now > expiresAt) {
            // Clean up expired scene
            await fs.unlink(filePath);
            continue;
          }

          scenes.push({
            id: scene.id,
            metadata: scene.metadata || {},
            uploadedAt: scene.uploadedAt,
            expiresAt: scene.expiresAt,
            behaviorCount: scene.compiledBehaviors?.behaviors?.length || 0,
            errorCount: scene.compiledBehaviors?.errors?.length || 0
          });
        } catch (error) {
          fastify.log.warn(`Failed to parse scene file ${file}:`, error);
        }
      }

      return {
        success: true,
        data: {
          scenes,
          totalCount: scenes.length
        }
      };
    } catch (error) {
      fastify.log.error('Failed to list scenes:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to list scenes'
      });
    }
  });

  // Cleanup expired scenes (maintenance endpoint)
  fastify.post('/scenes/cleanup', async (request, reply) => {
    try {
      const files = await fs.readdir(TEMP_STORAGE_DIR);
      const sceneFiles = files.filter(file => file.endsWith('.json'));

      let cleanedCount = 0;
      const now = new Date();

      for (const file of sceneFiles) {
        try {
          const filePath = path.join(TEMP_STORAGE_DIR, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const scene = JSON.parse(content);

          // Check if expired
          const expiresAt = new Date(scene.expiresAt);
          if (now > expiresAt) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch (error) {
          fastify.log.warn(`Failed to process scene file ${file} during cleanup:`, error);
          // Delete corrupted files too
          const filePath = path.join(TEMP_STORAGE_DIR, file);
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      fastify.log.info(`Cleaned up ${cleanedCount} expired/corrupted scenes`);

      return {
        success: true,
        data: {
          cleanedCount
        }
      };
    } catch (error) {
      fastify.log.error('Failed to cleanup scenes:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to cleanup scenes'
      });
    }
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
      await ensureTempDir();
      const files = await fs.readdir(TEMP_STORAGE_DIR);
      const sceneCount = files.filter(file => file.endsWith('.json')).length;

      return {
        success: true,
        data: {
          status: 'healthy',
          tempStorageDir: TEMP_STORAGE_DIR,
          sceneCount,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: 'Runtime storage is not healthy'
      });
    }
  });
}