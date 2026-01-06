import { z } from 'zod';

export const AdminLogLevelSchema = z.enum(['INFO', 'WARN', 'ERROR']);

export const ListLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  level: AdminLogLevelSchema.optional(),
  action: z.string().optional(),
  adminId: z.string().optional(),
  targetUserId: z.string().optional(),
});
export type ListLogsQuery = z.infer<typeof ListLogsQuerySchema>;
