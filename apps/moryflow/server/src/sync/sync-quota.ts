/**
 * [PROVIDES]: computeUploadQuotaStats（上传体积与增量计算）
 * [DEPENDS]: sync-diff types
 * [POS]: 云同步额度计算纯函数
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { SyncActionDto, LocalFileDto } from './dto';
import type { RemoteFile } from './sync-diff';

export interface UploadQuotaStats {
  uploadSizes: number[];
  totalNewSize: number;
}

export const computeUploadQuotaStats = (
  localFiles: LocalFileDto[],
  remoteFiles: RemoteFile[],
  actions: SyncActionDto[],
): UploadQuotaStats => {
  if (actions.length === 0) {
    return { uploadSizes: [], totalNewSize: 0 };
  }

  const localMap = new Map(localFiles.map((f) => [f.fileId, f]));
  const remoteMap = new Map(remoteFiles.map((f) => [f.id, f]));

  const uploadSizes: number[] = [];
  let totalNewSize = 0;

  for (const action of actions) {
    if (action.action === 'upload') {
      const local = localMap.get(action.fileId);
      if (!local) continue;
      uploadSizes.push(local.size);
      const existingSize = remoteMap.get(action.fileId)?.size ?? 0;
      const diff = local.size - existingSize;
      if (diff > 0) totalNewSize += diff;
      continue;
    }

    if (action.action === 'conflict') {
      const local = localMap.get(action.fileId);
      const remote = remoteMap.get(action.fileId);
      const localSize = local?.size ?? 0;
      const remoteSize = remote?.size ?? 0;

      uploadSizes.push(localSize);
      uploadSizes.push(remoteSize);

      // 冲突会新增一份本地文件（覆盖远端）+ 一份远端冲突副本，总增量=本地文件大小
      totalNewSize += localSize;
    }
  }

  return { uploadSizes, totalNewSize };
};
