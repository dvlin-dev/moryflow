import { SetMetadata } from '@nestjs/common';
import { SKIP_RESPONSE_WRAP } from '../interceptors/response.interceptor';

/**
 * 跳过响应包装
 * 用于 Health、Webhook 回调、SSE、文件下载等特殊场景
 */
export const SkipResponseWrap = () => SetMetadata(SKIP_RESPONSE_WRAP, true);
