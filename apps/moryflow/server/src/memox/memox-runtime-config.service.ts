/**
 * [INPUT]: Memox / rollback baseline 环境变量
 * [OUTPUT]: 冻结后的搜索后端开关与启动期配置断言
 * [POS]: Memox Phase 2 运行时配置事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MoryflowSearchBackend = 'memox' | 'legacy_vector_baseline';

const DEFAULT_MEMOX_TIMEOUT_MS = 15_000;

@Injectable()
export class MemoxRuntimeConfigService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.getMemoxApiBaseUrl();
    this.getMemoxApiKey();
    this.getMemoxRequestTimeoutMs();
    if (this.isLegacyVectorBaselineEnabled()) {
      this.getLegacyVectorBaseUrl();
    }
  }

  getMemoxApiBaseUrl(): string {
    return this.readHttpOrigin('MEMOX_API_BASE_URL');
  }

  getMemoxApiKey(): string {
    return this.readRequired('MEMOX_API_KEY');
  }

  getMemoxRequestTimeoutMs(): number {
    const configured = this.configService.get<string>(
      'MEMOX_REQUEST_TIMEOUT_MS',
    );
    if (!configured?.trim()) {
      return DEFAULT_MEMOX_TIMEOUT_MS;
    }

    const parsed = Number(configured);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error('MEMOX_REQUEST_TIMEOUT_MS must be a positive integer');
    }

    return parsed;
  }

  getLegacyVectorBaseUrl(): string {
    return this.readHttpOrigin(
      'VECTORIZE_API_URL',
      'VECTORIZE_API_URL is required for Memox Phase 2 rollback baseline',
    );
  }

  getSearchBackend(): MoryflowSearchBackend {
    const configured = this.configService.get<string>(
      'MORYFLOW_SEARCH_BACKEND',
    );
    if (!configured?.trim()) {
      return 'memox';
    }

    if (configured !== 'memox' && configured !== 'legacy_vector_baseline') {
      throw new Error(
        'MORYFLOW_SEARCH_BACKEND must be one of: memox, legacy_vector_baseline',
      );
    }

    return configured;
  }

  isLegacyVectorBaselineEnabled(): boolean {
    return this.getSearchBackend() === 'legacy_vector_baseline';
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
