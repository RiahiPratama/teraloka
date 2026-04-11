import { z } from 'zod';

/** Phone number Indonesia: 08xx atau 628xx */
export const phoneSchema = z
  .string()
  .regex(/^(08|628)\d{8,12}$/, 'Nomor HP tidak valid');

/** Standard pagination query */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Search query */
export const searchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
  ...paginationSchema.shape,
});
