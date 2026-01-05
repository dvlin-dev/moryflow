/**
 * Provider 工厂 - 根据 URL 获取对应的 Provider
 */
import { Injectable } from '@nestjs/common';
import { BaseOembedProvider } from './base.provider';
import { TwitterProvider } from './twitter.provider';
import { YouTubeProvider } from './youtube.provider';
import { VimeoProvider } from './vimeo.provider';
import { SpotifyProvider } from './spotify.provider';
import { SoundCloudProvider } from './soundcloud.provider';

@Injectable()
export class ProviderFactory {
  private readonly providers: BaseOembedProvider[];

  constructor() {
    // 按优先级顺序注册 Providers
    this.providers = [
      new TwitterProvider(),
      new YouTubeProvider(),
      new VimeoProvider(),
      new SpotifyProvider(),
      new SoundCloudProvider(),
    ];
  }

  /** 根据 URL 获取匹配的 Provider */
  getProvider(url: string): BaseOembedProvider | null {
    return this.providers.find((p) => p.matches(url)) ?? null;
  }

  /** 获取所有已注册的 Provider 名称 */
  getProviderNames(): string[] {
    return this.providers.map((p) => p.name);
  }
}
