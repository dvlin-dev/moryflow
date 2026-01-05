/**
 * [INPUT]: URL string to validate
 * [OUTPUT]: Boolean - whether URL is allowed for scraping
 * [POS]: SSRF protection - blocks private IPs, localhost, cloud metadata endpoints
 *
 * [PROTOCOL]: When this file changes, update this header and src/common/CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UrlValidator {
  // 禁止访问的 IP 范围（SSRF 防护）
  private readonly BLOCKED_IP_RANGES = [
    /^127\./, // localhost
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^0\./, // 0.0.0.0/8
    /^169\.254\./, // link-local
    /^::1$/, // IPv6 localhost
    /^fc00:/i, // IPv6 private
    /^fe80:/i, // IPv6 link-local
  ];

  // 禁止访问的域名
  private readonly BLOCKED_DOMAINS = [
    'localhost',
    'metadata.google.internal',
    '169.254.169.254', // AWS/GCP metadata
  ];

  // 允许的协议
  private readonly ALLOWED_PROTOCOLS = ['http:', 'https:'];

  constructor(private config: ConfigService) {}

  /**
   * 验证 URL 是否允许访问
   */
  isAllowed(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // 1. 检查协议
      if (!this.ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
        return false;
      }

      // 2. 检查域名黑名单
      const hostname = urlObj.hostname.toLowerCase();
      if (
        this.BLOCKED_DOMAINS.some(
          (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
        )
      ) {
        return false;
      }

      // 3. 检查 IP 范围
      for (const pattern of this.BLOCKED_IP_RANGES) {
        if (pattern.test(hostname)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证 URL 格式是否有效
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
