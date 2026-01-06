# App

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Mobile 端页面路由目录，基于 Expo Router 的文件系统路由。

## 职责

- 定义应用路由结构
- 页面组件入口
- 路由分组与布局

## 约束

- 遵循 Expo Router 文件路由规范
- 文件名即路由路径
- 使用括号 `()` 定义路由组（不影响 URL）
- 使用 `_layout.tsx` 定义布局

## 成员清单

| 文件/目录        | 类型   | 说明                                 |
| ---------------- | ------ | ------------------------------------ |
| `_layout.tsx`    | 布局   | 根布局，配置全局 Provider            |
| `index.tsx`      | 页面   | 首页/入口页                          |
| `+html.tsx`      | 配置   | Web HTML 模板                        |
| `+not-found.tsx` | 页面   | 404 页面                             |
| `(auth)/`        | 路由组 | 认证相关页面（登录、注册、忘记密码） |
| `(tabs)/`        | 路由组 | Tab 导航页面（主页、知识库、聊天）   |
| `(editor)/`      | 路由组 | 编辑器页面                           |
| `(settings)/`    | 路由组 | 设置页面                             |

## 路由结构

```
/                     → index.tsx（入口）
/(auth)/sign-in       → 登录
/(auth)/sign-up       → 注册
/(auth)/forgot-password → 忘记密码
/(tabs)/              → Tab 导航
/(tabs)/home          → 主页
/(tabs)/vault         → 知识库
/(tabs)/chat          → 聊天
/(editor)/[id]        → 编辑器（动态路由）
/(settings)/          → 设置
```

## Expo Router 规范

**文件命名**：

- `page.tsx` → 普通页面
- `_layout.tsx` → 布局组件
- `[param].tsx` → 动态路由
- `[...slug].tsx` → 通配路由
- `+not-found.tsx` → 404 页面

**路由组**：

- `(group)/` → 逻辑分组，不影响 URL
- 可用于共享布局或按功能组织

## 常见修改场景

| 场景         | 涉及文件           | 注意事项           |
| ------------ | ------------------ | ------------------ |
| 新增页面     | 对应目录下新建文件 | 文件名即路由       |
| 修改布局     | `_layout.tsx`      | 注意子路由继承     |
| 新增路由组   | `(group)/` 目录    | 添加 `_layout.tsx` |
| 修改认证流程 | `(auth)/`          | 注意登录状态判断   |

## 近期变更

- 动态路由跳转优先使用 `{ pathname: '/(editor)/[fileId]', params: { fileId } }` 形式

## 依赖关系

```
app/
├── 依赖 → components/（UI 组件）
├── 依赖 → lib/（业务逻辑）
└── 框架 → Expo Router
```
