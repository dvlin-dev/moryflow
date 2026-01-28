# Sidebar（Workspace）

> ⚠️ 本目录结构变更时必须同步更新本文件

## 定位

工作区左侧栏，负责导航、文件入口、Vault 切换与状态工具区（含云同步/设置）。

## 关键文件

- `index.tsx`：侧边栏入口与整体布局
- `const.ts`：导航与工具区配置
- `components/sidebar-nav.tsx`：导航列表
- `components/sidebar-files.tsx`：文件快捷入口
- `components/sidebar-tools.tsx`：工具区（云同步/设置）
- `components/vault-selector/`：Vault 切换与创建

## 约束

- 图标统一使用 Lucide
- 用户可见文案必须为英文

## 近期变更

- 云同步 icon 仅在用户登录后显示，未登录时隐藏
- Vault 切换下拉箭头改为 ChevronDown（无中轴）
