import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, events, spaces, worlds, creators, user, eventAttendance } from '@triberspace/database';
import { eq, desc, gte, lte, and, sql } from 'drizzle-orm';
import { optionalAuthMiddleware, authMiddleware, creatorOnlyMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validateParams, validateQuery, validateBody } from '../../middleware/validation';
import { publicIdSchema, paginationSchema } from '../../schemas/common';

// Validation schemas
const eventParamsSchema = z.object({
  eventId: publicIdSchema
});

const eventsQuerySchema = paginationSchema.extend({
  spaceId: publicIdSchema.optional(),
  isLive: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200),
  description: z.string().max(1000).optional(),
  thumbnail_url: z.string().url().optional(),
  startTime: z.string().datetime('Start time must be a valid ISO datetime'),
  endTime: z.string().datetime('End time must be a valid ISO datetime'),
  spaceId: publicIdSchema.optional() // If not provided, uses creator's first space
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: "End time must be after start time",
  path: ["endTime"]
});

const updateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200).optional(),
  description: z.string().max(1000).optional(),
  thumbnail_url: z.string().url().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isLive: z.boolean().optional()
}).refine((data) => {
  if (data.startTime && data.endTime) {
    return new Date(data.endTime) > new Date(data.startTime);
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"]
});

export async function v1EventsRoutes(fastify: FastifyInstance) {
  
  // ===================================================================
  // PUBLIC EVENT ENDPOINTS
  // ===================================================================

  // Public: List all events with filters
  fastify.get('/', {
    preHandler: [optionalAuthMiddleware, validateQuery(eventsQuerySchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit, spaceId, isLive, startDate, endDate } = request.query as z.infer<typeof eventsQuerySchema>;
    const offset = (page - 1) * limit;

    try {
      // Build where conditions
      const conditions = [
        eq(spaces.isActive, true) // Only show events in active spaces
      ];
      
      if (spaceId) {
        conditions.push(eq(spaces.publicId, spaceId));
      }
      
      if (typeof isLive === 'boolean') {
        conditions.push(eq(events.isLive, isLive));
      }
      
      if (startDate) {
        conditions.push(gte(events.startTime, new Date(startDate)));
      }
      
      if (endDate) {
        conditions.push(lte(events.endTime, new Date(endDate)));
      }

      // Build query with joins to get event details
      const eventsList = await db
        .select({
          id: events.publicId,
          name: events.name,
          description: events.description,
          thumbnail_url: events.thumbnail_url,
          startTime: events.startTime,
          endTime: events.endTime,
          isLive: events.isLive,
          createdAt: events.createdAt,
          space: {
            id: spaces.publicId,
            name: spaces.name,
            spaceType: spaces.spaceType
          },
          world: {
            id: worlds.publicId,
            name: worlds.name
          },
          creator: {
            id: creators.publicId,
            username: user.username
          }
        })
        .from(events)
        .innerJoin(spaces, eq(events.spaceId, spaces.id))
        .innerJoin(worlds, eq(spaces.worldId, worlds.id))
        .innerJoin(creators, eq(worlds.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .where(and(...conditions))
        .orderBy(desc(events.startTime))
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        data: {
          events: eventsList,
          pagination: {
            page,
            limit,
            hasMore: eventsList.length === limit
          },
          filters: {
            spaceId: spaceId || null,
            isLive: isLive ?? null,
            startDate: startDate || null,
            endDate: endDate || null
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching events');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch events',
          statusCode: 500
        }
      });
    }
  });

  // Public: Get specific event details
  fastify.get('/:eventId', {
    preHandler: [optionalAuthMiddleware, validateParams(eventParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { eventId } = request.params as z.infer<typeof eventParamsSchema>;

    try {
      const [event] = await db
        .select({
          id: events.publicId,
          name: events.name,
          description: events.description,
          thumbnail_url: events.thumbnail_url,
          startTime: events.startTime,
          endTime: events.endTime,
          isLive: events.isLive,
          createdAt: events.createdAt,
          space: {
            id: spaces.publicId,
            name: spaces.name,
            spaceType: spaces.spaceType
          },
          world: {
            id: worlds.publicId,
            name: worlds.name,
            description: worlds.description
          },
          creator: {
            id: creators.publicId,
            username: user.username,
            bio: creators.bio
          }
        })
        .from(events)
        .innerJoin(spaces, eq(events.spaceId, spaces.id))
        .innerJoin(worlds, eq(spaces.worldId, worlds.id))
        .innerJoin(creators, eq(worlds.creatorId, creators.id))
        .innerJoin(user, eq(creators.userId, user.id))
        .where(eq(events.publicId, eventId))
        .limit(1);

      if (!event) {
        return reply.code(404).send({
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'Event not found',
            statusCode: 404
          }
        });
      }

      // Get attendee count
      const [attendeeCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(eventAttendance)
        .innerJoin(events, eq(eventAttendance.eventId, events.id))
        .where(eq(events.publicId, eventId));

      // Check if current user is attending (if authenticated)
      let isAttending = false;
      if (request.user) {
        const [attendance] = await db
          .select({ id: eventAttendance.id })
          .from(eventAttendance)
          .innerJoin(events, eq(eventAttendance.eventId, events.id))
          .where(and(
            eq(events.publicId, eventId),
            eq(eventAttendance.userId, request.user.id)
          ))
          .limit(1);
        isAttending = !!attendance;
      }

      return {
        success: true,
        data: {
          event: {
            ...event,
            attendeeCount: attendeeCount.count || 0,
            isAttending: isAttending
          }
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Error fetching event');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch event details',
          statusCode: 500
        }
      });
    }
  });

  // ===================================================================
  // CREATOR EVENT MANAGEMENT (CRUD OPERATIONS)
  // ===================================================================

  // Protected: Create event (creators only)
  fastify.post('/', {
    preHandler: [creatorOnlyMiddleware, validateBody(createEventSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { name, description, startTime, endTime, spaceId } = request.body as z.infer<typeof createEventSchema>;
    const creatorId = request.creator!.id;

    try {
      let targetSpaceId: number;

      if (spaceId) {
        // Verify the specified space belongs to the creator
        const [space] = await db
          .select({ internalId: spaces.id })
          .from(spaces)
          .innerJoin(worlds, eq(spaces.worldId, worlds.id))
          .where(and(
            eq(worlds.creatorId, creatorId),
            eq(spaces.publicId, spaceId)
          ))
          .limit(1);

        if (!space) {
          return reply.code(404).send({
            error: {
              code: 'SPACE_NOT_FOUND',
              message: 'Specified space not found or not owned by creator',
              statusCode: 404
            }
          });
        }
        targetSpaceId = space.internalId;
      } else {
        // Use creator's first available space
        const [space] = await db
          .select({ id: spaces.id })
          .from(spaces)
          .innerJoin(worlds, eq(spaces.worldId, worlds.id))
          .where(eq(worlds.creatorId, creatorId))
          .limit(1);

        if (!space) {
          return reply.code(404).send({
            error: {
              code: 'SPACE_NOT_FOUND',
              message: 'Creator must have a space before creating events',
              statusCode: 404
            }
          });
        }
        targetSpaceId = space.id;
      }

      // Create the event
      const [newEvent] = await db
        .insert(events)
        .values({
          spaceId: targetSpaceId,
          name,
          description,
          startTime: new Date(startTime),
          endTime: new Date(endTime)
        })
        .returning({
          id: events.publicId,
          name: events.name,
          description: events.description,
          thumbnail_url: events.thumbnail_url,
          startTime: events.startTime,
          endTime: events.endTime,
          isLive: events.isLive,
          createdAt: events.createdAt
        });

      return reply.code(201).send({
        success: true,
        data: {
          message: 'Event created successfully',
          event: newEvent
        }
      });

    } catch (error) {
      fastify.log.error(error as Error, 'Create event error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create event',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Update event (creator only, their own event)
  fastify.put('/:eventId', {
    preHandler: [creatorOnlyMiddleware, validateParams(eventParamsSchema), validateBody(updateEventSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { eventId } = request.params as z.infer<typeof eventParamsSchema>;
    const updates = request.body as z.infer<typeof updateEventSchema>;
    const creatorId = request.creator!.id;

    try {
      // Verify event ownership through space/world ownership
      const [eventInfo] = await db
        .select({ internalId: events.id })
        .from(events)
        .innerJoin(spaces, eq(events.spaceId, spaces.id))
        .innerJoin(worlds, eq(spaces.worldId, worlds.id))
        .where(and(
          eq(worlds.creatorId, creatorId),
          eq(events.publicId, eventId)
        ))
        .limit(1);

      if (!eventInfo) {
        return reply.code(404).send({
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'Event not found or not owned by creator',
            statusCode: 404
          }
        });
      }

      // Prepare updates with date conversion
      const dbUpdates: any = { ...updates };
      if (updates.startTime) {
        dbUpdates.startTime = new Date(updates.startTime);
      }
      if (updates.endTime) {
        dbUpdates.endTime = new Date(updates.endTime);
      }

      // Update the event
      const [updatedEvent] = await db
        .update(events)
        .set(dbUpdates)
        .where(eq(events.id, eventInfo.internalId))
        .returning({
          id: events.publicId,
          name: events.name,
          description: events.description,
          thumbnail_url: events.thumbnail_url,
          startTime: events.startTime,
          endTime: events.endTime,
          isLive: events.isLive,
          createdAt: events.createdAt
        });

      return {
        success: true,
        data: {
          message: 'Event updated successfully',
          event: updatedEvent
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Update event error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update event',
          statusCode: 500
        }
      });
    }
  });

  // Protected: Cancel/Delete event (creator only, their own event)
  fastify.delete('/:eventId', {
    preHandler: [creatorOnlyMiddleware, validateParams(eventParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { eventId } = request.params as z.infer<typeof eventParamsSchema>;
    const creatorId = request.creator!.id;

    try {
      // Verify event ownership through space/world ownership
      const [eventInfo] = await db
        .select({ internalId: events.id })
        .from(events)
        .innerJoin(spaces, eq(events.spaceId, spaces.id))
        .innerJoin(worlds, eq(spaces.worldId, worlds.id))
        .where(and(
          eq(worlds.creatorId, creatorId),
          eq(events.publicId, eventId)
        ))
        .limit(1);

      if (!eventInfo) {
        return reply.code(404).send({
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'Event not found or not owned by creator',
            statusCode: 404
          }
        });
      }

      // Delete the event (attendance will be cascade deleted)
      await db
        .delete(events)
        .where(eq(events.id, eventInfo.internalId));

      return {
        success: true,
        data: {
          message: 'Event cancelled and deleted successfully'
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Delete event error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel event',
          statusCode: 500
        }
      });
    }
  });

  // ===================================================================
  // EVENT ATTENDANCE SYSTEM
  // ===================================================================

  // Protected: Join event (authenticated users only)
  fastify.post('/:eventId/attend', {
    preHandler: [authMiddleware, validateParams(eventParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { eventId } = request.params as z.infer<typeof eventParamsSchema>;
    const userId = request.user!.id;

    try {
      // Verify event exists and get internal ID
      const [event] = await db
        .select({ 
          internalId: events.id,
          name: events.name,
          startTime: events.startTime
        })
        .from(events)
        .where(eq(events.publicId, eventId))
        .limit(1);

      if (!event) {
        return reply.code(404).send({
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'Event not found',
            statusCode: 404
          }
        });
      }

      // Check if already attending
      const [existingAttendance] = await db
        .select({ id: eventAttendance.id })
        .from(eventAttendance)
        .where(and(
          eq(eventAttendance.eventId, event.internalId),
          eq(eventAttendance.userId, userId)
        ))
        .limit(1);

      if (existingAttendance) {
        return reply.code(409).send({
          error: {
            code: 'ALREADY_ATTENDING',
            message: 'User is already attending this event',
            statusCode: 409
          }
        });
      }

      // Add attendance record
      await db
        .insert(eventAttendance)
        .values({
          eventId: event.internalId,
          userId: userId
        });

      return reply.code(201).send({
        success: true,
        data: {
          message: `Successfully joined event: ${event.name}`,
          event: {
            id: eventId,
            name: event.name,
            startTime: event.startTime
          }
        }
      });

    } catch (error) {
      fastify.log.error(error as Error, 'Join event error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to join event',
          statusCode: 500
        }
      });
    }
  });

  // Public: Get event attendees (limited info for privacy)
  fastify.get('/:eventId/attendees', {
    preHandler: [optionalAuthMiddleware, validateParams(eventParamsSchema)]
  }, async (request: AuthenticatedRequest, reply) => {
    const { eventId } = request.params as z.infer<typeof eventParamsSchema>;

    try {
      // Verify event exists
      const [event] = await db
        .select({ 
          internalId: events.id,
          name: events.name
        })
        .from(events)
        .where(eq(events.publicId, eventId))
        .limit(1);

      if (!event) {
        return reply.code(404).send({
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'Event not found',
            statusCode: 404
          }
        });
      }

      // Get attendee list with limited user info for privacy
      const attendees = await db
        .select({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          image: user.image,
          attendedAt: eventAttendance.attendedAt
        })
        .from(eventAttendance)
        .innerJoin(user, eq(eventAttendance.userId, user.id))
        .where(eq(eventAttendance.eventId, event.internalId))
        .orderBy(desc(eventAttendance.attendedAt));

      return {
        success: true,
        data: {
          event: {
            id: eventId,
            name: event.name
          },
          attendees: attendees.map(attendee => ({
            id: attendee.id,
            name: `${attendee.firstName || ''} ${attendee.lastName || ''}`.trim() || attendee.username,
            username: attendee.username,
            image: attendee.image,
            attendedAt: attendee.attendedAt
          })),
          totalCount: attendees.length
        }
      };

    } catch (error) {
      fastify.log.error(error as Error, 'Get attendees error');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch event attendees',
          statusCode: 500
        }
      });
    }
  });
}