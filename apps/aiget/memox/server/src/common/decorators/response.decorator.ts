/**
 * Response Decorators
 * Custom decorators for response handling
 */

import { SetMetadata } from '@nestjs/common';
import { SKIP_RESPONSE_WRAP } from '../interceptors/response.interceptor';

/**
 * Skip response wrapping
 * Use for special cases: Health, Webhook, SSE, file downloads
 */
export const SkipResponseWrap = () => SetMetadata(SKIP_RESPONSE_WRAP, true);
