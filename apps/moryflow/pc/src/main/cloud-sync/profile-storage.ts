import crypto from 'node:crypto';
import path from 'node:path';

const CLOUD_SYNC_ROOT = path.join('.moryflow', 'cloud-sync');

export const encodeProfileKeyForFs = (profileKey: string): string =>
  crypto.createHash('sha256').update(profileKey).digest('hex');

export const getCloudSyncProfileDir = (
  workspacePath: string,
  profileKey: string,
): string => path.join(workspacePath, CLOUD_SYNC_ROOT, encodeProfileKeyForFs(profileKey));

export const getCloudSyncProfileStatePath = (
  workspacePath: string,
  profileKey: string,
  filename: string,
): string => path.join(getCloudSyncProfileDir(workspacePath, profileKey), filename);
