/**
 * [INPUT]: Video Transcript API 请求 + BullMQ 队列任务
 * [OUTPUT]: App API 与 LOCAL/CLOUD_FALLBACK Worker 能力
 * [POS]: Video Transcript 模块定义（支持按环境变量启停 worker）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { parseBooleanEnv } from './video-transcript.constants';
import { QueueModule } from '../queue';
import { VideoTranscriptController } from './video-transcript.controller';
import { VideoTranscriptAdminController } from './video-transcript-admin.controller';
import { VideoTranscriptService } from './video-transcript.service';
import { VideoTranscriptExecutorService } from './video-transcript-executor.service';
import { VideoTranscriptArtifactService } from './video-transcript-artifact.service';
import { VideoTranscriptCommandService } from './video-transcript-command.service';
import { VideoTranscriptBudgetService } from './video-transcript-budget.service';
import { VideoTranscriptHeartbeatService } from './video-transcript-heartbeat.service';
import { VideoTranscriptFallbackScannerService } from './video-transcript-fallback-scanner.service';
import { VideoTranscriptRuntimeConfigService } from './video-transcript-runtime-config.service';
import { VideoTranscriptLocalProcessor } from './video-transcript-local.processor';
import { VideoTranscriptCloudFallbackProcessor } from './video-transcript-cloud-fallback.processor';
import { VideoTranscriptAdminService } from './video-transcript-admin.service';

@Module({})
export class VideoTranscriptModule {
  static register(): DynamicModule {
    const enableLocalWorker = parseBooleanEnv(
      process.env.VIDEO_TRANSCRIPT_ENABLE_LOCAL_WORKER,
      true,
    );
    const enableCloudWorker = parseBooleanEnv(
      process.env.VIDEO_TRANSCRIPT_ENABLE_CLOUD_FALLBACK_WORKER,
      true,
    );
    const enableFallbackScanner = parseBooleanEnv(
      process.env.VIDEO_TRANSCRIPT_ENABLE_FALLBACK_SCANNER,
      !enableLocalWorker && !enableCloudWorker,
    );

    const workerProviders: Provider[] = [
      ...(enableLocalWorker ? [VideoTranscriptLocalProcessor] : []),
      ...(enableCloudWorker ? [VideoTranscriptCloudFallbackProcessor] : []),
    ];
    const scannerProviders: Provider[] = enableFallbackScanner
      ? [VideoTranscriptFallbackScannerService]
      : [];

    return {
      module: VideoTranscriptModule,
      imports: [QueueModule, StorageModule],
      controllers: [VideoTranscriptController, VideoTranscriptAdminController],
      providers: [
        VideoTranscriptService,
        VideoTranscriptExecutorService,
        VideoTranscriptArtifactService,
        VideoTranscriptCommandService,
        VideoTranscriptBudgetService,
        VideoTranscriptHeartbeatService,
        VideoTranscriptRuntimeConfigService,
        VideoTranscriptAdminService,
        ...scannerProviders,
        ...workerProviders,
      ],
      exports: [VideoTranscriptService, VideoTranscriptRuntimeConfigService],
    };
  }
}
