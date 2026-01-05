/**
 * oEmbed 响应 DTO
 */
import type { OembedData } from '../oembed.types';

/** API 成功响应 */
export interface OembedSuccessResponse {
  success: true;
  data: OembedData;
  meta: {
    provider: string;
    cached: boolean;
  };
}
