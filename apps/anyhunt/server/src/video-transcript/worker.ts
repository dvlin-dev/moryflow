/**
 * [INPUT]: 环境变量（PORT/HOST/VIDEO_TRANSCRIPT_*）
 * [OUTPUT]: 启动 Video Transcript worker（仅消费视频队列）
 * [POS]: 作为独立进程运行在 Mac mini / VPS2（不加载全量 AppModule，避免误消费其他队列）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { VideoTranscriptWorkerAppModule } from './video-transcript-worker-app.module';

async function bootstrap() {
  const logger = new Logger('VideoTranscriptWorker');

  // worker 进程不提供 HTTP 服务，只创建 ApplicationContext 来消费 BullMQ 队列。
  const app = await NestFactory.createApplicationContext(
    VideoTranscriptWorkerAppModule,
    {
      logger: ['log', 'warn', 'error'],
    },
  );
  app.enableShutdownHooks();

  logger.log('Video Transcript worker started');
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
