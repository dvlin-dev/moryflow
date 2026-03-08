# Settings Dialog（PC）

> ⚠️ 本目录结构变更时必须同步更新本文件

## 定位

设置弹窗模块，负责账号、AI Providers、MCP、个性化（Personalization）、云同步与沙盒等配置面板。

## 关键文件

- `index.tsx`：入口组件，负责分发 section 与加载数据
- `components/section-content.tsx`：按 section 渲染内容
- `components/providers/`：AI Providers 配置（预设 + 自定义）
- `components/mcp/`：MCP 配置与工具列表
- `components/personalization-section.tsx`：个性化自定义指令输入
- `components/cloud-sync-section.tsx`：云同步状态与开关
- `components/account/`：登录/订阅/积分等账号相关

## 约束

- 表单统一使用 `react-hook-form` + `zod/v3`
- 用户可见文案必须为英文
- 图标统一使用 Lucide
- 不做历史兼容，废弃逻辑及时删除
