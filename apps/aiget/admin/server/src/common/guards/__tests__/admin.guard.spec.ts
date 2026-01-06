/**
 * AdminGuard 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AdminGuard } from '../admin.guard';
import { createMockExecutionContext } from '../../../../test/helpers/mock.factory';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  it('should allow access for admin user', () => {
    const context = createMockExecutionContext({
      user: { id: 'admin-id', email: 'admin@example.com', isAdmin: true },
    });

    const result = guard.canActivate(context as any);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException for non-admin user', () => {
    const context = createMockExecutionContext({
      user: { id: 'user-id', email: 'user@example.com', isAdmin: false },
    });

    expect(() => guard.canActivate(context as any)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context as any)).toThrow('Admin access required');
  });

  it('should throw UnauthorizedException when no user is present', () => {
    const context = createMockExecutionContext({});

    expect(() => guard.canActivate(context as any)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context as any)).toThrow('Authentication required');
  });

  it('should throw UnauthorizedException when user is undefined', () => {
    const context = createMockExecutionContext({ user: undefined });

    expect(() => guard.canActivate(context as any)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context as any)).toThrow('Authentication required');
  });
});
