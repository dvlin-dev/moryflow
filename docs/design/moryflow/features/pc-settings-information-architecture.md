---
title: PC 设置体系信息架构
date: 2026-03-11
scope: apps/moryflow/pc
status: active
---

# PC 设置体系信息架构

本文记录 Moryflow PC 设置弹窗当前的信息架构、各分区职责和几个容易漂移的边界。

## 1. 当前分区

设置弹窗当前固定为 7 个 section，顺序如下：

1. `account`
2. `general`
3. `personalization`
4. `providers`
5. `mcp`
6. `cloud-sync`
7. `about`

这是当前设置导航的事实源，定义在 `settingsSections`。

## 2. 每个分区负责什么

### 2.1 Account

负责身份和计费相关能力：

- 登录、注册、找回密码
- 资料编辑
- 会员等级
- 积分余额
- 订阅升级
- 积分包购买
- 删号

详见 `pc-account-and-membership.md`。

### 2.2 General

负责通用桌面偏好项。

当前表单 schema 里明确存在的通用 UI 配置是主题：

- `ui.theme`: `light` / `dark` / `system`

其他通用项如果没有进入 `formSchema`，就不应提前写进文档。

### 2.3 Personalization

负责个性化提示词，不负责模型和工具配置。

当前事实只有一项：

- `personalization.customInstructions`

### 2.4 Providers

负责模型服务商配置。

当前结构分两类：

- 预设 provider：`providers`
- 自定义 provider：`customProviders`

每个 provider 的核心字段包括：

- `enabled`
- `apiKey`
- `baseUrl`
- `models`
- `defaultModelId`

界面结构是左右两栏：

- 左侧 `ProviderList`
- 右侧 `ProviderDetails`

### 2.5 MCP

负责 MCP Server 的配置与测试。

当前支持两类服务：

- `stdio`
- `streamableHttp`

MCP 区域的当前交互是：

- 左侧统一 server 列表
- 右侧当前 server 详情
- 支持新增空白条目
- 支持从 preset 新增
- 支持删除
- 支持在 `stdio` 和 `http` 之间切换类型
- 支持测试 server 状态

MCP 文档里不能再写“stdio 和 http 两套分开的设置页”，因为当前实现已经收成统一列表。

### 2.6 Cloud Sync

负责当前 vault 的云同步状态和操作，不负责登录本身。

这一页有明显的状态分流：

- `auth-loading`
- `unauthenticated`
- `missing-vault`
- `ready`

进入 `ready` 后，页面继续承载：

- 是否已绑定 vault
- 是否开启同步
- 当前同步状态
- 最近同步时间
- 冲突副本提示
- 恢复 / 离线 / 初始设置 callout
- 高级信息里的 usage、device info、storage space

### 2.7 About

`about` 仍然是一个独立 section，但本文不展开细项；当前任务聚焦的是设置结构，不补写稳定代码里没有直接暴露的新内容。

## 3. 与 Workspace 的关系

设置弹窗不是 Workspace 模块导航的一部分。

Workspace 主导航当前只有 3 个模块：

1. `Remote Agents`
2. `Skills`
3. `Sites`

设置是全局能力入口，不属于模块页，也不应该在 features 索引里和 `Remote Agents`、`Sites` 混成同一级“工作区模块”叙述。

## 4. 滚动与版式约束

当前 `sectionContentLayout` 里，分区分成两种内容版式。

使用 `ScrollArea`：

- `account`
- `general`
- `personalization`
- `cloud-sync`
- `about`

不使用 `ScrollArea`，改为双栏或自由布局：

- `providers`
- `mcp`

后续如果设置页结构调整，除了导航顺序，还要一起检查这一层版式约束。

## 5. 文档维护边界

- 新增 section、删除 section、调整顺序时，必须更新本文。
- 仅仅修改某个 section 里的表单项，不需要重写全文，但要检查对应小节是否失真。
- 与账号/会员相关的细节放在 `pc-account-and-membership.md`，不要在本文重复展开业务流程。

## 6. 代码入口

- `apps/moryflow/pc/src/renderer/components/settings-dialog/const.ts`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account-section.tsx`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers-section.tsx`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/mcp-section.tsx`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section.tsx`
- `apps/moryflow/pc/src/renderer/workspace/navigation/modules-registry.ts`
