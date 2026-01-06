# Agent 图片生成工具

## 需求

为 PC 和 Mobile Agent 添加 `generate_image` 工具：
- 默认模型：z-image-turbo
- 默认尺寸：1024x1024
- 最大数量：10 张/次

## 技术方案

### 调用链路

```
Agent Tool (generate_image)
  → PlatformCapabilities.auth (获取 token)
  → HTTP Request (Bearer Token)
  → Server: /v1/images/generations
  → FalImageProvider
  → 返回图片 URL
```

### 工具参数

```typescript
const generateImageParams = z.object({
  summary: toolSummarySchema,
  prompt: z.string().min(1).describe('图片描述'),
  n: z.number().int().min(1).max(10).default(1),
  size: z.enum(['1024x1024', '1536x1024', '1024x1536']).default('1024x1024'),
})
```

### PlatformCapabilities 扩展

```typescript
interface AuthCapabilities {
  getToken: () => Promise<string | null>
  getApiUrl: () => string
}
```

### 错误处理

| 状态码 | 处理 |
|--------|------|
| 401 | Session expired, 提示重新登录 |
| 402 | Insufficient credits, 提示充值 |

## 代码索引

| 模块 | 路径 |
|------|------|
| 工具定义 | `packages/agents-tools/src/image/generate-image-tool.ts` |
| PC 工具集成 | `packages/agents-tools/src/create-tools.ts` |
| Mobile 工具集成 | `packages/agents-tools/src/create-tools-mobile.ts` |
| PC Adapter | `apps/pc/src/main/agent-runtime/desktop-adapter.ts` |
| Mobile Adapter | `apps/mobile/lib/agent-runtime/mobile-adapter.ts` |
