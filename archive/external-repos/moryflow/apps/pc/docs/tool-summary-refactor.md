# 工具调用描述字段改造方案

## 背景

当前工具调用在前端展示时，显示的是工具名称（如 `read`、`write`、`bash`），点开后是参数的 JSON 格式。这种展示方式太"工具化"，缺乏人味。

**目标**：让工具调用展示更加人性化，显示"我正在做什么"而不是冷冰冰的工具名。

## 设计思路

### 核心方案

在每个工具的参数 schema 中新增一个 `summary` 字段，让 AI 在调用工具时填写人类友好的描述。前端优先展示这个描述，没有则回退到工具名。

**为什么用 `summary` 而不是 `description`**：
- `description` 在 zod 的 `.describe()` 方法中已被使用，表示字段的技术说明（给 AI 看的）
- `summary` 更语义化，表示"操作摘要"（给人看的）

### 字段定义

```typescript
// 复用的 summary schema，所有工具共享
export const toolSummarySchema = z.string()
  .min(1)
  .max(80)
  .describe(
    'A brief one-sentence description of what you are doing. ' +
    'IMPORTANT: Use the same language as the user\'s conversation. ' +
    'Examples: "Reading project config file" (English), "读取项目配置文件" (Chinese), "プロジェクト設定ファイルを読み込む" (Japanese)'
  )
```

**语言适配规则**：summary 的语言应与用户对话语言保持一致，由 AI 根据上下文自动判断。

### 效果示例

**中文对话场景**：

| 工具 | 原展示 | 新展示 |
|------|--------|--------|
| read | `read` | 读取项目配置文件 |
| write | `write` | 创建 README.md 文档 |
| bash | `bash` | 运行 npm install 安装依赖 |
| grep | `grep` | 搜索包含"API"的文件 |
| edit | `edit` | 修复配置文件中的语法错误 |
| web_search | `web_search` | 搜索 React 18 新特性 |

**English conversation**：

| Tool | Before | After |
|------|--------|-------|
| read | `read` | Reading project config file |
| write | `write` | Creating README.md document |
| bash | `bash` | Running npm install |
| grep | `grep` | Searching for files containing "API" |
| edit | `edit` | Fixing syntax error in config |
| web_search | `web_search` | Searching React 18 new features |

## 改造范围

### 后端：工具定义（14 个文件）

需要修改的工具文件及其参数调整：

#### 1. `shared.ts` - 添加公共 schema

```typescript
// 新增：工具 summary schema
export const toolSummarySchema = z.string()
  .min(1)
  .max(80)
  .describe(
    'A brief one-sentence description of what you are doing. ' +
    'IMPORTANT: Use the same language as the user\'s conversation. ' +
    'Examples: "Reading project config file" (English), "读取项目配置文件" (Chinese)'
  )
```

#### 2. `read-tool.ts`

```typescript
const readParams = z.object({
  summary: toolSummarySchema,  // 新增
  path: z.string().min(1, 'path 不能为空'),
  offset: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(MAX_LINES).optional(),
})
```

#### 3. `write-tool.ts`

```typescript
const writeParams = z.object({
  summary: toolSummarySchema,  // 新增
  path: z.string().min(1),
  content: z.string().describe('要写入的完整内容'),
  base_sha: z.string().optional()...,
  create_directories: z.boolean().default(false)...,
})
```

#### 4. `edit-tool.ts`

```typescript
const editParams = z.object({
  summary: toolSummarySchema,  // 新增
  path: z.string().min(1),
  old_text: z.string().min(1).describe('要替换的原文本'),
  new_text: z.string().describe('替换后的新文本'),
  occurrence: z.number().int().min(1).default(1)...,
})
```

#### 5. `glob-tool.ts`

```typescript
const globParams = z.object({
  summary: toolSummarySchema,  // 新增
  pattern: z.string().min(1)...,
  // ... 其他字段
})
```

#### 6. `grep-tool.ts`

```typescript
const grepParams = z.object({
  summary: toolSummarySchema,  // 新增
  query: z.string().min(1).describe('搜索的文本'),
  // ... 其他字段
})
```

#### 7. `search-in-file-tool.ts`

```typescript
const searchParams = z.object({
  summary: toolSummarySchema,  // 新增
  // ... 原有字段
})
```

#### 8. `ls-tool.ts`

```typescript
const lsParams = z.object({
  summary: toolSummarySchema,  // 新增
  path: z.string().default('.')...,
})
```

#### 9. `move-tool.ts`

```typescript
const moveParams = z.object({
  summary: toolSummarySchema,  // 新增
  from: z.string().min(1).describe('源路径'),
  to: z.string().min(1).describe('目标路径'),
})
```

#### 10. `delete-tool.ts`

```typescript
const deleteParams = z.object({
  summary: toolSummarySchema,  // 新增
  path: z.string().min(1).describe('要删除的文件或文件夹路径'),
  confirm: z.boolean().describe('必须为 true 才执行删除'),
})
```

#### 11. `bash-tool.ts`

```typescript
const bashParams = z.object({
  summary: toolSummarySchema,  // 新增
  command: z.string().min(1).describe('要执行的完整命令'),
  cwd: z.string().optional()...,
  timeout: z.number()...,
})
```

#### 12. `web-search-tool.ts`

```typescript
const webSearchParams = z.object({
  summary: toolSummarySchema,  // 新增
  query: z.string().min(1).describe('搜索关键词'),
  // ... 其他字段
})
```

#### 13. `web-fetch-tool.ts`

```typescript
const webFetchParams = z.object({
  summary: toolSummarySchema,  // 新增
  url: z.string().url()...,
  prompt: z.string()...,
})
```

#### 14. `manage-plan.ts`

```typescript
const managePlanParams = z.object({
  summary: toolSummarySchema,  // 新增
  // ... 原有字段
})
```

#### 15. `task-tool.ts`

**注意**：task-tool 已经有 `description` 字段用于显示进度，需要改名为 `summary` 保持一致：

```typescript
const taskParams = z.object({
  type: z.enum(['explore', 'research', 'batch']).describe('子代理类型'),
  prompt: z.string().min(1).describe('详细的任务描述'),
  summary: toolSummarySchema,  // 原来叫 description，改名为 summary
})
```

### 前端：展示组件

#### 1. `tool.tsx` - 修改 ToolHeader 组件

**修改前**：

```tsx
export type ToolHeaderProps = {
  title?: string
  type: string
  state: ToolState
  className?: string
}

export const ToolHeader = ({ className, title, type, state, ...props }: ToolHeaderProps) => (
  <CollapsibleTrigger ...>
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate font-medium text-sm">
        {title ?? type.split('-').slice(1).join('-')}
      </span>
      {getStatusBadge(state)}
    </div>
    ...
  </CollapsibleTrigger>
)
```

**修改后**：

```tsx
export type ToolHeaderProps = {
  title?: string
  type: string
  state: ToolState
  input?: Record<string, unknown>  // 新增：工具输入参数
  className?: string
}

/**
 * 从工具输入中提取 summary，如果没有则返回格式化的工具名
 */
const getToolDisplayName = (type: string, input?: Record<string, unknown>, title?: string): string => {
  // 1. 优先使用传入的 title
  if (title) return title

  // 2. 尝试从 input 中提取 summary
  if (input && typeof input.summary === 'string' && input.summary.trim()) {
    return input.summary.trim()
  }

  // 3. 回退到格式化的工具名
  // type 格式通常是 "tool-read" -> "read"
  return type.split('-').slice(1).join('-') || type
}

export const ToolHeader = ({ className, title, type, state, input, ...props }: ToolHeaderProps) => (
  <CollapsibleTrigger ...>
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate font-medium text-sm">
        {getToolDisplayName(type, input, title)}
      </span>
      {getStatusBadge(state)}
    </div>
    ...
  </CollapsibleTrigger>
)
```

#### 2. `message/index.tsx` - 传递 input 给 ToolHeader

**修改前**：

```tsx
const renderTool = (part: ToolUIPart, index: number) => (
  <Tool key={`${message.id}-tool-${index}`} defaultOpen={false}>
    <ToolHeader type={part.type} state={part.state as ToolState} />
    <ToolContent>
      <ToolInput input={part.input} />
      <ToolOutput output={part.output} errorText={part.errorText} />
    </ToolContent>
  </Tool>
)
```

**修改后**：

```tsx
const renderTool = (part: ToolUIPart, index: number) => (
  <Tool key={`${message.id}-tool-${index}`} defaultOpen={false}>
    <ToolHeader
      type={part.type}
      state={part.state as ToolState}
      input={part.input as Record<string, unknown>}  // 新增：传递 input
    />
    <ToolContent>
      <ToolInput input={part.input} />
      <ToolOutput output={part.output} errorText={part.errorText} />
    </ToolContent>
  </Tool>
)
```

## 实施步骤

### 第一步：后端改造

1. 在 `shared.ts` 中添加 `toolSummarySchema`
2. 按顺序修改 14 个工具文件，添加 `summary` 字段
3. 运行类型检查确保无误：`pnpm typecheck`

### 第二步：前端改造

1. 修改 `tool.tsx` 中的 `ToolHeaderProps` 和 `ToolHeader` 组件
2. 修改 `message/index.tsx` 中的 `renderTool` 函数
3. 运行类型检查确保无误

### 第三步：测试验证

1. 启动开发服务器：`pnpm dev`
2. 测试各种工具调用，验证：
   - AI 能正确填写 summary 字段
   - 前端正确显示 summary
   - 没有 summary 时正确回退到工具名
   - 中文对话时 summary 为中文
   - 英文对话时 summary 为英文

## 风险评估

### 低风险

- **向后兼容**：新增字段有默认回退逻辑，老数据不会出错
- **改动范围可控**：只涉及参数定义和 UI 展示，不影响核心逻辑

### 潜在问题

1. **AI 可能不填写 summary**：回退到工具名，用户体验与现在一致
2. **summary 质量参差不齐**：依赖 AI 的理解能力，可通过优化 prompt 改善

## 后续优化方向

1. **summary 模板**：为常见操作提供 summary 模板，提高一致性
2. **历史记录优化**：在聊天历史中也使用 summary 替代工具名展示
3. **语言检测增强**：如果 AI 语言判断不准确，可考虑在 system prompt 中明确传递当前语言偏好
