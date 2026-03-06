/**
 * [INPUT]: process.env（DB/Redis/R2 + VIDEO_TRANSCRIPT_ENABLE_*）
 * [OUTPUT]: 仅包含 Video Transcript worker 所需依赖的 NestJS App
 * [POS]: 用于 Mac mini / VPS2 等 worker 进程启动，避免加载全量 AppModule 误消费其他队列/定时任务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma';
import { RedisModule } from '../redis';
import { VideoTranscriptModule } from './video-transcript.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    VideoTranscriptModule.register({
      enableControllers: false,
    }),
  ],
})
export class VideoTranscriptWorkerAppModule {}
