import { describe, expect, it } from 'vitest'
import { buildDeletionRecordsPath, buildUsersListPath } from './query-paths'

describe('users api path builders', () => {
  it('buildUsersListPath 应包含基础分页参数', () => {
    const path = buildUsersListPath({ limit: 20, offset: 40 })
    expect(path).toBe('/users?limit=20&offset=40')
  })

  it('buildUsersListPath 应在 tier=all 时忽略 tier 参数', () => {
    const path = buildUsersListPath({ limit: 20, offset: 0, tier: 'all' })
    expect(path).toBe('/users?limit=20&offset=0')
  })

  it('buildUsersListPath 应序列化筛选参数', () => {
    const path = buildUsersListPath({
      limit: 10,
      offset: 30,
      tier: 'pro',
      deleted: true,
    })

    expect(path).toBe('/users?limit=10&offset=30&tier=pro&deleted=true')
  })

  it('buildDeletionRecordsPath 应编码 reason 参数', () => {
    const path = buildDeletionRecordsPath({
      limit: 10,
      offset: 0,
      reason: 'privacy concern',
    })

    expect(path).toBe('/deletions?limit=10&offset=0&reason=privacy+concern')
  })
})
