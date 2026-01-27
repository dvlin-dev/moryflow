# Share 组件

> Notion 风格的轻量级发布 Popover 组件

## 组件结构

| 文件                      | 职责                                   |
| ------------------------- | -------------------------------------- |
| `share-popover.tsx`       | Share Popover 主组件，包含面板切换逻辑 |
| `publish-panel.tsx`       | 发布面板，子域名输入和发布按钮         |
| `site-settings-panel.tsx` | 站点设置面板，标题、描述、水印配置     |
| `subdomain-input.tsx`     | 子域名输入组件，带实时可用性检查       |
| `use-share-popover.ts`    | 状态管理 Hook，发布/下线/设置等操作    |
| `const.ts`                | 类型定义和常量                         |
| `index.ts`                | 统一导出                               |

## 设计原则

- **渐进式披露**：先发布后配置
- **轻量交互**：Popover 而非 Dialog
- **极简界面**：干净留白

## 数据流

```
SharePopover
  ├─ useSharePopover (状态管理)
  │   ├─ subdomain 状态 + 实时检查
  │   ├─ publish() → desktopAPI.sitePublish.buildAndPublish
  │   ├─ unpublish() → desktopAPI.sitePublish.offline
  │   └─ updateSettings() → desktopAPI.sitePublish.update
  │
  ├─ PublishPanel (未发布时)
  │   └─ SubdomainInput
  │
  └─ SiteSettingsPanel (已发布时)
```

## 依赖

- `desktopAPI.sitePublish` - Electron IPC 发布 API
- `@/components/ui/*` - shadcn/ui 组件

## 相关文档

- 设计文档：`docs/products/moryflow/features/site-publish/publish-ux-redesign.md`
- Sites CMS：`workspace/components/sites/CLAUDE.md`

## 近期变更

- Share 相关组件改为 Lucide 图标直连，移除 Icon 包装依赖
