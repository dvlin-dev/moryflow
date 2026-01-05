/**
 * Browser 模块
 *
 * 提供 Playwright 浏览器实例池管理，作为通用基础设施供其他模块复用。
 * 使用场景：screenshot（截图）、automation（智能化操作）等
 */

import { Module, Global } from '@nestjs/common';
import { BrowserPool } from './browser-pool';

@Global()
@Module({
  providers: [BrowserPool],
  exports: [BrowserPool],
})
export class BrowserModule {}
