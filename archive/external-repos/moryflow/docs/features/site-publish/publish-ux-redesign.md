# 站点发布 UX 重设计

## 需求

对标 Notion Sites 重新设计发布体验：
- 渐进式披露，隐藏复杂性
- 轻量 Popover 优于大弹窗
- 先发布后配置

## 技术方案

### 设计变化

| 方面 | 旧设计 | 新设计 |
|------|--------|--------|
| 入口 | 右键菜单 | 编辑器顶部 Share |
| 交互 | 大型 Dialog | 轻量 Popover |
| 配置时机 | 发布前必填 | 发布后可选 |
| 管理 | 隐藏在菜单 | 侧边栏 Sites 入口 |

### 用户流程

**首次发布**：
```
Share 按钮 → Popover → 输入子域名 → Include subpages → Publish → 成功
```

**站点管理**：
```
侧边栏 Sites → 站点列表 → 点击卡片 → 站点详情 → 设置/Republish/Unpublish
```

### 组件架构

```
components/share/
├── share-popover.tsx        # Share 弹出层
├── publish-panel.tsx        # 发布面板
├── site-settings-panel.tsx  # 站点设置面板
└── subdomain-input.tsx      # 子域名输入

workspace/components/sites/
├── index.tsx                # Sites 主页面
├── site-list.tsx            # 站点列表
├── site-card.tsx            # 站点卡片
├── site-detail.tsx          # 站点详情页
└── site-empty-state.tsx     # 空状态
```

### 核心交互

**子域名输入**：
- 输入防抖 300ms 后检查可用性
- 不可用时显示替代建议

**站点卡片信息**：
- 站点名称（子域名）
- 完整 URL
- 页面数 + 最后更新时间
- 状态指示器（● Online / ○ Offline）

## 代码索引

| 模块 | 路径 |
|------|------|
| Share 组件 | `apps/pc/src/renderer/components/share/` |
| Sites CMS | `apps/pc/src/renderer/workspace/components/sites/` |
| 编辑器集成 | `apps/pc/src/renderer/workspace/components/editor-panel/` |
