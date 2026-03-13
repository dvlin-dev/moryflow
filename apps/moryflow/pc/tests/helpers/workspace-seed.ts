import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export type SeedWorkspaceInput = {
  rootDir: string;
  userDataRoot: string;
  vaultName?: string;
};

export type SeededWorkspace = {
  vaultId: string;
  vaultName: string;
  vaultPath: string;
  storeDir: string;
};

export const seedWorkspace = async (input: SeedWorkspaceInput): Promise<SeededWorkspace> => {
  const vaultName = input.vaultName ?? 'E2E Vault';
  const vaultPath = path.join(input.rootDir, vaultName);
  const vaultId = randomUUID();
  const storeDir = path.join(input.userDataRoot, 'stores');

  await mkdir(vaultPath, { recursive: true });
  await mkdir(storeDir, { recursive: true });
  await writeFile(
    path.join(storeDir, 'vault-store.json'),
    JSON.stringify({
      vaults: [{ id: vaultId, path: vaultPath, name: vaultName, addedAt: Date.now() }],
      activeVaultId: vaultId,
      migrated: true,
    })
  );

  return {
    vaultId,
    vaultName,
    vaultPath,
    storeDir,
  };
};
