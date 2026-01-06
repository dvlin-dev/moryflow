import { z } from 'zod';

export const StatsResponseSchema = z.object({
  totalUsers: z.number(),
  activeUsers: z.number(),
  newUsersToday: z.number(),
  newUsersThisWeek: z.number(),
  newUsersThisMonth: z.number(),
  tierDistribution: z.object({
    FREE: z.number(),
    STARTER: z.number(),
    PRO: z.number(),
    MAX: z.number(),
  }),
  totalRevenue: z.number(),
  totalCreditsGranted: z.number(),
  totalCreditsConsumed: z.number(),
});
export type StatsResponse = z.infer<typeof StatsResponseSchema>;
