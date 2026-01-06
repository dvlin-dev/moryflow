# 账户删除

## 需求

用户自主删除账户（GDPR 合规）：
- 软删除（保留 30 天）
- 记录删除原因
- 多端支持（Mobile、PC）
- 二次确认防误操作

## 技术方案

### 数据模型

```prisma
model User {
  // ... 现有字段
  deletedAt DateTime?  // 软删除时间戳
}

model AccountDeletionRecord {
  id        String   @id
  userId    String   @unique
  email     String
  reason    String   // not_useful | found_alternative | too_expensive | ...
  feedback  String?
  deletedAt DateTime @default(now())
}
```

### 删除原因

| code | 显示文本 |
|------|----------|
| `not_useful` | 不再需要这个产品 |
| `found_alternative` | 找到了更好的替代品 |
| `too_expensive` | 价格太贵 |
| `too_complex` | 使用太复杂 |
| `bugs_issues` | 问题和故障太多 |
| `other` | 其他原因 |

### API

```
DELETE /api/user/account

Request:
{
  reason: string       // 删除原因代码（必填）
  feedback?: string    // 详细反馈（可选，≤500 字符）
  confirmation: string // 确认文字，必须为用户邮箱
}

Response: 204 No Content
```

### 删除流程（伪代码）

```
deleteAccount(userId, dto):
  user = getUser(userId)

  # 验证
  if dto.confirmation != user.email:
    throw INVALID_CONFIRMATION

  # 事务处理
  transaction:
    # 记录删除原因
    create AccountDeletionRecord { userId, email, reason, feedback }

    # 软删除用户
    update User { deletedAt: now() }

    # 清除所有 Session
    deleteMany Session { userId }

  # 记录活动日志
  activityLog.log('account_deleted', { reason })
```

### 已删除用户行为

| 场景 | 处理 |
|------|------|
| 登录尝试 | 返回"账户已删除"错误 |
| API 请求 | Token 验证时拒绝 |
| 邮箱复用 | 禁止重新注册 |

## 代码索引

| 模块 | 路径 |
|------|------|
| DTO | `apps/server/src/user/dto/delete-account.dto.ts` |
| 服务实现 | `apps/server/src/user/user.service.ts` |
| 控制器 | `apps/server/src/user/user.controller.ts` |
| Mobile 页面 | `apps/mobile/app/(settings)/delete-account.tsx` |
| PC 弹窗 | `apps/pc/src/renderer/components/settings-dialog/components/account/delete-account-dialog.tsx` |
