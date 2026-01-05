# oEmbed

> This folder structure changes require updating this document.

## Overview

oEmbed provider support for fetching embed data from various media platforms. Uses a plugin-based provider architecture.

## Responsibilities

- Fetch oEmbed data from supported providers
- Provider factory for extensible platform support
- Cache oEmbed responses
- Console UI for oEmbed management

## Constraints

- Public API uses ApiKeyGuard
- Console endpoints use SessionGuard
- Provider implementations must extend BaseProvider
- URL patterns defined in constants

## File Structure

| File                           | Type       | Description                   |
| ------------------------------ | ---------- | ----------------------------- |
| `oembed.service.ts`            | Service    | Fetch and process oEmbed data |
| `oembed.controller.ts`         | Controller | Public API `/v1/oembed`       |
| `oembed-console.controller.ts` | Controller | Console UI endpoints          |
| `oembed.module.ts`             | Module     | NestJS module definition      |
| `oembed.constants.ts`          | Constants  | Provider URLs, patterns       |
| `oembed.errors.ts`             | Errors     | Custom exceptions             |
| `oembed.types.ts`              | Types      | oEmbed response types         |

### Providers

| File                               | Platform   | Description               |
| ---------------------------------- | ---------- | ------------------------- |
| `providers/base.provider.ts`       | -          | Abstract base class       |
| `providers/provider-factory.ts`    | -          | Factory for instantiation |
| `providers/youtube.provider.ts`    | YouTube    | Video embeds              |
| `providers/vimeo.provider.ts`      | Vimeo      | Video embeds              |
| `providers/twitter.provider.ts`    | Twitter/X  | Tweet embeds              |
| `providers/spotify.provider.ts`    | Spotify    | Audio embeds              |
| `providers/soundcloud.provider.ts` | SoundCloud | Audio embeds              |

### DTOs

| File                         | Description     |
| ---------------------------- | --------------- |
| `dto/oembed-request.dto.ts`  | Request schema  |
| `dto/oembed-response.dto.ts` | Response schema |

## Provider Architecture

```
URL Input → Provider Factory → Match Provider → Fetch oEmbed → Transform Response
```

```typescript
// Adding a new provider
class NewPlatformProvider extends BaseProvider {
  readonly name = 'newplatform';
  readonly urlPattern = /newplatform\.com\/(\w+)/;

  async fetch(url: string): Promise<OembedData> {
    // Implementation
  }
}
```

## Common Modification Scenarios

| Scenario           | Files to Modify                                 | Notes                                    |
| ------------------ | ----------------------------------------------- | ---------------------------------------- |
| Add new provider   | Create `providers/*.provider.ts`                | Extend BaseProvider, register in factory |
| Change URL pattern | `oembed.constants.ts`                           | Update PROVIDER_PATTERNS                 |
| Add response field | `dto/oembed-response.dto.ts`, `oembed.types.ts` |                                          |

## Dependencies

```
oembed/
├── redis/ - Response caching
├── api-key/ - Public API auth
└── auth/ - Console auth
```

## Key Exports

```typescript
export { OembedModule } from './oembed.module';
export { OembedService } from './oembed.service';
export type { OembedData } from './oembed.types';
```
