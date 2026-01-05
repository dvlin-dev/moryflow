# 图片生成 API

## 需求

新增图片生成路由 `/v1/images/generations`，支持多 Provider：
- OpenAI (`gpt-image-1.5`)
- Fal.ai (`seedream-4.5`)
- Google Gemini (via OpenRouter)

## 技术方案

### 架构

```
ImageController
    │ POST /v1/images/generations
    ▼
ImageService
    │ 模型验证、权限检查、积分扣除
    ▼
ImageProviderFactory
    │ 根据 Provider 类型创建适配器
    ├─────────┼─────────┐
    ▼         ▼         ▼
 OpenAI    Fal.ai   OpenRouter
Provider  Provider   Provider
```

### 请求/响应格式

```typescript
// 请求
interface ImageGenerationRequest {
  model: string       // gpt-image-1.5 | seedream-4.5
  prompt: string
  n?: number          // 生成数量
  size?: string       // 1024x1024 | square_hd | ...
  quality?: string    // low | medium | high
  // Provider 专属参数...
}

// 响应
interface ImageGenerationResponse {
  created: number
  data: Array<{
    url?: string
    b64_json?: string
    revised_prompt?: string
  }>
}
```

### Provider 接口

```typescript
interface IImageProvider {
  readonly type: string
  generate(options): Promise<ImageGenerationResult>
}

// 工厂模式创建
ImageProviderFactory.create(provider, model): IImageProvider
```

### 积分计费

```
# 按张计费
credits = imageCount × imagePrice × CREDITS_PER_DOLLAR × PROFIT_MULTIPLIER
# 示例：1 张 $0.04 的图 = 80 积分
```

## 代码索引

| 模块 | 路径 |
|------|------|
| 控制器 | `apps/server/src/ai-proxy/image/image.controller.ts` |
| 服务 | `apps/server/src/ai-proxy/image/image.service.ts` |
| Provider 接口 | `apps/server/src/ai-proxy/image/providers/image-provider.interface.ts` |
| Provider 工厂 | `apps/server/src/ai-proxy/image/providers/image-provider.factory.ts` |
| OpenAI 适配器 | `apps/server/src/ai-proxy/image/providers/openai-image.provider.ts` |
| Fal.ai 适配器 | `apps/server/src/ai-proxy/image/providers/fal-image.provider.ts` |
| OpenRouter 适配器 | `apps/server/src/ai-proxy/image/providers/openrouter-image.provider.ts` |
| DTO | `apps/server/src/ai-proxy/image/dto/` |
