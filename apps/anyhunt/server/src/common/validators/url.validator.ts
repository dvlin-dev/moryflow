/**
 * [INPUT]: URL string to validate
 * [OUTPUT]: Boolean - whether URL is allowed for external network access
 * [POS]: SSRF protection - blocks private IPs, localhost, metadata endpoints, IPv6 literals
 *
 * [PROTOCOL]: When this file changes, update this header and src/common/CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import * as ipaddr from 'ipaddr.js';

@Injectable()
export class UrlValidator {
  private readonly ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
  private readonly BLOCKED_DOMAINS = new Set([
    'localhost',
    'metadata.google.internal',
  ]);
  private readonly BLOCKED_DOMAIN_SUFFIXES = [
    '.localhost',
    '.local',
    '.internal',
  ];
  private readonly DNS_TIMEOUT_MS = 3000;
  private readonly CACHE_TTL_MS = 60_000;
  private readonly cache = new Map<
    string,
    { allowed: boolean; expiresAt: number }
  >();

  /**
   * 验证 URL 是否允许访问
   */
  async isAllowed(url: string): Promise<boolean> {
    const urlObj = this.parseUrl(url);
    if (!urlObj) return false;

    if (!this.ALLOWED_PROTOCOLS.has(urlObj.protocol)) {
      return false;
    }

    if (urlObj.username || urlObj.password) {
      return false;
    }

    const hostname = this.normalizeHostname(urlObj.hostname);
    if (!hostname) {
      return false;
    }

    if (this.isBlockedDomain(hostname)) {
      return false;
    }

    const cached = this.getCachedResult(hostname);
    if (cached !== null) {
      return cached;
    }

    const addresses = await this.resolveHost(hostname);
    if (addresses.length === 0) {
      this.setCachedResult(hostname, false);
      return false;
    }

    const isAllowed = addresses.every((address) => this.isPublicIp(address));
    this.setCachedResult(hostname, isAllowed);
    return isAllowed;
  }

  private parseUrl(url: string): URL | null {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  }

  private normalizeHostname(hostname: string): string {
    const normalized = hostname.trim().toLowerCase().replace(/\.$/, '');
    if (!normalized) return '';
    const unbracketed =
      normalized.startsWith('[') && normalized.endsWith(']')
        ? normalized.slice(1, -1)
        : normalized;
    if (!unbracketed) return '';
    const zoneIndex = unbracketed.indexOf('%');
    return zoneIndex === -1 ? unbracketed : unbracketed.slice(0, zoneIndex);
  }

  private isBlockedDomain(hostname: string): boolean {
    if (this.BLOCKED_DOMAINS.has(hostname)) {
      return true;
    }
    return this.BLOCKED_DOMAIN_SUFFIXES.some((suffix) =>
      hostname.endsWith(suffix),
    );
  }

  private getCachedResult(hostname: string): boolean | null {
    const cached = this.cache.get(hostname);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      this.cache.delete(hostname);
      return null;
    }
    return cached.allowed;
  }

  private setCachedResult(hostname: string, allowed: boolean): void {
    this.cache.set(hostname, {
      allowed,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
  }

  private async resolveHost(hostname: string): Promise<string[]> {
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      const lookupPromise = lookup(hostname, { all: true, verbatim: true });
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('DNS lookup timeout')),
          this.DNS_TIMEOUT_MS,
        );
      });

      const results = await Promise.race([lookupPromise, timeoutPromise]);
      return results.map((entry) => entry.address);
    } catch {
      return [];
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private isPublicIp(address: string): boolean {
    if (!ipaddr.isValid(address)) {
      return false;
    }

    const parsed = ipaddr.parse(address);

    if (this.isIpv6Address(parsed) && parsed.isIPv4MappedAddress()) {
      const ipv4 = parsed.toIPv4Address().toString();
      return this.isPublicIp(ipv4);
    }

    return parsed.range() === 'unicast';
  }

  private isIpv6Address(
    address: ipaddr.IPv4 | ipaddr.IPv6,
  ): address is ipaddr.IPv6 {
    return address.kind() === 'ipv6';
  }
}
