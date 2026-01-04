# Settings Dialog - 设置弹窗

## 概览

这是一个用于配置 Agent 的设置弹窗组件，支持配置 AI 服务商、MCP 工具、主题等。

## 架构

```
settings-dialog/
├── index.tsx              # 主组件，包含弹窗布局和各个 section
├── const.ts               # 表单 schema 和默认值
├── handle.ts              # 数据转换函数
└── components/
    ├── shared.tsx         # 共享的小组件（LoadingHint, EmptyHint 等）
    └── entries.tsx        # MCP 条目组件（StdioEntry, HttpEntry）
```

## 主要功能

### 1. 通用设置（General）
- 主题模式选择（白天/黑夜/跟随系统）
- 使用视觉化的卡片选择器

### 2. AI 服务商（Providers）
- 支持 OpenAI、OpenRouter、Claude 三种服务商
- 每个服务商可配置：
  - API Key
  - Base URL
  - 默认模型
  - 模型列表（可动态添加/删除/启用/禁用）

### 3. MCP 工具
- Stdio Servers：本地命令行工具
- HTTP Servers：远程 HTTP 服务

### 4. 关于
- 版本信息
- 隐私说明
- 仓库链接

## 设计原则

### 1. 布局优化
- 使用 flexbox 实现响应式布局
- 左侧导航栏固定宽度，右侧内容区自适应
- 避免嵌套 ScrollArea，统一在最外层处理滚动

### 2. 样式优化
- 使用 shadcn/ui 组件库，保持一致的视觉风格
- 卡片式设计，清晰的视觉层次
- 适当的间距和阴影，提升视觉体验
- 响应式设计，支持不同屏幕尺寸

### 3. 用户体验
- 清晰的状态反馈（启用/禁用、加载中、错误提示）
- 合理的表单校验和错误提示
- 支持键盘导航和屏幕阅读器
- 保存状态提示，防止误操作

### 4. 代码组织
- 组件拆分合理，职责单一
- 使用 react-hook-form 管理表单状态
- 使用 zod 进行表单校验
- TypeScript 类型安全

## 技术栈

- React + TypeScript
- react-hook-form + zod
- shadcn/ui
- Tailwind CSS
- Electron IPC

## 最近优化（2025-11-16）

### 布局改进
- ✅ 移除嵌套的 ScrollArea，统一滚动行为
- ✅ 优化 providers section 的高度和溢出处理
- ✅ 改进对话框尺寸为 80vh x 85vw（最大 1200px）
- ✅ 使用 min-h-0 和 overflow-hidden 修复 flexbox 滚动问题

### 样式改进
- ✅ 统一使用 shadow-sm 和 border 创建卡片效果
- ✅ 优化间距，使用 space-y-6 和 space-y-4
- ✅ 改进按钮和徽章的视觉效果
- ✅ 添加 hover 状态和过渡动画
- ✅ 优化空状态显示（虚线边框 + 背景色）

### 组件拆分
- ✅ 提取 ModelEntry 组件，简化 ProviderDetails
- ✅ 优化 StdioEntry 和 HttpEntry 的样式
- ✅ 改进 EntryHeader 的视觉效果

### 可访问性改进
- ✅ 为所有输入框添加 htmlFor 和 id
- ✅ 添加 aria-label 属性
- ✅ 改进键盘导航支持

### 用户体验改进
- ✅ 添加表情符号增强视觉识别
- ✅ 改进加载状态显示
- ✅ 优化错误提示位置和样式
- ✅ 添加占位符文本提示

## 未来改进方向

- [ ] 添加搜索和过滤功能
- [ ] 支持导入/导出配置
- [ ] 添加预设配置模板
- [ ] 支持配置版本管理
- [ ] 添加配置验证和测试功能

