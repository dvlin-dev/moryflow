# oEmbed API 技术方案

## 一、需求概述

### 1.1 背景

用户在使用 memory 截图服务时，除了网页截图外，还有嵌入第三方内容（如 Twitter 推文、YouTube 视频、Spotify 音乐等）的需求。oEmbed 是一种开放标准（[oembed.com](https://oembed.com/)），允许第三方网站通过 URL 获取嵌入式内容的 HTML 代码和元数据。

### 1.2 目标

提供统一的 oEmbed API 接口，支持主流平台的内容嵌入，作为截图服务的增值功能。

### 1.3 功能范围

#### 支持的平台（无需认证，可直接调用）

| 平台 | 官方 oEmbed Endpoint | 支持内容类型 |
|------|---------------------|-------------|
| Twitter/X | `https://publish.twitter.com/oembed` | 推文、时间线 |
| YouTube | `https://www.youtube.com/oembed` | 视频 |
| Vimeo | `https://vimeo.com/api/oembed.json` | 视频 |
| Spotify | `https://open.spotify.com/oembed` | 歌曲、专辑、播放列表、播客 |
| SoundCloud | `https://soundcloud.com/oembed` | 音轨、播放列表 |

#### 不支持的平台（需企业资质审核）

| 平台 | 原因 |
|------|------|
| Facebook | 需要注册企业账号并通过审核 |
| Instagram | 需要注册企业账号并通过审核 |

### 1.4 使用场景

1. **链接预览卡片** - 在笔记、文档应用中展示第三方内容预览
2. **内容聚合** - 聚合多平台内容到统一界面
3. **社交媒体嵌入** - 在网页中嵌入推文、视频等内容

---

## 二、技术方案

### 2.1 API 设计

#### 请求

```
POST /api/oembed
Content-Type: application/json
Authorization: Bearer <api_key>
```

```typescript
interface OembedRequest {
  url: string;                      // 必填，要获取 oEmbed 数据的 URL
  maxwidth?: number;                // 可选，最大宽度（部分类型支持）
  maxheight?: number;               // 可选，最大高度（部分类型支持）
  format?: 'json';                  // 可选，响应格式（仅支持 JSON，保持现代 API 风格）
  theme?: 'light' | 'dark';         // 扩展，主题（部分平台支持，如 Twitter）
}
```

> **与官方规范的差异说明：**
> - 官方规范使用 GET 请求 + Query 参数，我们使用 POST + JSON Body，更符合现代 API 设计
> - 官方规范支持 JSON/XML 两种格式，我们仅支持 JSON（现代化选择）
> - `theme` 是我们的扩展参数，用于支持深色模式（如 Twitter 的 `theme=dark`）

#### 响应

```typescript
// 标准 oEmbed 响应格式
interface OembedResponse {
  // 基础字段
  type: 'photo' | 'video' | 'link' | 'rich';
  version: '1.0';

  // 可选字段
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  provider_url?: string;
  cache_age?: number;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;

  // photo 类型
  url?: string;          // 图片 URL
  width?: number;
  height?: number;

  // video/rich 类型
  html?: string;         // 嵌入 HTML 代码
  width?: number;
  height?: number;
}
```

#### 错误响应

```typescript
interface OembedErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
```

| HTTP 状态码 | 错误码 | 说明 |
|-------------|--------|------|
| 400 | `INVALID_URL` | URL 格式无效或为空 |
| 404 | `NOT_FOUND` | 上游平台未找到该资源（可能已删除） |
| 400 | `UNSUPPORTED_PROVIDER` | 不支持该平台 |
| 502 | `PROVIDER_ERROR` | 上游平台返回错误 |
| 429 | `RATE_LIMITED` | 请求频率超限 |
| 501 | `FORMAT_NOT_SUPPORTED` | 请求了不支持的格式（如 XML） |

> **HTTP 状态码对齐官方规范：**
> - 404：对应规范的 "provider has no response for the requested url"
> - 501：对应规范的 "cannot return a response in the requested format"
> - 429：扩展，用于限流场景

### 2.2 目录结构

```
apps/server/src/oembed/
├── oembed.module.ts           # 模块定义
├── oembed.controller.ts       # 控制器
├── oembed.service.ts          # 核心服务
├── oembed.types.ts            # 类型定义
├── oembed.constants.ts        # 常量定义
├── providers/                 # 平台适配器
│   ├── base.provider.ts       # 基类
│   ├── twitter.provider.ts
│   ├── youtube.provider.ts
│   ├── vimeo.provider.ts
│   ├── spotify.provider.ts
│   └── soundcloud.provider.ts
└── dto/
    ├── oembed-request.dto.ts
    └── oembed-response.dto.ts
```

### 2.3 核心流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         请求流程                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client Request                                                 │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐                                                │
│  │ Controller  │  验证请求参数                                   │
│  └──────┬──────┘                                                │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐     ┌─────────────┐                            │
│  │   Service   │────▶│ Redis Cache │  检查缓存                   │
│  └──────┬──────┘     └─────────────┘                            │
│         │                                                       │
│         │ cache miss                                            │
│         ▼                                                       │
│  ┌─────────────┐                                                │
│  │ URL Parser  │  识别平台类型                                   │
│  └──────┬──────┘                                                │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────┐                    │
│  │            Provider Factory             │                    │
│  ├─────────┬─────────┬─────────┬──────────┤                    │
│  │ Twitter │ YouTube │  Vimeo  │ Spotify  │ ...                │
│  └────┬────┴────┬────┴────┬────┴────┬─────┘                    │
│       │         │         │         │                           │
│       └─────────┴─────────┴─────────┘                           │
│                     │                                           │
│                     ▼                                           │
│              ┌─────────────┐                                    │
│              │ 上游 API 请求│                                    │
│              └──────┬──────┘                                    │
│                     │                                           │
│                     ▼                                           │
│              ┌─────────────┐                                    │
│              │ 响应标准化   │                                    │
│              └──────┬──────┘                                    │
│                     │                                           │
│                     ▼                                           │
│              ┌─────────────┐                                    │
│              │ 写入缓存    │                                    │
│              └──────┬──────┘                                    │
│                     │                                           │
│                     ▼                                           │
│                  Response                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Provider 设计

#### 基类

```typescript
// providers/base.provider.ts
export abstract class BaseOembedProvider {
  abstract readonly name: string;
  abstract readonly patterns: RegExp[];

  // 检查 URL 是否匹配该 provider
  matches(url: string): boolean {
    return this.patterns.some(pattern => pattern.test(url));
  }

  // 获取 oEmbed 数据
  abstract fetch(url: string, options?: OembedOptions): Promise<OembedData>;

  // 构建上游请求 URL
  protected abstract buildEndpoint(url: string, options?: OembedOptions): string;
}
```

#### 各平台 URL 匹配规则

```typescript
// Twitter/X
const TWITTER_PATTERNS = [
  /^https?:\/\/(www\.)?(twitter|x)\.com\/\w+\/status\/\d+/,
  /^https?:\/\/(www\.)?(twitter|x)\.com\/\w+\/timelines\/\d+/,
];

// YouTube
const YOUTUBE_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
  /^https?:\/\/youtu\.be\/[\w-]+/,
  /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
  /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
];

// Vimeo
const VIMEO_PATTERNS = [
  /^https?:\/\/(www\.)?vimeo\.com\/\d+/,
  /^https?:\/\/(www\.)?vimeo\.com\/channels\/[\w-]+\/\d+/,
];

// Spotify
const SPOTIFY_PATTERNS = [
  /^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode|show)\/[\w]+/,
];

// SoundCloud
const SOUNDCLOUD_PATTERNS = [
  /^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/,
];
```

### 2.5 缓存策略

| 平台 | 缓存时间 | 说明 |
|------|---------|------|
| Twitter | 1 小时 | 推文内容可能被删除 |
| YouTube | 24 小时 | 视频信息相对稳定 |
| Vimeo | 24 小时 | 视频信息相对稳定 |
| Spotify | 24 小时 | 音乐信息相对稳定 |
| SoundCloud | 24 小时 | 音频信息相对稳定 |

缓存 Key 格式：`oembed:{provider}:{url_hash}`

### 2.6 限流策略

复用现有的 API Key 限流机制，oEmbed 请求计入用户配额。

### 2.7 错误处理

1. **上游超时** - 默认 10 秒超时，返回 `PROVIDER_ERROR`
2. **上游 404** - 返回 `INVALID_URL`（内容可能已删除）
3. **上游限流** - 返回 `RATE_LIMITED`，建议稍后重试

---

## 三、执行计划

### Step 1: 基础架构搭建

创建模块基础文件：

- [ ] `oembed.module.ts` - 模块定义
- [ ] `oembed.controller.ts` - 控制器（路由 `/api/oembed`）
- [ ] `oembed.service.ts` - 核心服务
- [ ] `oembed.types.ts` - 类型定义
- [ ] `oembed.constants.ts` - 常量（缓存时间、错误码等）
- [ ] `dto/oembed-request.dto.ts` - 请求 DTO
- [ ] `dto/oembed-response.dto.ts` - 响应 DTO

### Step 2: Provider 基类实现

- [ ] `providers/base.provider.ts` - 抽象基类
- [ ] URL 匹配逻辑
- [ ] 通用 HTTP 请求封装
- [ ] 响应标准化逻辑

### Step 3: 各平台 Provider 实现

按优先级顺序：

- [ ] `providers/twitter.provider.ts` - Twitter/X 适配器
- [ ] `providers/youtube.provider.ts` - YouTube 适配器
- [ ] `providers/vimeo.provider.ts` - Vimeo 适配器
- [ ] `providers/spotify.provider.ts` - Spotify 适配器
- [ ] `providers/soundcloud.provider.ts` - SoundCloud 适配器

### Step 4: 缓存集成

- [ ] 集成现有 Redis 缓存
- [ ] 实现缓存读写逻辑
- [ ] 配置各平台缓存时间

### Step 5: 模块注册与测试

- [ ] 在 `app.module.ts` 中注册 `OembedModule`
- [ ] 编写单元测试
- [ ] 编写 E2E 测试
- [ ] 手动测试各平台 URL

### Step 6: 文档与上线

- [ ] 更新 API 文档
- [ ] 添加使用示例
- [ ] 灰度发布

---

## 四、风险与注意事项

### 4.1 潜在风险

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| 上游 API 变更 | 功能失效 | 监控告警 + 及时修复 |
| 上游限流 | 请求失败 | 合理缓存 + 用户侧限流 |
| CORS 问题 | 前端无法直接调用上游 | 服务端代理（已解决） |

### 4.2 注意事项

1. **Twitter 主题参数** - 支持 `theme=dark` 参数，需在请求时传递
2. **Spotify 尺寸** - 有 `compact` 和 `normal` 两种尺寸
3. **URL 规范化** - 部分平台需要去除 URL 中的 query 参数
4. **HTML 安全** - 返回的 HTML 仅来自可信的上游平台，但前端嵌入时仍需注意 XSS

---

## 五、Embed SDK 组件包规划

### 5.1 概述

为了完成从 API 调用到前端嵌入的完整链路闭环，计划发布 `@memory/embed-*` 系列 SDK，让开发者可以一行代码嵌入 oEmbed 内容。

### 5.2 包架构

```
packages/
├── embed/                    # 核心包（框架无关）
│   │                         # @memory/embed
│   ├── package.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── client.ts         # API 客户端
│   │   ├── types.ts          # 类型定义
│   │   ├── utils.ts          # 工具函数
│   │   └── providers/        # URL 解析器
│   │       ├── index.ts
│   │       ├── twitter.ts
│   │       ├── youtube.ts
│   │       └── spotify.ts
│   └── README.md
│
├── embed-react/              # React 绑定
│   │                         # @memory/embed-react
│   ├── package.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── components/
│   │   │   ├── Embed.tsx            # 通用嵌入组件
│   │   │   ├── EmbedProvider.tsx    # Context Provider
│   │   │   ├── Tweet.tsx            # Twitter 推文
│   │   │   ├── YouTube.tsx          # YouTube 视频
│   │   │   ├── Spotify.tsx          # Spotify 播放器
│   │   │   └── Skeleton.tsx         # 加载骨架屏
│   │   └── hooks/
│   │       ├── useEmbed.ts          # 数据获取 Hook
│   │       └── useEmbedConfig.ts    # 配置 Hook
│   └── README.md
│
├── embed-vue/                # Vue 绑定（未来）
│                             # @memory/embed-vue
│
└── embed-vanilla/            # 原生 JS（未来）
                              # @memory/embed-vanilla
```

### 5.3 核心包 API（@memory/embed）

```typescript
import { createEmbedClient, type EmbedData } from '@memory/embed';

// 创建客户端
const client = createEmbedClient({
  apiKey: 'mk_your_api_key',
  baseUrl: 'https://api.memory.dev', // 可选
});

// 获取嵌入数据
const data: EmbedData = await client.fetch('https://twitter.com/elonmusk/status/123456', {
  maxWidth: 550,
  theme: 'dark',
});

console.log(data.html);  // 嵌入 HTML
console.log(data.type);  // 'rich' | 'video' | 'photo' | 'link'
```

### 5.4 React 绑定 API（@memory/embed-react）

#### Provider 配置

```tsx
import { EmbedProvider } from '@memory/embed-react';

function App() {
  return (
    <EmbedProvider
      apiKey="mk_your_api_key"
      baseUrl="https://api.memory.dev"  // 可选
      theme="light"                        // 可选，全局主题
    >
      <YourApp />
    </EmbedProvider>
  );
}
```

#### 通用嵌入组件

```tsx
import { Embed } from '@memory/embed-react';

// 自动识别 URL 类型并渲染
<Embed
  url="https://twitter.com/elonmusk/status/123456"
  maxWidth={550}
  theme="dark"
  fallback={<div>Loading...</div>}
  onLoad={(data) => console.log(data)}
  onError={(error) => console.error(error)}
/>
```

#### 专用组件

```tsx
import { Tweet, YouTube, Spotify } from '@memory/embed-react';

// Twitter 推文
<Tweet id="123456" theme="dark" />

// YouTube 视频
<YouTube videoId="dQw4w9WgXcQ" autoplay={false} />

// Spotify 播放器
<Spotify uri="spotify:track:4uLU6hMCjMI75M1A2tKUQC" compact />
```

#### Hook 用法

```tsx
import { useEmbed } from '@memory/embed-react';

function CustomEmbed({ url }: { url: string }) {
  const { data, loading, error } = useEmbed(url, {
    maxWidth: 600,
    theme: 'light',
  });

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div
      className="embed-container"
      dangerouslySetInnerHTML={{ __html: data.html }}
    />
  );
}
```

### 5.5 功能特性

| 功能 | @memory/embed | @memory/embed-react |
|------|-----------------|----------------------|
| API 客户端 | ✅ | ✅（内置） |
| TypeScript 类型 | ✅ | ✅ |
| URL 自动识别 | ✅ | ✅ |
| React 组件 | - | ✅ |
| Hooks | - | ✅ |
| 加载骨架屏 | - | ✅ |
| 响应式布局 | - | ✅ |
| 主题切换 | ✅ | ✅ |
| SSR 支持 | ✅ | ✅ |
| Tree Shaking | ✅ | ✅ |

### 5.6 依赖关系

```
@memory/embed           # 核心包，零依赖
├── (无外部依赖)

@memory/embed-react     # React 绑定
├── @memory/embed (dep)
├── react >= 18.0.0 (peerDep)
└── react-dom >= 18.0.0 (peerDep)

@memory/embed-vue       # Vue 绑定（未来）
├── @memory/embed (dep)
└── vue >= 3.0.0 (peerDep)
```

### 5.7 实现优先级

#### Phase 1：核心包（@memory/embed）

- [ ] `createEmbedClient` API 客户端
- [ ] TypeScript 类型定义
- [ ] URL 提供商识别
- [ ] 错误处理

#### Phase 2：React 绑定（@memory/embed-react）

- [ ] `EmbedProvider` 配置组件
- [ ] `useEmbed` 数据获取 Hook
- [ ] `Embed` 通用嵌入组件
- [ ] `Skeleton` 加载骨架屏

#### Phase 3：专用组件

- [ ] `Tweet` Twitter 推文组件
- [ ] `YouTube` 视频组件
- [ ] `Spotify` 播放器组件
- [ ] 响应式布局支持

#### Phase 4：生态扩展

- [ ] Next.js App Router 适配
- [ ] Vue 绑定（@memory/embed-vue）
- [ ] Storybook 文档
- [ ] npm 发布

---

## 六、参考资料

- [oEmbed 规范](https://oembed.com/)
- [Twitter oEmbed API](https://developer.x.com/en/docs/x-for-websites/oembed-api)
- [YouTube oEmbed](https://developers.google.com/youtube/oembed)
- [Vimeo oEmbed](https://developer.vimeo.com/api/oembed)
- [Spotify oEmbed](https://developer.spotify.com/documentation/embeds/tutorials/using-the-oembed-api)
- [SoundCloud oEmbed](https://developers.soundcloud.com/docs/oembed)
