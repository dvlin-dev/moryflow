/**
 * [INPUT]: providerType
 * [OUTPUT]: UnsupportedProviderException
 * [POS]: LLM 模块自定义错误（对齐 Moryflow）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { BadRequestException } from '@nestjs/common';

export class UnsupportedProviderException extends BadRequestException {
  constructor(providerType: string) {
    super(`Unsupported provider type: ${providerType}`);
  }
}
