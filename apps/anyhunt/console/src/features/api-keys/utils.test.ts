import { describe, it, expect } from 'vitest';
import { maskApiKey, getApiKeyDisplay, resolveActiveApiKeySelection } from './utils';
import type { ApiKey } from './types';

function createApiKey(overrides: Partial<ApiKey>): ApiKey {
  return {
    id: overrides.id ?? 'key-1',
    name: overrides.name ?? 'Default Key',
    keyPreview: overrides.keyPreview ?? 'ah_****abcd',
    plainKey: overrides.plainKey === undefined ? 'ah_1234567890abcd' : overrides.plainKey,
    isActive: overrides.isActive ?? true,
    lastUsedAt: overrides.lastUsedAt ?? null,
    expiresAt: overrides.expiresAt ?? null,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  };
}

describe('maskApiKey', () => {
  it('returns empty string for empty input', () => {
    expect(maskApiKey('')).toBe('');
  });

  it('returns original key when shorter than prefix + suffix', () => {
    expect(maskApiKey('ah_1234')).toBe('ah_1234');
  });

  it('masks key with default prefix/suffix lengths', () => {
    const key = 'ah_1234567890abcd';
    expect(maskApiKey(key)).toBe('ah_12345******abcd');
  });

  it('supports custom prefix/suffix lengths', () => {
    const key = 'ah_1234567890abcdef';
    expect(maskApiKey(key, { prefixLength: 3, suffixLength: 2 })).toBe('ah_******ef');
  });
});

describe('getApiKeyDisplay', () => {
  it('prefers masked plainKey when available', () => {
    const key = createApiKey({
      plainKey: 'ah_1234567890abcdef',
      keyPreview: 'ah_****cdef',
    });

    expect(getApiKeyDisplay(key)).toBe('ah_12345******cdef');
  });

  it('falls back to keyPreview when plainKey is missing', () => {
    const key = createApiKey({
      plainKey: null,
      keyPreview: 'ah_****abcd',
    });

    expect(getApiKeyDisplay(key)).toBe('ah_****abcd');
  });
});

describe('resolveActiveApiKeySelection', () => {
  it('falls back to first active key when no selected key id', () => {
    const keys = [
      createApiKey({ id: 'inactive-key', isActive: false }),
      createApiKey({
        id: 'active-key',
        isActive: true,
        plainKey: 'ah_active_key_12345678',
        keyPreview: 'ah_****5678',
      }),
    ];

    const selection = resolveActiveApiKeySelection(keys, '');

    expect(selection.effectiveKeyId).toBe('active-key');
    expect(selection.hasActiveKey).toBe(true);
    expect(selection.hasUsableKey).toBe(true);
    expect(selection.apiKeyValue).toBe('ah_active_key_12345678');
    expect(selection.apiKeyDisplay).toBe('ah_activ******5678');
  });

  it('ignores non-active selected key id and recovers to active key', () => {
    const keys = [
      createApiKey({ id: 'inactive-key', isActive: false }),
      createApiKey({
        id: 'active-key',
        isActive: true,
        plainKey: 'ah_active_key_12345678',
        keyPreview: 'ah_****5678',
      }),
    ];

    const selection = resolveActiveApiKeySelection(keys, 'inactive-key');

    expect(selection.effectiveKeyId).toBe('active-key');
    expect(selection.selectedKey?.id).toBe('active-key');
  });

  it('returns empty values when no active keys exist', () => {
    const keys = [createApiKey({ id: 'inactive-key', isActive: false })];

    const selection = resolveActiveApiKeySelection(keys, 'inactive-key');

    expect(selection.activeKeys).toHaveLength(0);
    expect(selection.selectedKey).toBeNull();
    expect(selection.effectiveKeyId).toBe('');
    expect(selection.apiKeyValue).toBe('');
    expect(selection.apiKeyDisplay).toBe('');
    expect(selection.hasActiveKey).toBe(false);
    expect(selection.hasUsableKey).toBe(false);
  });

  it('keeps active selection but marks it unusable when plainKey is missing', () => {
    const keys = [
      createApiKey({
        id: 'active-key',
        isActive: true,
        plainKey: null,
        keyPreview: 'ah_****5678',
      }),
    ];

    const selection = resolveActiveApiKeySelection(keys, 'active-key');

    expect(selection.effectiveKeyId).toBe('active-key');
    expect(selection.hasActiveKey).toBe(true);
    expect(selection.hasUsableKey).toBe(false);
    expect(selection.apiKeyValue).toBe('');
    expect(selection.apiKeyDisplay).toBe('ah_****5678');
  });
});
