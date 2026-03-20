import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getStoredVault } from '../../../vault.js';

const attachmentDirState: { root: string; dir: string } = { root: '', dir: '' };

const sanitizeFileName = (name?: string) => {
  if (!name || name.trim().length === 0) {
    return 'attachment';
  }
  return name.replace(/[\\/:\n\r\t]+/g, '-').slice(-64);
};

const ensureAttachmentDirectory = async () => {
  const vaultInfo = await getStoredVault();
  if (!vaultInfo) {
    throw new Error('尚未选择 Vault，无法处理附件');
  }
  const root = path.resolve(vaultInfo.path);
  const dir = path.join(root, '.moryflow', 'attachments');
  if (attachmentDirState.root !== root || attachmentDirState.dir !== dir) {
    attachmentDirState.root = root;
    attachmentDirState.dir = dir;
  }
  await mkdir(dir, { recursive: true });
  return { root, dir };
};

export const writeAttachmentToVault = async (filename: string | undefined, buffer: Buffer) => {
  const { root, dir } = await ensureAttachmentDirectory();
  const safeName = sanitizeFileName(filename);
  const filePath = path.join(dir, `${Date.now()}-${randomUUID()}-${safeName}`);
  await writeFile(filePath, buffer);
  const relative = path.relative(root, filePath).split(path.sep).join('/');
  return { absolute: filePath, relative };
};
