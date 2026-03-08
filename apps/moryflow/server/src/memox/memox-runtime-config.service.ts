/**
 * [INPUT]: Anyhunt 平台接入环境变量
 * [OUTPUT]: 冻结后的启动期配置断言
 * [POS]: Memox Phase 2 运行时配置事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_ANYHUNT_TIMEOUT_MS = 15_000;

@Injectable()
export class MemoxRuntimeConfigService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.getAnyhuntApiBaseUrl();
    this.getAnyhuntApiKey();
    this.getAnyhuntRequestTimeoutMs();
  }

  getAnyhuntApiBaseUrl(): string {
    return this.readHttpOrigin('ANYHUNT_API_BASE_URL');
  }

  getAnyhuntApiKey(): string {
    return this.readRequired('ANYHUNT_API_KEY');
  }

  getAnyhuntRequestTimeoutMs(): number {
    const configured = this.configService.get<string>(
      'ANYHUNT_REQUEST_TIMEOUT_MS',
    );
    if (!configured?.trim()) {
      return DEFAULT_ANYHUNT_TIMEOUT_MS;
    }

    const parsed = Number(configured);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error('ANYHUNT_REQUEST_TIMEOUT_MS must be a positive integer');
    }

    return parsed;
  }

  private readHttpOrigin(key: string, missingMessage?: string): string {
    const configured = this.readRequired(key, missingMessage);

    let parsed: URL;
    try {
      parsed = new URL(configured);
    } catch {
      throw new Error(`${key} must be a valid absolute URL`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`${key} must use http or https`);
    }

    if (
      parsed.pathname !== '/' ||
      parsed.search.length > 0 ||
      parsed.hash.length > 0
    ) {
      throw new Error(
        `${key} must be origin-only (for example https://server.anyhunt.app)`,
      );
    }

    return parsed.origin;
  }

  private readRequired(key: string, message?: string): string {
    const configured = this.configService.get<string>(key);
    if (!configured?.trim()) {
      throw new Error(message ?? `${key} is required`);
    }

    return configured.trim();
  }
}
