# OpenAPI 模块

> 本模块负责 API 文档配置，使用 Scalar 作为文档 UI。

## 核心文件

| 文件 | 职责 |
|------|------|
| `openapi.constants.ts` | API 文档路径常量 |
| `openapi.service.ts` | 公开/内部 API 文档配置构建器 |
| `scalar.middleware.ts` | Scalar UI 中间件工厂 |
| `openapi.module.ts` | 全局模块定义 |
| `index.ts` | 模块导出 |

## API 文档路径

| 类型 | 路径 | 说明 |
|------|------|------|
| 公开 API JSON | `/openapi.json` | OpenAPI 规范 |
| 公开 API 文档 | `/api-reference` | Scalar UI |
| 内部 API JSON | `/openapi-internal.json` | 仅开发环境 |
| 内部 API 文档 | `/api-reference/internal` | 仅开发环境 |

## 依赖

- `@nestjs/swagger` - OpenAPI 文档生成
- `@scalar/nestjs-api-reference` - Scalar UI

## 使用方式

在 `main.ts` 中调用 `setupOpenAPI(app, isDev)` 初始化文档。

## 扩展指南

### 添加新模块到公开 API

1. 在 `main.ts` 的 `publicModules` 数组中添加模块
2. 确保 Controller 有 `@ApiTags` 装饰器

### 添加新模块到内部 API

1. 在 `main.ts` 的 `internalModules` 数组中添加模块
2. 确保 Controller 有 `@ApiTags` 装饰器
