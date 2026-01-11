# Console 改造方案

> 版本: 1.0 | 创建日期: 2026-01-11

## 1. 背景与目标

### 1.1 当前问题

Console 前端（`apps/aiget/console`）存在以下问题：

1. **404 接口**：使用了多个后端不存在的 API 端点
2. **功能缺失**：Playground 只有 Screenshot 和 Embed，缺少核心 API 测试功能
3. **新功能未集成**：Memox（AI 记忆）功能未在 Console 中展示

### 1.2 改造目标

1. 修复所有 404 API 调用
2. 完善 Playground 功能，覆盖所有核心 API
3. 集成 Memox 功能模块
4. 优化用户体验和功能布局

---

## 2. API 问题分析

### 2.1 Console 当前使用的 API

| API 路径                       | 状态          | 说明                 |
| ------------------------------ | ------------- | -------------------- |
| `/api/v1/user/me`              | ✅ 存在       | 用户信息             |
| `/api/v1/payment/subscription` | ✅ 存在       | 订阅信息             |
| `/api/v1/payment/quota`        | ✅ 存在       | 配额信息             |
| `/api/v1/console/api-keys`     | ✅ 存在       | API Key 管理         |
| `/api/v1/console/webhooks`     | ✅ 存在       | Webhook 管理         |
| `/api/v1/console/oembed`       | ✅ 存在       | oEmbed 获取          |
| `/api/v1/quota`                | ✅ 存在       | 配额状态             |
| `/api/v1/console/screenshots`  | ❌ **不存在** | Screenshots 页面使用 |
| `/api/v1/console/stats`        | ❌ **不存在** | Dashboard 统计       |
| `/api/v1/console/screenshot`   | ❌ **不存在** | Playground 截图      |

### 2.2 后端存在但 Console 未使用的 API

#### 核心 Fetchx API（需要添加到 Playground）

| API 路径               | 方法       | 功能                                        |
| ---------------------- | ---------- | ------------------------------------------- |
| `/api/v1/scrape`       | POST/GET   | 单页抓取（支持截图、markdown、html、links） |
| `/api/v1/scrape/{id}`  | GET        | 获取抓取任务状态                            |
| `/api/v1/crawl`        | POST/GET   | 多页爬取                                    |
| `/api/v1/crawl/{id}`   | GET/DELETE | 爬取任务状态/取消                           |
| `/api/v1/map`          | POST       | URL 发现                                    |
| `/api/v1/extract`      | POST       | AI 数据提取                                 |
| `/api/v1/search`       | POST       | 网页搜索                                    |
| `/api/v1/batch/scrape` | POST/GET   | 批量抓取                                    |

#### Memox API（新功能模块）

| API 路径                  | 方法     | 功能             |
| ------------------------- | -------- | ---------------- |
| `/api/v1/memories`        | POST/GET | 创建/列表记忆    |
| `/api/v1/memories/search` | POST     | 语义搜索         |
| `/api/v1/entities`        | POST/GET | 创建/列表实体    |
| `/api/v1/relations`       | POST/GET | 创建/列表关系    |
| `/api/v1/graph`           | GET      | 知识图谱         |
| `/api/console/memories`   | GET      | Console 记忆列表 |
| `/api/console/entities`   | GET      | Console 实体列表 |

---

## 3. 改造方案

### 3.1 阶段一：修复 404 问题（高优先级）

#### 3.1.1 删除 Screenshots 页面

**原因**：后端没有 `/api/v1/console/screenshots` 端点，且抓取历史已通过 `/api/v1/scrape` 提供。

**操作**：

1. 删除 `pages/ScreenshotsPage.tsx`
2. 删除 `features/screenshots/` 目录
3. 从路由和侧边栏移除 Screenshots 入口
4. 从 `api-paths.ts` 移除 `CONSOLE_API.SCREENSHOTS`

#### 3.1.2 修复 Playground 截图功能

**原因**：`/api/v1/console/screenshot` 不存在，应改用 `/api/v1/scrape`。

**操作**：

1. 修改 `features/playground/api.ts`，调用 `/api/v1/scrape` 而非 `/api/v1/console/screenshot`
2. 重命名为 Scrape Playground（支持截图只是 Scrape 的一个功能）
3. 更新表单，支持 Scrape API 的所有参数

#### 3.1.3 更新 api-paths.ts

```typescript
// 删除不存在的路径
export const CONSOLE_API = {
  API_KEYS: '/api/v1/console/api-keys',
  WEBHOOKS: '/api/v1/console/webhooks',
  OEMBED: '/api/v1/console/oembed',
  // 删除: SCREENSHOTS, STATS, SCREENSHOT
} as const;

// 添加核心 API 路径
export const FETCHX_API = {
  SCRAPE: '/api/v1/scrape',
  CRAWL: '/api/v1/crawl',
  MAP: '/api/v1/map',
  EXTRACT: '/api/v1/extract',
  SEARCH: '/api/v1/search',
  BATCH_SCRAPE: '/api/v1/batch/scrape',
} as const;

// 添加 Memox API 路径
export const MEMOX_API = {
  MEMORIES: '/api/v1/memories',
  MEMORIES_SEARCH: '/api/v1/memories/search',
  ENTITIES: '/api/v1/entities',
  RELATIONS: '/api/v1/relations',
  GRAPH: '/api/v1/graph',
} as const;

export const MEMOX_CONSOLE_API = {
  MEMORIES: '/api/console/memories',
  ENTITIES: '/api/console/entities',
} as const;
```

---

### 3.2 阶段二：完善 Playground（中优先级）

#### 3.2.1 Playground 功能规划

将 Playground 从单一截图测试扩展为完整的 API 测试中心：

| 功能    | 路由                  | 说明               | 优先级     |
| ------- | --------------------- | ------------------ | ---------- |
| Scrape  | `/playground/scrape`  | 单页抓取（含截图） | P0         |
| Crawl   | `/playground/crawl`   | 多页爬取           | P1         |
| Map     | `/playground/map`     | URL 发现           | P1         |
| Extract | `/playground/extract` | AI 数据提取        | P1         |
| Search  | `/playground/search`  | 网页搜索           | P1         |
| Embed   | `/playground/embed`   | oEmbed 获取        | P2（已有） |
| Batch   | `/playground/batch`   | 批量抓取           | P2         |

#### 3.2.2 Scrape Playground 设计

**替代当前的 Screenshot Playground**，支持完整的 Scrape API：

```
┌─────────────────────────────────────────────────────────────┐
│ Scrape Playground                                           │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌───────────────────────────────┐ │
│ │ URL Input           │  │ Result Preview                │ │
│ │ [https://...]       │  │                               │ │
│ ├─────────────────────┤  │ [Tabs: Screenshot | Markdown  │ │
│ │ Output Formats      │  │        | HTML | Links | JSON] │ │
│ │ ☑ markdown          │  │                               │ │
│ │ ☑ screenshot        │  │ ┌───────────────────────────┐ │ │
│ │ ☐ html              │  │ │                           │ │ │
│ │ ☐ links             │  │ │    [Result Content]       │ │ │
│ │ ☐ rawHtml           │  │ │                           │ │ │
│ ├─────────────────────┤  │ └───────────────────────────┘ │ │
│ │ Screenshot Options  │  │                               │ │
│ │ ▼ (collapsible)     │  │ Metadata:                     │ │
│ │   Format: [PNG ▼]   │  │ • Status: completed           │ │
│ │   Full Page: [OFF]  │  │ • From Cache: false           │ │
│ │   Width: [1280]     │  │ • Processing: 2341ms          │ │
│ ├─────────────────────┤  │                               │ │
│ │ Advanced Options    │  │ Code Example:                 │ │
│ │ ▼ (collapsible)     │  │ ┌───────────────────────────┐ │ │
│ │   Wait: [load]      │  │ │ curl -X POST ...          │ │ │
│ │   Timeout: [30000]  │  │ └───────────────────────────┘ │ │
│ │   Headers: [...]    │  │                               │ │
│ ├─────────────────────┤  └───────────────────────────────┘ │
│ │ [Scrape Now]        │                                    │
│ └─────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.3 其他 Playground 设计要点

**Crawl Playground**：

- URL 输入 + 深度/限制配置
- 实时显示爬取进度（WebSocket 或轮询）
- 结果列表展示

**Map Playground**：

- URL 输入 + 过滤选项
- 发现的 URL 列表展示
- 支持导出

**Extract Playground**：

- URL + Schema 编辑器
- AI 提取结果展示
- Schema 示例模板

**Search Playground**：

- 搜索关键词输入
- 搜索结果列表
- 支持 scrapeOptions 配置

---

### 3.3 阶段三：Memox 集成（低优先级）

#### 3.3.1 新增 Memox 模块

在侧边栏添加 Memox 区块：

```
Memox
├── Memories     # 记忆列表与搜索
├── Entities     # 实体列表
├── Graph        # 知识图谱可视化
└── Playground   # Memox API 测试
```

#### 3.3.2 Memories 页面

- 记忆列表（分页）
- 语义搜索功能
- 记忆详情查看
- 导出功能

#### 3.3.3 Graph 页面

- 知识图谱可视化（D3.js / vis.js）
- 实体节点 + 关系边
- 交互式探索

---

## 4. 文件变更清单（已完成 ✅）

### 4.1 删除文件

```
apps/aiget/console/src/
├── pages/ScreenshotsPage.tsx              # ✅ 已删除
├── pages/ScreenshotPlaygroundPage.tsx     # ✅ 已删除
├── features/screenshots/                   # ✅ 整个目录已删除
└── features/playground/                    # ✅ 整个目录已删除（旧版）
```

### 4.2 修改文件

```
apps/aiget/console/src/
├── lib/api-paths.ts                       # ✅ 更新 API 路径
├── App.tsx                                # ✅ 更新路由
└── components/layout/app-sidebar.tsx      # ✅ 更新侧边栏导航
```

### 4.3 新增文件

```
apps/aiget/console/src/
├── features/
│   ├── playground-shared/                 # ✅ 共享模块
│   │   ├── api-key-client.ts              # API Key 认证客户端
│   │   ├── types.ts                       # 共享类型定义
│   │   ├── index.ts
│   │   └── components/
│   │       ├── api-key-selector.tsx       # API Key 选择器
│   │       ├── code-example.tsx           # 代码示例生成器
│   │       └── collapsible-section.tsx    # 可折叠区块
│   ├── scrape-playground/                 # ✅ Scrape Playground
│   │   ├── api.ts
│   │   ├── hooks.ts
│   │   ├── index.ts
│   │   └── components/
│   │       ├── scrape-form.tsx
│   │       └── scrape-result.tsx
│   ├── crawl-playground/                  # ✅ Crawl Playground
│   │   ├── api.ts
│   │   ├── hooks.ts
│   │   ├── index.ts
│   │   └── components/
│   │       ├── crawl-form.tsx
│   │       └── crawl-result.tsx
│   ├── map-playground/                    # ✅ Map Playground（简化版）
│   │   └── index.ts
│   ├── extract-playground/                # ✅ Extract Playground（简化版）
│   │   └── index.ts
│   └── search-playground/                 # ✅ Search Playground（简化版）
│       └── index.ts
├── pages/
│   ├── ScrapePlaygroundPage.tsx           # ✅ 新建
│   ├── CrawlPlaygroundPage.tsx            # ✅ 新建
│   ├── MapPlaygroundPage.tsx              # ✅ 新建
│   ├── ExtractPlaygroundPage.tsx          # ✅ 新建
│   └── SearchPlaygroundPage.tsx           # ✅ 新建

# 阶段三待新增
├── features/memox/                        # 待开发
└── pages/
    ├── MemoriesPage.tsx                   # 待开发
    ├── EntitiesPage.tsx                   # 待开发
    └── GraphPage.tsx                      # 待开发
```

---

## 5. 侧边栏导航重构

### 5.1 当前导航

```
Dashboard
Playground
  └── Screenshot
  └── Embed
API Keys
Screenshots (404)
Webhooks
Settings
```

### 5.2 改造后导航

```
Dashboard

Fetchx
  ├── Playground
  │   ├── Scrape      # 单页抓取（含截图）
  │   ├── Crawl       # 多页爬取
  │   ├── Map         # URL 发现
  │   ├── Extract     # AI 提取
  │   ├── Search      # 网页搜索
  │   └── Embed       # oEmbed
  └── Webhooks

Memox (新增)
  ├── Memories        # 记忆管理
  ├── Entities        # 实体管理
  └── Graph           # 知识图谱

Settings
  ├── API Keys
  └── Profile
```

---

## 6. 实施计划

### 阶段一：修复 404（已完成 ✅）

- [x] 删除 Screenshots 页面及相关代码
  - 删除 `pages/ScreenshotsPage.tsx`
  - 删除 `features/screenshots/` 目录
  - 删除 `pages/ScreenshotPlaygroundPage.tsx`
  - 删除 `features/playground/` 目录（旧版）
- [x] 更新 api-paths.ts
  - 移除 `CONSOLE_API.SCREENSHOTS`, `CONSOLE_API.STATS`, `CONSOLE_API.SCREENSHOT`
  - 添加 `FETCHX_API` 常量（scrape, crawl, map, extract, search, batch_scrape）
  - 添加 `MEMOX_API` 常量（memories, entities, relations, graph）
- [x] 更新路由和导航

### 阶段二：完善 Playground（已完成 ✅）

- [x] 创建 playground-shared 模块
  - `ApiKeyClient` - API Key 认证 HTTP 客户端
  - `ApiKeySelector` - API Key 选择器组件
  - `CodeExample` - 代码示例生成器（cURL/JavaScript/Python）
  - `CollapsibleSection` - 可折叠选项区块
  - 共享类型定义（ScrapeRequest, CrawlRequest, etc.）
- [x] 新增 Scrape Playground
  - 完整 Scrape API 参数支持（formats, screenshot, actions, etc.）
  - 多 Tab 结果展示（Screenshot/Markdown/HTML/Links/PDF）
  - 异步任务轮询（polling）
- [x] 新增 Crawl Playground
  - 爬取深度/限制/路径配置
  - 进度条展示
  - 分页结果列表
- [x] 新增 Map Playground
  - URL 发现与过滤
  - 子域名支持
- [x] 新增 Extract Playground
  - JSON Schema 编辑器
  - AI 提取结果展示
- [x] 新增 Search Playground
  - 网页搜索
  - 结果与 scraped content 展示
- [x] 更新导航结构
  - Playground 下级：Scrape / Crawl / Map / Extract / Search / Embed
  - 移除 Screenshots 入口

### 阶段三：Memox 集成（待开发）

- [ ] 新增 Memories 页面
- [ ] 新增 Entities 页面
- [ ] 新增 Graph 可视化页面
- [ ] 新增 Memox Playground

---

## 7. 技术注意事项

### 7.1 API 认证

- **Console API**：使用 Session（Better Auth Cookie）
- **Public API**：需要 API Key（`Authorization: Bearer ag_xxx`）
- **Playground 调用**：通过 Console 代理或使用用户的 API Key

### 7.2 异步任务处理

Crawl、Batch Scrape 等是异步任务，需要：

1. 提交任务获取 Job ID
2. 轮询 `/api/v1/{type}/{id}` 获取状态
3. 显示进度和最终结果

### 7.3 代码示例生成

每个 Playground 应生成可复制的代码示例：

```typescript
// 根据用户选择的参数动态生成
const codeExample = generateCodeExample({
  endpoint: '/api/v1/scrape',
  method: 'POST',
  apiKey: selectedApiKey,
  body: formData,
});
```

---

## 8. 附录

### 8.1 完整 API 端点参考

详见：https://server.aiget.dev/api-docs

### 8.2 相关文档

- [Console CLAUDE.md](../../apps/aiget/console/CLAUDE.md)
- [Server CLAUDE.md](../../apps/aiget/server/CLAUDE.md)
- [Scraper CLAUDE.md](../../apps/aiget/server/src/scraper/CLAUDE.md)
