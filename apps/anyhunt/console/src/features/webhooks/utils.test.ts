import { describe, expect, it } from 'vitest'
import type { ApiKey } from '@/features/api-keys'
import { resolveActiveApiKeySelection } from './utils'

function createApiKey(overrides: Partial<ApiKey>): ApiKey {
  return {
    id: overrides.id ?? 'key-id',
    name: overrides.name ?? 'Default key',
    key: overrides.key ?? 'ah_test_key',
    isActive: overrides.isActive ?? true,
    lastUsedAt: overrides.lastUsedAt ?? null,
    expiresAt: overrides.expiresAt ?? null,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  }
}

describe('resolveActiveApiKeySelection', () => {
  it('returns selected key when selected key is active', () => {
    const activeA = createApiKey({ id: 'a', isActive: true })
    const activeB = createApiKey({ id: 'b', isActive: true })

    const result = resolveActiveApiKeySelection([activeA, activeB], 'b')

    expect(result.activeKeys).toHaveLength(2)
    expect(result.selectedKey?.id).toBe('b')
    expect(result.effectiveKeyId).toBe('b')
  })

  it('falls back to first active key when selected key is inactive', () => {
    const inactive = createApiKey({ id: 'inactive', isActive: false })
    const active = createApiKey({ id: 'active', isActive: true })

    const result = resolveActiveApiKeySelection([inactive, active], 'inactive')

    expect(result.activeKeys.map((key) => key.id)).toEqual(['active'])
    expect(result.selectedKey?.id).toBe('active')
    expect(result.effectiveKeyId).toBe('active')
  })

  it('returns empty selection when there is no active key', () => {
    const inactive = createApiKey({ id: 'inactive', isActive: false })

    const result = resolveActiveApiKeySelection([inactive], 'inactive')

    expect(result.activeKeys).toHaveLength(0)
    expect(result.selectedKey).toBeNull()
    expect(result.effectiveKeyId).toBe('')
  })
})

