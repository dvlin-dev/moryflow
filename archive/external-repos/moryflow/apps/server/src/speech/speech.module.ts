/**
 * Speech Module
 * 语音转录服务模块
 */

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { StorageModule } from '../storage';
import { STTClient } from './stt.client';
import { TextRefinerService } from './text-refiner.service';
import { SpeechService } from './speech.service';
import { SpeechController } from './speech.controller';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [SpeechController],
  providers: [STTClient, TextRefinerService, SpeechService],
  exports: [SpeechService],
})
export class SpeechModule {}
