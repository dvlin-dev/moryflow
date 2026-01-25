---
title: 云同步 UI 精简计划与 Hugeicons RN 调研
date: 2026-01-25
scope: moryflow, pc, mobile, cloud-sync, ui
status: implemented
---

<!--
[INPUT]: 现有 Cloud Sync UI（PC + Mobile）实现与交互反馈
[OUTPUT]: Notion 风格精简 UI 计划 + Hugeicons RN 调研结论
[POS]: 云同步 UI 迭代计划（面向小白用户）
-->

# 云同步 UI 精简计划与 Hugeicons RN 调研

## 目标与原则

- 目标：对齐 Notion 式「轻量、清晰、无干扰」体验。
- 原则：
  - 逻辑保持现状，不新增复杂流程。
  - 信息层级简化，默认只显示“用户需要知道的那一点”。
  - 可见状态统一：**Syncing / Synced / Needs attention**。
  - 错误信息不暴露技术细节；详细错误仅记录日志。

## 本次计划（不改逻辑，仅 UI/文案/布局）

### PC 端

1. **HoverCard 精简为三段**
   - 仅保留：状态标题 + 简短描述 + “最后同步时间”。
   - 移除：进度条、最近活动列表、待同步列表。
   - 入口：保留一个明确操作按钮（`Sync now` 或 `Open settings`）。

2. **取消“点击图标触发同步”**
   - 点击状态图标仅用于展示信息或打开设置。
   - 手动同步统一放到 HoverCard 内按钮，避免误操作。

3. **错误提示改为用户友好文案**
   - 不展示 raw error。
   - 示例：`Sync paused. Check your network.`

4. **设置页信息下沉**
   - 主视图只保留：Sync 开关 + 当前状态。
   - “用量 / 设备 / 智能索引”下沉到 Advanced 区域或二级页。

5. **冲突弹窗文案简化**
   - 标题：`This workspace is linked to another account.`
   - 按钮：`Keep offline / Use this account`。

### Mobile 端

1. **去重同步入口**
   - 仅保留一个「Sync now」入口（推荐在 Workspace Sheet）。
   - 设置页只展示状态 + 开关，不提供同步按钮。

2. **状态卡片简化**
   - 默认仅展示：状态 + 最后同步时间。
   - Workspace 名称可弱化或隐藏。

3. **错误提示改为用户友好文案**
   - 同 PC 规则：短句 + 可执行操作提示。

4. **信息下沉（Advanced）**
   - “智能检索 / 用量 / 设备信息”放入折叠区或二级页。

5. **图标库一致性**
   - 当前 Cloud Sync 相关页面仍使用 `lucide-react-native`。
   - 如 Hugeicons RN 可用，优先统一到 Hugeicons。

## 状态映射建议（不改底层逻辑）

- `syncing` → **Syncing**
- `idle` + 无错误 → **Synced**
- `offline` / `error` / `disabled` → **Needs attention**

> 注：此映射仅影响展示，不影响同步流程。

---

## Hugeicons React Native 调研

### 结论

- Hugeicons **官方提供 React Native 包**：`@hugeicons/react-native`。
- Free 图标集通过 `@hugeicons/core-free-icons` 提供。
- Pro 图标集需使用 **私有 registry + Universal License Key**（私有 registry：`https://npm.hugeicons.com/`）。

### 基本用法（RN）

安装（Free）：

```bash
pnpm add @hugeicons/react-native @hugeicons/core-free-icons
```

使用示例：

```tsx
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CloudIcon } from '@hugeicons/core-free-icons';

<HugeiconsIcon icon={CloudIcon} size={20} color="#111" />;
```

### Pro 图标集（可选）

- 需要 Hugeicons 提供的 **Universal License Key** 与私有 registry 配置。
- 安装示例（需替换实际 token）：

```bash
pnpm add @hugeicons-pro/core-solid-standard
```

私有 registry 配置示例：

```ini
@hugeicons-pro:registry=https://npm.hugeicons.com/
//npm.hugeicons.com/:_authToken=UNIVERSAL_LICENSE_KEY
```

---

## 实施结果

- PC HoverCard 保留状态/描述/最后同步与单一操作入口，移除进度与列表。
- PC 状态指示器点击仅打开设置，不再触发同步；状态统一为 Syncing / Synced / Needs attention。
- PC 设置页仅保留同步开关与状态，进阶信息折叠到 Advanced。
- 绑定冲突弹窗文案简化为 Keep offline / Use this account。
- Mobile 设置页仅保留状态 + 开关，移除同步按钮；进阶信息折叠到 Advanced。
- Mobile Workspace Sheet 保留唯一 Sync now 入口。
- Mobile 全量替换为 Hugeicons，统一图标入口与类型。
