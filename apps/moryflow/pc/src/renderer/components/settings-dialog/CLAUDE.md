# Settings Dialog（PC）

> ⚠️ 本目录结构变更时必须同步更新本文件

## 定位

设置弹窗模块，负责账号、AI Providers、MCP、System Prompt、云同步与沙盒等配置面板。

## 关键文件

- `index.tsx`：入口组件，负责分发 section 与加载数据
- `components/section-content.tsx`：按 section 渲染内容
- `components/providers/`：AI Providers 配置（预设 + 自定义）
- `components/mcp/`：MCP 配置与工具列表
- `components/system-prompt-section.tsx`：System Prompt 与模式切换
- `components/cloud-sync-section.tsx`：云同步状态与开关
- `components/account/`：登录/订阅/积分等账号相关

## 约束

- 表单统一使用 `react-hook-form` + `zod/v3`
- 用户可见文案必须为英文
- 图标统一使用 Lucide
- 不做历史兼容，废弃逻辑及时删除

## 近期变更

- Account 登录面板移除内层 `form`，改为显式按钮提交 + Enter 捕获，避免嵌套 `form` 触发外层 Settings 提交导致弹窗异常关闭
- Account 验证码面板（OTPForm）移除内层 `form`，并将 `onSuccess` 改为 `await`，避免验证后登录失败时产生未处理 Promise 导致弹窗异常
- Account 登录与验证码验证切换为 Token-first（成功即落库 access+refresh）；refresh 仅接受 body refreshToken，未登录 loading 不再显示全局 skeleton，仅保留按钮级 loading
- Providers 详情面板移除右侧 Provider Enable 开关
- 修复 Providers/Account 内部交互触发 submit 冒泡，导致 Settings Dialog 意外关闭/保存的问题
- 自定义服务商模型添加流程复用 AddModelDialog（支持 model library 搜索与模型参数面板）
- 保存设置失败时弹 toast，并尽量从主进程 Zod issues 中提取可读错误
- 自定义模型默认 limits 统一使用 `components/providers/constants.ts`（`DEFAULT_CUSTOM_MODEL_CONTEXT/DEFAULT_CUSTOM_MODEL_OUTPUT`）
- 自定义服务商模型仅使用 `customName`（必填），移除 legacy `name` 字段与 preprocess 迁移逻辑
