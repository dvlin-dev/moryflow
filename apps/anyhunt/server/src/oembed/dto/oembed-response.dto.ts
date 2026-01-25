/**
 * oEmbed 响应 DTO
 */
import type { OembedData } from '../oembed.types';

/** API 响应 */
export interface OembedResponse {
  data: OembedData;
  meta: {
    provider: string;
    cached: boolean;
  };
}
