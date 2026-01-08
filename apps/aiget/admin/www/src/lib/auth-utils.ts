/**
 * [PROVIDES]: toAuthUser
 * [DEPENDS]: @aiget/auth-client types
 * [POS]: Admin 端 Auth 用户映射工具
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import type { AuthUser, MeResponse } from '@aiget/auth-client';

export const toAuthUser = (me: MeResponse): AuthUser => ({
  id: me.id,
  email: me.email,
  name: me.name,
  emailVerified: me.emailVerified,
  tier: me.tier,
  isAdmin: me.isAdmin,
});
