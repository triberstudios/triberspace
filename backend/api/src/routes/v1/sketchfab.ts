import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface SketchfabTokenRequest {
  Body: {
    code: string;
    redirect_uri: string;
  };
}

interface SketchfabSearchRequest {
  Body: {
    query: string;
    count?: number;
  };
}

export async function v1SketchfabRoutes(fastify: FastifyInstance) {
  // Exchange authorization code for access token
  fastify.post<SketchfabTokenRequest>('/token', async (request, reply) => {
    const { code, redirect_uri } = request.body;

    if (!code) {
      return reply.status(400).send({
        success: false,
        error: 'Authorization code is required'
      });
    }

    try {
      const tokenUrl = 'https://sketchfab.com/oauth2/token/';
      const clientId = 'UgSa28CamwcPrTFJJz9mvkewOvKmVSaQKfvwp6yR';
      const clientSecret = 'sSs7mmM8VzDDE0kQ0vBM0sufkozqkbv9LBTfngXqL1c4M3d62gZNdCpVUI3IDsrYNVLIJDsgWcSbW0hEmgOBY03ejVdiSQRGwtMcFUwjcADuwThU7sqvsbup4XQIh2UX';

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirect_uri || 'http://localhost:3001/auth/sketchfab/callback'
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        fastify.log.error(`Sketchfab token exchange failed: ${response.status} ${errorText}`);
        return reply.status(400).send({
          success: false,
          error: 'token_exchange_failed',
          message: `Failed to exchange code for token: ${response.status}`
        });
      }

      const tokenData = await response.json() as {
        access_token?: string;
        expires_in?: number;
        token_type?: string;
        error?: string;
      };

      return reply.send({
        success: true,
        data: {
          access_token: tokenData.access_token,
          expires_in: tokenData.expires_in || 3600,
          token_type: tokenData.token_type || 'Bearer'
        }
      });

    } catch (error) {
      fastify.log.error('Sketchfab token exchange error:', error);
      return reply.status(500).send({
        success: false,
        error: 'internal_error',
        message: 'Failed to process token exchange'
      });
    }
  });

  // Search Sketchfab models
  fastify.post<SketchfabSearchRequest>('/search', async (request, reply) => {
    const { query, count = 3 } = request.body;

    if (!query) {
      return reply.status(400).send({
        success: false,
        error: 'Search query is required'
      });
    }

    try {
      // Use Sketchfab's public search API
      const searchUrl = new URL('https://api.sketchfab.com/v3/search');
      searchUrl.searchParams.set('type', 'models');
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('downloadable', 'true');
      searchUrl.searchParams.set('count', count.toString());
      searchUrl.searchParams.set('sort_by', '-likeCount'); // Sort by popularity

      const response = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        fastify.log.error(`Sketchfab search failed: ${response.status}`);
        return reply.status(500).send({
          success: false,
          error: 'search_failed',
          message: 'Failed to search Sketchfab'
        });
      }

      const data = await response.json() as {
        results?: Array<{
          uid: string;
          name: string;
          thumbnails?: {
            images: Array<{ url: string; width: number; height: number }>;
          };
          viewerUrl?: string;
          archives?: {
            gltf?: { url: string };
          };
        }>;
      };

      // Format results for frontend
      const models = (data.results || []).map(model => ({
        uid: model.uid,
        name: model.name,
        thumbnail: model.thumbnails?.images?.[0]?.url || '',
        viewerUrl: model.viewerUrl || `https://sketchfab.com/models/${model.uid}`,
        downloadUrl: model.archives?.gltf?.url || null
      }));

      return reply.send({
        success: true,
        data: {
          models,
          query,
          count: models.length
        }
      });

    } catch (error) {
      fastify.log.error('Sketchfab search error:', error);
      return reply.status(500).send({
        success: false,
        error: 'internal_error',
        message: 'Failed to process search request'
      });
    }
  });

  // Health check for Sketchfab integration
  fastify.get('/health', async (request, reply) => {
    return {
      success: true,
      data: {
        status: 'ok',
        service: 'sketchfab-oauth'
      }
    };
  });
}