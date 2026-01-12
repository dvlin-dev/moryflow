# Sites CMS 组件

> 站点管理 CMS 界面，从侧边栏入口访问

## 组件结构

| 文件                     | 职责                                      |
| ------------------------ | ----------------------------------------- |
| `index.tsx`              | Sites 主页面，整合列表和详情视图          |
| `site-list.tsx`          | 站点列表组件，包含 Header 和卡片网格      |
| `site-card.tsx`          | 站点卡片组件，显示状态、URL、操作菜单     |
| `site-detail.tsx`        | 站点详情页，设置编辑、操作按钮            |
| `site-empty-state.tsx`   | 空状态组件                                |
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
| `republish` | 重新发布（TODO）   |
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
  │   └─ 操作按钮 (Republish, Unpublish, Delete)
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

## 相关文档

- 设计文档：`docs/products/moryflow/features/site-publish/publish-ux-redesign.md`
- Share 组件：`components/share/CLAUDE.md`
