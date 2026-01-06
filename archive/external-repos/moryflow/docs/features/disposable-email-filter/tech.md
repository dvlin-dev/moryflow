# 临时邮箱过滤

## 需求

在注册流程中拦截临时邮箱，防止滥用免费积分。
策略：黑名单拦截（mailchecker + 硬编码补充）

## 技术方案

### 验证流程

```
用户输入邮箱
  ↓
检查是否为临时邮箱
  ├── 是 → 返回错误提示
  └── 否 → 发送 OTP 验证码
```

### 核心实现

```typescript
import { isValid as mailCheckerIsValid } from 'mailchecker'

const EXTRA_BLOCKED_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  // ...
])

function isDisposableEmail(email: string): boolean {
  // mailchecker 返回 false 表示是临时邮箱
  if (!mailCheckerIsValid(email)) return true

  // 检查硬编码补充黑名单
  const domain = email.split('@')[1].toLowerCase()
  return EXTRA_BLOCKED_DOMAINS.has(domain)
}
```

### 集成位置

```typescript
// apps/server/src/auth/better-auth.ts
emailOTP({
  sendVerificationOTP: async ({ email, otp, type }) => {
    if (type === 'email-verification') {
      if (isDisposableEmail(email)) {
        throw new APIError('BAD_REQUEST', {
          message: '不支持使用临时邮箱注册，请使用常规邮箱',
        })
      }
      await sendOTP(email, otp)
    }
  },
})
```

### 黑名单来源

| 来源 | 说明 |
|------|------|
| `mailchecker` npm | 55,000+ 临时邮箱域名 |
| 硬编码补充 | 手动补充未收录域名 |

## 代码索引

| 模块 | 路径 |
|------|------|
| 邮箱验证工具 | `apps/server/src/auth/email-validator.ts` |
| 认证配置 | `apps/server/src/auth/better-auth.ts` |
