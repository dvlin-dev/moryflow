import crypto from 'node:crypto';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';

export const WORKSPACE_META_DIR = '.moryflow';
export const WORKSPACE_IDENTITY_FILE = 'workspace.json';

const WorkspaceIdentitySchema = z.object({
  clientWorkspaceId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type WorkspaceIdentity = z.infer<typeof WorkspaceIdentitySchema>;

const inflight = new Map<string, Promise<WorkspaceIdentity>>();

export const getWorkspaceIdentityPath = (workspacePath: string): string =>
  path.join(workspacePath, WORKSPACE_META_DIR, WORKSPACE_IDENTITY_FILE);

const createWorkspaceIdentity = (): WorkspaceIdentity => ({
  clientWorkspaceId: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
});

const readWorkspaceIdentity = async (
  identityPath: string,
): Promise<WorkspaceIdentity> => {
  const raw = await readFile(identityPath, 'utf8');
  return WorkspaceIdentitySchema.parse(JSON.parse(raw));
};

const resolveWorkspaceIdentity = async (
  workspacePath: string,
): Promise<WorkspaceIdentity> => {
  const identityPath = getWorkspaceIdentityPath(workspacePath);

  try {
    return await readWorkspaceIdentity(identityPath);
  } catch {
    const identity = createWorkspaceIdentity();
    await mkdir(path.dirname(identityPath), { recursive: true });

    try {
      await writeFile(identityPath, JSON.stringify(identity, null, 2), {
        encoding: 'utf8',
        flag: 'wx',
      });
      return identity;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      return readWorkspaceIdentity(identityPath);
    }
  }
};

export async function ensureWorkspaceIdentity(
  workspacePath: string,
): Promise<WorkspaceIdentity> {
  const existing = inflight.get(workspacePath);
  if (existing) {
    return existing;
  }

  const task = resolveWorkspaceIdentity(workspacePath).finally(() => {
    inflight.delete(workspacePath);
  });
  inflight.set(workspacePath, task);
  return task;
}
