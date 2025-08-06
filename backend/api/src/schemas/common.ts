import { z } from 'zod';

export const publicIdSchema = z.string().length(12).regex(/^[A-Za-z0-9]+$/);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const userRoleSchema = z.enum(['user', 'creator', 'admin']);

export const timestampSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date()
});

export const baseResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    statusCode: z.number()
  }).optional()
});