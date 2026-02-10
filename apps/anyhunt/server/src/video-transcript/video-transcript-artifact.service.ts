/**
 * [INPUT]: 视频/音频/字幕本地文件路径
 * [OUTPUT]: R2 上传产物（fileId + publicUrl）
 * [POS]: Video Transcript 产物上传与元数据组装
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import path from 'node:path';
import { lookup as lookupMime } from 'mime-types';
import { R2Service } from '../storage/r2.service';
import { VIDEO_TRANSCRIPT_DEFAULT_VAULT_ID } from './video-transcript.constants';
import type {
  VideoTranscriptArtifacts,
  VideoTranscriptResult,
} from './video-transcript.types';

interface UploadArtifactsInput {
  userId: string;
  taskId: string;
  videoPath?: string;
  audioPath?: string;
  txtPath?: string;
  jsonPath?: string;
  srtPath?: string;
  result: VideoTranscriptResult;
}

@Injectable()
export class VideoTranscriptArtifactService {
  constructor(
    private readonly configService: ConfigService,
    private readonly r2Service: R2Service,
  ) {}

  async uploadArtifacts(
    input: UploadArtifactsInput,
  ): Promise<VideoTranscriptArtifacts> {
    const vaultId =
      this.configService.get<string>('VIDEO_TRANSCRIPT_R2_VAULT_ID') ||
      VIDEO_TRANSCRIPT_DEFAULT_VAULT_ID;

    const artifacts: VideoTranscriptArtifacts = {
      userId: input.userId,
      vaultId,
    };

    const videoInfo = await this.uploadSingleFile(
      input.userId,
      vaultId,
      input.taskId,
      'video',
      input.videoPath,
    );
    const audioInfo = await this.uploadSingleFile(
      input.userId,
      vaultId,
      input.taskId,
      'audio',
      input.audioPath,
    );
    const txtInfo = await this.uploadSingleFile(
      input.userId,
      vaultId,
      input.taskId,
      'transcript',
      input.txtPath,
    );
    const jsonInfo = await this.uploadSingleFile(
      input.userId,
      vaultId,
      input.taskId,
      'result',
      input.jsonPath,
    );
    const srtInfo = await this.uploadSingleFile(
      input.userId,
      vaultId,
      input.taskId,
      'subtitle',
      input.srtPath,
    );

    artifacts.videoFileId = videoInfo?.fileId;
    artifacts.videoUrl = videoInfo?.url;
    artifacts.audioFileId = audioInfo?.fileId;
    artifacts.audioUrl = audioInfo?.url;
    artifacts.textFileId = txtInfo?.fileId;
    artifacts.textUrl = txtInfo?.url;
    artifacts.jsonFileId = jsonInfo?.fileId;
    artifacts.jsonUrl = jsonInfo?.url;
    artifacts.srtFileId = srtInfo?.fileId;
    artifacts.srtUrl = srtInfo?.url;

    return artifacts;
  }

  private async uploadSingleFile(
    userId: string,
    vaultId: string,
    taskId: string,
    label: string,
    filePath?: string,
  ): Promise<{ fileId: string; url: string } | null> {
    if (!filePath) {
      return null;
    }

    try {
      await access(filePath);
    } catch {
      return null;
    }

    const filename = path.basename(filePath);
    const ext = path.extname(filename).replace('.', '').toLowerCase();
    const fileId = `${taskId}/${label}${ext ? `.${ext}` : ''}`;
    const statInfo = await stat(filePath);
    const contentType = lookupMime(filename) || 'application/octet-stream';

    await this.r2Service.uploadStream(
      userId,
      vaultId,
      fileId,
      createReadStream(filePath),
      contentType,
      statInfo.size,
      { filename },
    );

    return {
      fileId,
      url: this.r2Service.getPublicUrl(userId, vaultId, fileId),
    };
  }
}
