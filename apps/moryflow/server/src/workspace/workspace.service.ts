import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type {
  ResolveWorkspaceInput,
  WorkspaceResolveResponseDto,
} from './dto/workspace.dto';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  private isUniqueConstraintError(error: unknown): boolean {
    return (error as { code?: string })?.code === 'P2002';
  }

  async resolveWorkspace(
    userId: string,
    input: ResolveWorkspaceInput,
  ): Promise<WorkspaceResolveResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const readWorkspace = () =>
        tx.workspace.findUnique({
          where: {
            userId_clientWorkspaceId: {
              userId,
              clientWorkspaceId: input.clientWorkspaceId,
            },
          },
          include: {
            syncVault: true,
          },
        });

      let workspace = await readWorkspace();

      if (!workspace) {
        try {
          workspace = await tx.workspace.create({
            data: {
              userId,
              clientWorkspaceId: input.clientWorkspaceId,
              name: input.name,
            },
            include: {
              syncVault: true,
            },
          });
        } catch (error) {
          if (!this.isUniqueConstraintError(error)) {
            throw error;
          }
          workspace = await readWorkspace();
        }
      }

      if (!workspace) {
        throw new InternalServerErrorException('Workspace resolution failed.');
      }

      let syncVault = workspace.syncVault;
      if (input.syncRequested && !syncVault) {
        try {
          syncVault = await tx.vault.create({
            data: {
              userId,
              workspaceId: workspace.id,
              name: workspace.name,
            },
          });
        } catch (error) {
          if (!this.isUniqueConstraintError(error)) {
            throw error;
          }
          syncVault = await tx.vault.findUnique({
            where: {
              workspaceId: workspace.id,
            },
          });
        }
      }

      return {
        workspaceId: workspace.id,
        memoryProjectId: workspace.id,
        syncVaultId: syncVault?.id ?? null,
        syncEnabled: syncVault != null,
      };
    });
  }
}
