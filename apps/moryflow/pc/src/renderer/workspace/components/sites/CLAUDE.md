# Sites CMS 组件

> 站点管理 CMS 界面，作为 Workspace Shell 的 `Sites` Mode 主视图渲染（入口来自左侧 Mode Switcher）。

## 组件结构

| 文件                     | 职责                                      |
| ------------------------ | ----------------------------------------- |
| `index.tsx`              | Sites 主页面，整合列表和详情视图          |
| `site-list.tsx`          | 站点列表组件，包含 Header 和卡片网格      |
| `site-card.tsx`          | 站点卡片组件，显示状态、URL、操作菜单     |
| `site-detail.tsx`        | 站点详情页，设置编辑、操作按钮            |
| `site-empty-state.tsx`   | 空状态组件（含 E2E 选择器）               |
| `file-picker-dialog.tsx` | 文件选择对话框，两级结构（工作区 → 文件） |
| `const.ts`               | 类型定义、辅助函数                        |

## 视图模式

- `list` - 站点列表（默认）
- `detail` - 站点详情

## 站点操作

| 操作        | 说明               |
| ----------- | ------------------ |
| `open`      | 在浏览器打开站点   |
| `copy`      | 复制站点链接       |
| `settings`  | 进入详情页编辑设置 |
| `publish`   | 上线站点           |
| `update`    | 更新内容           |
| `unpublish` | 下线站点           |
| `delete`    | 删除站点           |

## 数据流

```
SitesPage
  ├─ loadSites() → desktopAPI.sitePublish.list()
  │
  ├─ SiteList (list 视图)
  │   ├─ SiteCard × N
  │   └─ SiteEmptyState (无站点时)
  │
  ├─ SiteDetail (detail 视图)
  │   ├─ 设置编辑 (title, description, watermark)
  │   └─ 操作按钮 (Publish/Update, Unpublish, Delete)
  │
  └─ 发布流程
      ├─ FilePickerDialog (两级选择)
      │   ├─ 工作区列表 → desktopAPI.vault.getVaults()
      │   └─ 文件树 → desktopAPI.vault.getTreeCache()
      └─ PublishDialog → desktopAPI.sitePublish.publish()
```

## 依赖

- `desktopAPI.sitePublish` - Electron IPC 发布 API
- `desktopAPI.vault` - Electron IPC 工作区 API（获取工作区列表和文件树）
- `@/components/ui/*` - shadcn/ui 组件
- `@/components/share/const` - 共享类型和工具函数
- `@/components/site-publish` - PublishDialog 组件

## E2E 约定

- 空状态根节点提供 `data-testid="sites-empty-state"`，用于 Playwright 稳定定位

## 相关文档

- 设计文档：`docs/products/moryflow/features/site-publish/publish-ux-redesign.md`
- Share 组件：`components/share/CLAUDE.md`

## 近期变更

- Sites CMS 相关组件改为 Lucide 图标直连，移除 Icon 包装依赖
- FilePickerDialog 下拉指示图标改为无中轴样式（ChevronDown）
