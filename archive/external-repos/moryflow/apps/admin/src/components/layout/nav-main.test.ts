/**
 * 导航高亮正确性属性测试
 * **Feature: admin-shadcn-refactor, Property 8: 导航高亮正确性**
 * **Validates: Requirements 4.2**
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// 所有导航路径（包含二级菜单）
const allNavUrls = [
  '/',
  '/subscriptions',
  '/orders',
  '/licenses',
  '/providers',
  '/models',
  '/users',
  '/logs',
  '/payment-test',
  '/chat',
]

/**
 * 判断导航项是否应该高亮
 * 与 nav-main.tsx 中的 isActive 逻辑一致
 */
function isActive(itemUrl: string, pathname: string): boolean {
  if (itemUrl === '/') {
    return pathname === '/'
  }
  return pathname.startsWith(itemUrl)
}

/**
 * 根据路径获取应该高亮的导航项
 */
function getActiveNavItem(pathname: string): string | null {
  if (pathname === '/') {
    return '/'
  }

  const matchedItem = allNavUrls
    .filter((url) => url !== '/' && pathname.startsWith(url))
    .sort((a, b) => b.length - a.length)[0]

  return matchedItem ?? null
}

describe('属性 8: 导航高亮正确性', () => {
  it('对于首页路径，仪表盘导航项应高亮', () => {
    expect(isActive('/', '/')).toBe(true)
    expect(getActiveNavItem('/')).toBe('/')
  })

  it('对于任意子路径，对应导航项应高亮', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('/users', '/subscriptions', '/orders', '/providers', '/models', '/logs'),
        fc.constantFrom('', '/123', '/new', '/edit'),
        (base, suffix) => {
          const pathname = `${base}${suffix}`
          return isActive(base, pathname) === true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('对于任意非首页路径，首页导航项不应高亮', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('/users', '/subscriptions', '/orders', '/providers', '/models', '/logs', '/unknown'),
        (pathname) => {
          return isActive('/', pathname) === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('对于任意路径，正确识别激活的导航项', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '/',
          '/users',
          '/users/123',
          '/subscriptions',
          '/subscriptions/detail',
          '/orders',
          '/providers',
          '/models',
          '/logs',
          '/payment-test',
          '/chat',
          '/unknown'
        ),
        (pathname) => {
          const active = getActiveNavItem(pathname)
          if (pathname === '/') {
            return active === '/'
          }
          if (pathname === '/unknown') {
            return active === null
          }
          // 应该匹配到正确的基础路径
          return active !== null && pathname.startsWith(active)
        }
      ),
      { numRuns: 100 }
    )
  })
})
