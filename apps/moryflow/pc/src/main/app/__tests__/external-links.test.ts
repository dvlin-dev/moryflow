import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';

const openExternalMock = vi.hoisted(() => vi.fn());

vi.mock('electron', () => ({
  shell: {
    openExternal: openExternalMock,
  },
}));

import {
  createExternalLinkPolicy,
  isAllowedExternalUrl,
  isAllowedNavigationUrl,
  openExternalSafe,
} from '../external-links';

describe('external-links', () => {
  beforeEach(() => {
    openExternalMock.mockReset();
  });

  it('allows https for allowlisted hosts', () => {
    const policy = createExternalLinkPolicy({});
    expect(isAllowedExternalUrl('https://moryflow.com/pricing', policy)).toBe(true);
  });

  it('blocks https for non-allowlisted hosts', () => {
    const policy = createExternalLinkPolicy({});
    expect(isAllowedExternalUrl('https://example.com', policy)).toBe(false);
  });

  it('allows http localhost when explicitly enabled', () => {
    const policy = createExternalLinkPolicy({ allowLocalhostHttp: true });
    expect(isAllowedExternalUrl('http://localhost:3000', policy)).toBe(true);
  });

  it('blocks http non-localhost even when allowLocalhostHttp is enabled', () => {
    const policy = createExternalLinkPolicy({ allowLocalhostHttp: true });
    expect(isAllowedExternalUrl('http://example.com', policy)).toBe(false);
  });

  it('allows navigation to renderer origin', () => {
    const policy = createExternalLinkPolicy({ rendererOrigin: 'https://app.moryflow.test' });
    expect(isAllowedNavigationUrl('https://app.moryflow.test/settings', policy)).toBe(true);
  });

  it('allows file navigation within renderer root', () => {
    const rendererRoot = path.resolve(path.join(os.tmpdir(), 'moryflow', 'renderer'));
    const policy = createExternalLinkPolicy({ rendererRoot });
    const insideUrl = pathToFileURL(path.join(rendererRoot, 'index.html')).toString();
    expect(isAllowedNavigationUrl(insideUrl, policy)).toBe(true);
  });

  it('blocks file navigation outside renderer root even with prefix match', () => {
    const rendererRoot = path.resolve(path.join(os.tmpdir(), 'moryflow', 'renderer'));
    const policy = createExternalLinkPolicy({ rendererRoot });
    const outsideUrl = pathToFileURL(
      path.join(os.tmpdir(), 'moryflow', 'renderer-evil', 'index.html')
    ).toString();
    expect(isAllowedNavigationUrl(outsideUrl, policy)).toBe(false);
  });

  it('openExternalSafe returns false for blocked urls', async () => {
    const policy = createExternalLinkPolicy({});
    const result = await openExternalSafe('https://example.com', policy);
    expect(result).toBe(false);
    expect(openExternalMock).not.toHaveBeenCalled();
  });

  it('openExternalSafe opens allowlisted urls', async () => {
    openExternalMock.mockResolvedValue(undefined);
    const policy = createExternalLinkPolicy({});
    const result = await openExternalSafe('https://moryflow.com', policy);
    expect(result).toBe(true);
    expect(openExternalMock).toHaveBeenCalledWith('https://moryflow.com');
  });

  it('openExternalSafe returns false when openExternal throws', async () => {
    openExternalMock.mockRejectedValueOnce(new Error('fail'));
    const policy = createExternalLinkPolicy({});
    const result = await openExternalSafe('https://moryflow.com', policy);
    expect(result).toBe(false);
  });
});
