/**
 * [INPUT]: providerType
 * [OUTPUT]: UnsupportedProviderException
 * [POS]: LLM 模块自定义错误（对齐 Moryflow）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { BadRequestException } from '@nestjs/common';

export class UnsupportedProviderException extends BadRequestException {
  constructor(providerType: string) {
    super(`Unsupported provider type: ${providerType}`);
  }
}
