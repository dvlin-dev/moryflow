# oEmbed API

> Unified oEmbed API for embedding third-party content (Twitter, YouTube, Spotify, etc).

---

## Requirement

Provide a unified oEmbed API that proxies requests to various providers, returning standardized embed HTML and metadata.

### Supported Providers

| Provider | Endpoint | Content Types |
|----------|----------|---------------|
| Twitter/X | `https://publish.twitter.com/oembed` | Tweets, Timelines |
| YouTube | `https://www.youtube.com/oembed` | Videos |
| Vimeo | `https://vimeo.com/api/oembed.json` | Videos |
| Spotify | `https://open.spotify.com/oembed` | Tracks, Albums, Playlists |
| SoundCloud | `https://soundcloud.com/oembed` | Tracks, Playlists |

---

## Technical Design

```
POST /api/v1/oembed
  ↓
OembedController.fetch()
  ↓
OembedService.fetch()
  ├── Cache Lookup (Redis)
  ├── Identify Provider (URL pattern matching)
  └── Provider.fetch() → Upstream oEmbed API
```

---

## Core Logic

```typescript
// OembedService.fetch() - apps/server/src/oembed/oembed.service.ts
async fetch(options: OembedRequest) {
  // 1. Check cache
  const cacheKey = `oembed:${hash(options.url)}`;
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Find matching provider
  const provider = this.providers.find(p => p.matches(options.url));
  if (!provider) throw new UnsupportedProviderError(options.url);

  // 3. Fetch from upstream
  const result = await provider.fetch(options.url, {
    maxwidth: options.maxwidth,
    theme: options.theme,
  });

  // 4. Cache and return
  await this.redis.set(cacheKey, JSON.stringify(result), 'EX', provider.cacheTtl);
  return result;
}
```

```typescript
// Provider base class - apps/server/src/oembed/providers/base.provider.ts
abstract class BaseOembedProvider {
  abstract readonly name: string;
  abstract readonly patterns: RegExp[];
  abstract readonly endpoint: string;
  abstract readonly cacheTtl: number;

  matches(url: string): boolean {
    return this.patterns.some(p => p.test(url));
  }

  async fetch(url: string, options?: OembedOptions): Promise<OembedData> {
    const response = await fetch(
      `${this.endpoint}?url=${encodeURIComponent(url)}&format=json`
    );
    return response.json();
  }
}
```

---

## Request/Response

```typescript
// Request
interface OembedRequest {
  url: string;              // URL to embed
  maxwidth?: number;        // Max embed width
  maxheight?: number;       // Max embed height
  theme?: 'light' | 'dark'; // Theme (Twitter supports this)
}

// Response (oEmbed standard)
interface OembedResponse {
  type: 'photo' | 'video' | 'link' | 'rich';
  version: '1.0';
  title?: string;
  author_name?: string;
  provider_name?: string;
  html?: string;            // Embed HTML
  width?: number;
  height?: number;
  thumbnail_url?: string;
}
```

---

## URL Patterns

```typescript
// Twitter/X
/^https?:\/\/(www\.)?(twitter|x)\.com\/\w+\/status\/\d+/

// YouTube
/^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/
/^https?:\/\/youtu\.be\/[\w-]+/

// Spotify
/^https?:\/\/open\.spotify\.com\/(track|album|playlist)\/[\w]+/
```

---

## Cache Strategy

| Provider | TTL | Reason |
|----------|-----|--------|
| Twitter | 1 hour | Content may be deleted |
| YouTube | 24 hours | Stable metadata |
| Spotify | 24 hours | Stable metadata |

---

## File Locations

| Component | Path |
|-----------|------|
| Controller | `apps/server/src/oembed/oembed.controller.ts` |
| Service | `apps/server/src/oembed/oembed.service.ts` |
| Base Provider | `apps/server/src/oembed/providers/base.provider.ts` |
| Twitter | `apps/server/src/oembed/providers/twitter.provider.ts` |
| YouTube | `apps/server/src/oembed/providers/youtube.provider.ts` |

---

## SDK (Planned)

```
packages/
├── embed/           # Core client (@aiget/embed)
└── embed-react/     # React bindings (@aiget/embed-react)
```

---

*Version: 2.0 | Updated: 2026-01*
