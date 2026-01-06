# @aiget/types

> Aiget 跨业务线共享类型定义（不代表账号/数据互通）

## 目录结构

```
src/
├── common/              # 通用基础类型
│   ├── api.ts           # API 响应格式
│   ├── product.ts       # 产品标识
│   ├── subscription.ts  # 订阅等级
│   ├── user.ts          # 用户和 API Key
│   └── wallet.ts        # 钱包和积分
└── products/            # 产品特定类型
    └── fetchx/
        └── screenshot.ts # 截图 API 类型
```

> 类型可在 Moryflow 与 Aiget Dev 复用，但业务数据严格隔离。

## 导入方式

```typescript
// 全部导入
import { User, Subscription, CreditStatus } from '@aiget/types';

// 按模块导入
import { User, ApiKey } from '@aiget/types/common/user';
import { SubscriptionTier } from '@aiget/types/common/subscription';

// 产品类型
import { fetchx } from '@aiget/types';
const req: fetchx.ScreenshotRequest = { url: '...' };
```

## 类型规范

1. **常量对象 + 类型推断**：使用 `as const` + `typeof` 模式
2. **接口命名**：驼峰命名，描述性名称
3. **文件头注释**：`[DEFINES]`, `[USED_BY]`, `[POS]`

## 订阅等级

| 等级    | 月付 | 年付 | 每月积分 |
| ------- | ---- | ---- | -------- |
| FREE    | $0   | -    | 100      |
| STARTER | $9   | $99  | 1,000    |
| PRO     | $29  | $299 | 5,000    |
| MAX     | $99  | -    | 20,000   |

## API Key 前缀

| 类型       | 前缀  |
| ---------- | ----- |
| 平台 Key   | `ag_` |
| Flowx Key  | `lx_` |
| Fetchx Key | `fx_` |
| Memox Key  | `mx_` |
| Sandx Key  | `sx_` |

---

_版本: 1.0 | 创建日期: 2026-01-05_
