/**
 * [DEFINES]: 视频转写模块自定义错误
 * [USED_BY]: video-transcript.service.ts, processors
 * [POS]: Video Transcript 错误边界
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { HttpException, HttpStatus } from '@nestjs/common';

export enum VideoTranscriptErrorCode {
  TASK_NOT_FOUND = 'VIDEO_TRANSCRIPT_TASK_NOT_FOUND',
  INVALID_URL = 'VIDEO_TRANSCRIPT_INVALID_URL',
  UNSUPPORTED_PLATFORM = 'VIDEO_TRANSCRIPT_UNSUPPORTED_PLATFORM',
  TASK_NOT_CANCELLABLE = 'VIDEO_TRANSCRIPT_TASK_NOT_CANCELLABLE',
}

export class VideoTranscriptTaskNotFoundError extends HttpException {
  constructor(taskId: string) {
    super(
      {
        code: VideoTranscriptErrorCode.TASK_NOT_FOUND,
        message: `Video transcript task not found: ${taskId}`,
        details: { taskId },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidVideoSourceUrlError extends HttpException {
  constructor(url: string) {
    super(
      {
        code: VideoTranscriptErrorCode.INVALID_URL,
        message: 'Invalid video source URL',
        details: { url },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class UnsupportedVideoPlatformError extends HttpException {
  constructor(url: string) {
    super(
      {
        code: VideoTranscriptErrorCode.UNSUPPORTED_PLATFORM,
        message:
          'Unsupported platform. Supported platforms: Douyin, Bilibili, Xiaohongshu, YouTube',
        details: { url },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class VideoTranscriptPreemptedError extends Error {
  constructor(taskId: string) {
    super(`Video transcript task preempted: ${taskId}`);
    this.name = 'VideoTranscriptPreemptedError';
  }
}
