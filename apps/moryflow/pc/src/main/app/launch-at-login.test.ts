/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import {
  AppRuntimeError,
  getLaunchAtLoginState,
  setLaunchAtLoginEnabled,
  wasOpenedAtLogin,
} from './launch-at-login';

const createMockAppApi = () => {
  return {
    getLoginItemSettings: vi.fn(() => ({
      openAtLogin: false,
      wasOpenedAtLogin: false,
    })),
    setLoginItemSettings: vi.fn(),
  };
};

describe('launch-at-login', () => {
  it('should return unsupported=false on non-mac platform', () => {
    const appApi = createMockAppApi();
    const state = getLaunchAtLoginState({
      platform: 'linux',
      appApi,
    });
    expect(state).toEqual({
      enabled: false,
      supported: false,
      source: 'system',
    });
    expect(appApi.getLoginItemSettings).not.toHaveBeenCalled();
  });

  it('should read system launch-at-login state on macOS', () => {
    const appApi = createMockAppApi();
    appApi.getLoginItemSettings.mockReturnValue({
      openAtLogin: true,
      wasOpenedAtLogin: false,
    });

    const state = getLaunchAtLoginState({
      platform: 'darwin',
      appApi,
    });

    expect(state).toEqual({
      enabled: true,
      supported: true,
      source: 'system',
    });
  });

  it('should throw UNSUPPORTED_PLATFORM when setting on non-mac', () => {
    const appApi = createMockAppApi();
    expect(() =>
      setLaunchAtLoginEnabled(true, {
        platform: 'linux',
        appApi,
      })
    ).toThrowError(AppRuntimeError);

    try {
      setLaunchAtLoginEnabled(true, {
        platform: 'linux',
        appApi,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppRuntimeError);
      expect((error as AppRuntimeError).code).toBe('UNSUPPORTED_PLATFORM');
    }
    expect(appApi.setLoginItemSettings).not.toHaveBeenCalled();
  });

  it('should set launch-at-login using openAsHidden=true on macOS', () => {
    const appApi = createMockAppApi();
    appApi.getLoginItemSettings.mockReturnValue({
      openAtLogin: true,
      wasOpenedAtLogin: false,
    });

    const state = setLaunchAtLoginEnabled(true, {
      platform: 'darwin',
      appApi,
    });

    expect(appApi.setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
      openAsHidden: true,
    });
    expect(state).toEqual({
      enabled: true,
      supported: true,
      source: 'system',
    });
  });

  it('should use wasOpenedAtLogin as startup predicate', () => {
    const appApi = createMockAppApi();
    appApi.getLoginItemSettings.mockReturnValue({
      openAtLogin: true,
      wasOpenedAtLogin: true,
    });

    expect(
      wasOpenedAtLogin({
        platform: 'darwin',
        appApi,
      })
    ).toBe(true);
  });
});
