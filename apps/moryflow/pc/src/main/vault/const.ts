import Store from 'electron-store';
import path from 'node:path';
import { z } from 'zod';

const e2eUserData = process.env['MORYFLOW_E2E_USER_DATA'];
const e2eStoreDir = e2eUserData ? path.join(e2eUserData, 'stores') : undefined;

export const vaultPreferenceStore = new Store<{ recentVaultPath: string | null }>({
  name: 'pc-settings',
  ...(e2eStoreDir ? { cwd: e2eStoreDir } : {}),
  defaults: { recentVaultPath: null },
});

export const vaultOpenSchema = z.object({
  askUser: z.boolean().optional(),
});

export const vaultCreateSchema = z.object({
  name: z.string().min(1),
  parentPath: z.string().min(1),
});

export const readTreeSchema = z.object({
  path: z.string().min(1),
});

export const fileReadSchema = z.object({
  path: z.string().min(1),
});

export const fileWriteSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  clientMtime: z.number().optional(),
});

export const fileCreateSchema = z.object({
  parentPath: z.string().min(1),
  name: z.string().min(1),
  template: z.string().optional(),
});

export const folderCreateSchema = z.object({
  parentPath: z.string().min(1),
  name: z.string().min(1),
});

export const renameSchema = z.object({
  path: z.string().min(1),
  nextName: z.string().min(1),
});

export const moveSchema = z.object({
  path: z.string().min(1),
  targetDir: z.string().min(1),
});

export const deleteSchema = z.object({
  path: z.string().min(1),
});

export const showInFinderSchema = z.object({
  path: z.string().min(1),
});
