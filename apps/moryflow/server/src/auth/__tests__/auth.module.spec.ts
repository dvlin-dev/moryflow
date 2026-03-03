import { describe, expect, it } from 'vitest';
import { AuthModule } from '../auth.module';
import { AuthController } from '../auth.controller';
import { AuthSocialController } from '../auth-social.controller';

type NestControllerClass = abstract new (...args: never[]) => unknown;

describe('AuthModule controllers order', () => {
  it('should register AuthSocialController before AuthController fallback', () => {
    const controllers = Reflect.getMetadata('controllers', AuthModule) as
      | NestControllerClass[]
      | undefined;

    expect(Array.isArray(controllers)).toBe(true);
    const socialIndex = controllers?.indexOf(AuthSocialController) ?? -1;
    const authIndex = controllers?.indexOf(AuthController) ?? -1;

    expect(socialIndex).toBeGreaterThanOrEqual(0);
    expect(authIndex).toBeGreaterThanOrEqual(0);
    expect(socialIndex).toBeLessThan(authIndex);
  });
});
