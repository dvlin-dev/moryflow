/**
 * [PROVIDES]: Better Auth 配置, Facade Controller, Guards, Decorators
 * [DEPENDS]: /identity-db, better-auth, @nestjs/common
 * [POS]: auth-server 包的入口文件
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

// Better Auth 配置
export {
  createBetterAuth,
  type Auth,
  type SendOTPFunction,
  type CreateBetterAuthOptions,
} from './better-auth';

// 常量
export * from './constants';

// DTO
export * from './dto';

// Facade
export { AuthFacadeController, AuthFacadeService, IDENTITY_PRISMA } from './facade';

// Guards
export { SessionGuard, JwtGuard, AUTH_INSTANCE } from './guards';

// Decorators
export { CurrentUser, ClientType, type RequestUser, type ClientTypeValue } from './decorators';
