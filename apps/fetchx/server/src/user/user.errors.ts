/**
 * [DEFINES]: User 模块自定义错误类
 * [USED_BY]: user.service.ts, user.controller.ts
 * [POS]: 错误边界，提供清晰的错误类型和错误码
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/** User 错误码 */
export enum UserErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
}

/** User 错误基类 */
export abstract class UserError extends HttpException {
  constructor(
    public readonly code: UserErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super(
      {
        success: false,
        error: {
          code,
          message,
          details,
        },
      },
      status,
    );
  }
}

/** 用户不存在错误 */
export class UserNotFoundError extends UserError {
  constructor(id: string) {
    super(
      UserErrorCode.USER_NOT_FOUND,
      `User not found: ${id}`,
      HttpStatus.NOT_FOUND,
      { id },
    );
  }
}

/** 密码错误 */
export class InvalidPasswordError extends UserError {
  constructor() {
    super(
      UserErrorCode.INVALID_PASSWORD,
      'Current password is incorrect',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/** 邮箱已存在错误 */
export class EmailAlreadyExistsError extends UserError {
  constructor(email: string) {
    super(
      UserErrorCode.EMAIL_ALREADY_EXISTS,
      'Email already exists',
      HttpStatus.CONFLICT,
      { email },
    );
  }
}

/** 账户已禁用错误 */
export class AccountDisabledError extends UserError {
  constructor(id: string) {
    super(
      UserErrorCode.ACCOUNT_DISABLED,
      'Account has been disabled',
      HttpStatus.FORBIDDEN,
      { id },
    );
  }
}

/** 密码太弱错误 */
export class PasswordTooWeakError extends UserError {
  constructor(reason: string) {
    super(
      UserErrorCode.PASSWORD_TOO_WEAK,
      `Password is too weak: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { reason },
    );
  }
}
