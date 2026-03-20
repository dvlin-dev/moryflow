import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ResolveWorkspaceSchema = z.object({
  clientWorkspaceId: z.string().trim().min(1, 'clientWorkspaceId is required'),
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(200, 'name must be at most 200 characters'),
  syncRequested: z.boolean().optional().default(false),
});

export class ResolveWorkspaceDto extends createZodDto(ResolveWorkspaceSchema) {}

export const WorkspaceResolveResponseSchema = z.object({
  workspaceId: z.string().uuid(),
  memoryProjectId: z.string().uuid(),
  syncVaultId: z.string().uuid().nullable(),
  syncEnabled: z.boolean(),
});

export type ResolveWorkspaceInput = z.infer<typeof ResolveWorkspaceSchema>;
export type WorkspaceResolveResponseDto = z.infer<
  typeof WorkspaceResolveResponseSchema
>;
