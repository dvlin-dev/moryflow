import { describe, it, expect } from 'vitest';
import { StealthRegionService } from '../stealth/stealth-region.service';

describe('StealthRegionService', () => {
  const service = new StealthRegionService();

  describe('resolveRegion', () => {
    it('日本 TLD', () => {
      const region = service.resolveRegion('https://www.example.co.jp/path');
      expect(region).toEqual({
        locale: 'ja-JP',
        timezone: 'Asia/Tokyo',
        acceptLanguage: 'ja-JP,ja;q=0.9,en;q=0.8',
      });
    });

    it('台湾 TLD', () => {
      const region = service.resolveRegion('https://www.example.com.tw');
      expect(region).toEqual({
        locale: 'zh-TW',
        timezone: 'Asia/Taipei',
        acceptLanguage: 'zh-TW,zh;q=0.9,en;q=0.8',
      });
    });

    it('韩国 TLD', () => {
      const region = service.resolveRegion('https://www.naver.kr');
      expect(region).toEqual({
        locale: 'ko-KR',
        timezone: 'Asia/Seoul',
        acceptLanguage: 'ko-KR,ko;q=0.9,en;q=0.8',
      });
    });

    it('英国 TLD', () => {
      const region = service.resolveRegion('https://www.bbc.co.uk/news');
      expect(region).toEqual({
        locale: 'en-GB',
        timezone: 'Europe/London',
        acceptLanguage: 'en-GB,en;q=0.9',
      });
    });

    it('通用 TLD (.com) 返回 null', () => {
      expect(service.resolveRegion('https://www.google.com')).toBeNull();
    });

    it('通用 TLD (.org) 返回 null', () => {
      expect(service.resolveRegion('https://www.wikipedia.org')).toBeNull();
    });

    it('通用 TLD (.net) 返回 null', () => {
      expect(service.resolveRegion('https://www.example.net')).toBeNull();
    });

    it('无效 URL 返回 null', () => {
      expect(service.resolveRegion('not-a-url')).toBeNull();
    });

    it('未知国家级 TLD 返回 null', () => {
      expect(service.resolveRegion('https://www.example.zz')).toBeNull();
    });

    it('中国 TLD', () => {
      const region = service.resolveRegion('https://www.baidu.cn');
      expect(region).toEqual({
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.8',
      });
    });

    it('巴西复合 TLD', () => {
      const region = service.resolveRegion('https://www.example.com.br');
      expect(region).toEqual({
        locale: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        acceptLanguage: 'pt-BR,pt;q=0.9,en;q=0.8',
      });
    });
  });
});
