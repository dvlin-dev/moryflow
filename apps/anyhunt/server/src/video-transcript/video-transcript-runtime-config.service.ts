/**
 * [INPUT]: 环境变量默认值 + Redis runtime override
 * [OUTPUT]: Video Transcript 运行时配置快照（LOCAL 开关）
 * [POS]: Video Transcript 运行时配置服务（用于任务路由与 Admin 开关）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import {
  VIDEO_TRANSCRIPT_LOCAL_ENABLED_OVERRIDE_KEY,
  parseBooleanEnv,
} from './video-transcript.constants';

export interface VideoTranscriptRuntimeConfigSnapshot {
  localEnabled: boolean;
  source: 'env' | 'override';
  overrideRaw: string | null;
}

@Injectable()
export class VideoTranscriptRuntimeConfigService {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async getSnapshot(): Promise<VideoTranscriptRuntimeConfigSnapshot> {
    const overrideRaw = await this.redisService.get(
      VIDEO_TRANSCRIPT_LOCAL_ENABLED_OVERRIDE_KEY,
    );
    const overrideValue = this.parseOverrideBoolean(overrideRaw);

    if (overrideValue !== null) {
      return {
        localEnabled: overrideValue,
        source: 'override',
        overrideRaw,
      };
    }

    return {
      localEnabled: this.getEnvDefault(),
      source: 'env',
      overrideRaw,
    };
  }

  async setLocalEnabledOverride(enabled: boolean): Promise<void> {
    await this.redisService.set(
      VIDEO_TRANSCRIPT_LOCAL_ENABLED_OVERRIDE_KEY,
      enabled ? 'true' : 'false',
    );
  }

  private getEnvDefault(): boolean {
    return parseBooleanEnv(
      this.configService.get<string>('VIDEO_TRANSCRIPT_LOCAL_ENABLED'),
      true,
    );
  }

  private parseOverrideBoolean(value: string | null): boolean | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
    return null;
  }
}
